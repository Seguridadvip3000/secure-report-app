import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import { jsPDF } from 'jspdf';
import {
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  FileText,
  Clock,
} from 'lucide-react';

const FRANJAS_DIURNAS = ['08:00 AM', '12:00 PM', '04:00 PM'];
const FRANJAS_NOCTURNAS = ['08:00 PM', '10:00 PM', '12:00 AM', '02:00 AM', '04:00 AM', '06:00 AM'];
const TODAS_LAS_FRANJAS = [...FRANJAS_DIURNAS, ...FRANJAS_NOCTURNAS];

const obtenerFechaHoraCaracas = () => {
  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
  const hora12 = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(ahora);
  return { fechaStr, hora12 };
};

const cargarLogoBase64 = async (): Promise<string | null> => {
  try {
    const resp = await fetch('/logo-vip3000.jpg');
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export default function CecomLlamadasControlPage() {
  const { currentUser } = useAuth();
  const operadorNombre = currentUser?.nombre_completo || currentUser?.username || 'Operador CECOM';

  const { fechaStr: hoyLocal } = obtenerFechaHoraCaracas();
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyLocal);
  const [turnoFiltro, setTurnoFiltro] = useState<'TODAS' | 'DIURNO' | 'NOCTURNO'>('TODAS');
  const [busqueda, setBusqueda] = useState<string>('');

  const [proyectos, setProyectos] = useState<string[]>([]);
  const [registrosMap, setRegistrosMap] = useState<Record<string, any>>({});
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardandoCelda, setGuardandoCelda] = useState<string | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const setP = new Set<string>(Array.isArray(PROYECTOS) ? PROYECTOS : []);
      const { data: projsDb } = await supabase.from('projects').select('*');
      if (Array.isArray(projsDb)) {
        projsDb.forEach((p: any) => {
          const val = p?.nombre || p?.name || p?.proyecto;
          if (val) setP.add(String(val).trim());
        });
      }
      setProyectos(Array.from(setP).sort());

      const { data: llamadasData } = await supabase
        .from('cecom_llamadas_control')
        .select('*')
        .eq('fecha', fechaSeleccionada);

      const mapa: Record<string, any> = {};
      (Array.isArray(llamadasData) ? llamadasData : []).forEach((item) => {
        mapa[`${item.proyecto}__${item.franja_horaria}`] = item;
      });
      setRegistrosMap(mapa);
    } catch (err) {
      console.error('Error cargando checklist CECOM:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [fechaSeleccionada]);
  const registrarLlamada = async (
    proyecto: string,
    franja: string,
    estatus: 'SIN_NOVEDAD' | 'CON_NOVEDAD' | 'NO_CONTESTO'
  ) => {
    let observacionTexto = '';
    if (estatus === 'CON_NOVEDAD') {
      const resp = window.prompt(
        `Ingrese el detalle de la novedad reportada en ${proyecto} (${franja}):`
      );
      if (resp === null) return;
      observacionTexto = resp.trim() || 'Novedad reportada vía radio/teléfono';
    } else if (estatus === 'NO_CONTESTO') {
      observacionTexto = 'Sin respuesta al llamado de control CECOM';
    } else {
      observacionTexto = 'Puesto reporta sin novedad';
    }

    const clave = `${proyecto}__${franja}`;
    setGuardandoCelda(clave);
    try {
      const { hora12 } = obtenerFechaHoraCaracas();
      const { error } = await supabase.from('cecom_llamadas_control').upsert(
        [
          {
            fecha: fechaSeleccionada,
            proyecto,
            franja_horaria: franja,
            estatus,
            hora_llamada: hora12,
            observacion: observacionTexto,
            operador_cecom: operadorNombre,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'fecha,proyecto,franja_horaria' }
      );

      if (error) throw error;

      if (estatus === 'CON_NOVEDAD' || estatus === 'NO_CONTESTO') {
        await supabase.from('notificaciones').insert([
          {
            titulo:
              estatus === 'NO_CONTESTO'
                ? `🚨 CECOM: Puesto No Contestó (${proyecto})`
                : `⚠️ CECOM: Novedad en Control (${proyecto})`,
            mensaje: `Franja ${franja} (${hora12}): ${observacionTexto}. Reportado por ${operadorNombre}.`,
            tipo: 'CECOM_CONTROL',
            proyecto,
            roles_destino: ['operaciones', 'cecom', 'directiva', 'administrador'],
            leida: false,
          },
        ]);
      }

      await cargarDatos();
    } catch (err) {
      console.error('Error registrando llamada CECOM:', err);
    } finally {
      setGuardandoCelda(null);
    }
  };

  const franjasVisibles =
    turnoFiltro === 'DIURNO'
      ? FRANJAS_DIURNAS
      : turnoFiltro === 'NOCTURNO'
      ? FRANJAS_NOCTURNAS
      : TODAS_LAS_FRANJAS;

  const proyectosFiltrados = proyectos.filter((p) =>
    !busqueda.trim() ? true : p.toLowerCase().includes(busqueda.toLowerCase().trim())
  );

  const exportarActaPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const logo = await cargarLogoBase64();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 280, 24, 'F');
    if (logo) {
      try {
        doc.addImage(logo, 'JPEG', 10, 3, 18, 18);
      } catch {}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SEGURIDAD VIP 3000 C.A. — ACTA DIARIA DE LLAMADAS DE CONTROL (CECOM)', 33, 11);
    doc.setFontSize(9);
    doc.setTextColor(147, 197, 253);
    doc.text(`Fecha: ${fechaSeleccionada}  |  Operador: ${operadorNombre}`, 33, 18);

    let y = 32;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);

    proyectosFiltrados.forEach((proy) => {
      if (y > 195) {
        doc.addPage();
        y = 18;
      }
      const estadosStr = franjasVisibles
        .map((fr) => {
          const reg = registrosMap[`${proy}__${fr}`];
          const marca = !reg
            ? 'PEND'
            : reg.estatus === 'SIN_NOVEDAD'
            ? `OK(${reg.hora_llamada})`
            : reg.estatus === 'CON_NOVEDAD'
            ? `NOV(${reg.hora_llamada})`
            : `S/R(${reg.hora_llamada})`;
          return `${fr}: ${marca}`;
        })
        .join(' | ');

      doc.setFont('helvetica', 'bold');
      doc.text(proy, 10, y);
      doc.setFont('helvetica', 'normal');
      doc.text(estadosStr, 65, y);
      y += 5.5;
    });

    doc.save(`CECOM_Llamadas_Control_${fechaSeleccionada}.pdf`);
  };
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-indigo-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Centro de Control y Monitoreo (CECOM)
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <PhoneCall className="text-indigo-600" size={26} /> Checklist de Llamadas de Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro auditado por franja horaria. Marque <strong>OK</strong> (Sin Novedad), <strong>NOV</strong> (Con Novedad) o <strong>S/R</strong> (No Contestó).
          </p>
        </div>

        <button
          type="button"
          onClick={exportarActaPDF}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer self-start md:self-center"
        >
          <FileText size={16} /> Exportar Acta CECOM PDF
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Clock size={13} /> Fecha de Guardia
          </label>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Filtro de Turno</label>
          <select
            value={turnoFiltro}
            onChange={(e) => setTurnoFiltro(e.target.value as any)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="TODAS">Todas las Franjas (24 Horas)</option>
            <option value="DIURNO">Turno Diurno (08:00 AM - 04:00 PM)</option>
            <option value="NOCTURNO">Turno Nocturno (08:00 PM - 06:00 AM)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Buscar Proyecto</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre del puesto..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        {cargando ? (
          <p className="text-center text-slate-500 py-8 text-sm">Cargando matriz de llamadas CECOM...</p>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 sticky left-0 bg-slate-900 z-10 min-w-[180px]">Proyecto / Puesto</th>
                {franjasVisibles.map((fr) => (
                  <th key={fr} className="p-2.5 text-center min-w-[115px] border-l border-slate-700">
                    {fr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {proyectosFiltrados.map((proy) => (
                <tr key={proy} className="hover:bg-slate-50">
                  <td className="p-3 font-black text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                    {proy}
                  </td>
                  {franjasVisibles.map((fr) => {
                    const clave = `${proy}__${fr}`;
                    const reg = registrosMap[clave];
                    const guardandoEsta = guardandoCelda === clave;

                    return (
                      <td key={fr} className="p-2 text-center border-l border-slate-100 align-top">
                        {reg ? (
                          <div
                            title={`${reg.observacion || ''} (${reg.operador_cecom || ''})`}
                            className={`p-1.5 rounded-lg border text-[10px] font-bold space-y-1 ${
                              reg.estatus === 'SIN_NOVEDAD'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : reg.estatus === 'CON_NOVEDAD'
                                ? 'bg-amber-50 border-amber-300 text-amber-950'
                                : 'bg-red-50 border-red-300 text-red-900'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {reg.estatus === 'SIN_NOVEDAD' && <CheckCircle2 size={12} className="text-emerald-600" />}
                              {reg.estatus === 'CON_NOVEDAD' && <AlertTriangle size={12} className="text-amber-600" />}
                              {reg.estatus === 'NO_CONTESTO' && <XCircle size={12} className="text-red-600" />}
                              <span>
                                {reg.estatus === 'SIN_NOVEDAD'
                                  ? 'OK'
                                  : reg.estatus === 'CON_NOVEDAD'
                                  ? 'NOVEDAD'
                                  : 'NO CONTESTÓ'}
                              </span>
                            </div>
                            <div className="font-mono text-[9px] opacity-80">{reg.hora_llamada}</div>
                            <div className="flex justify-center gap-1 pt-0.5">
                              <button
                                type="button"
                                disabled={guardandoEsta}
                                onClick={() => registrarLlamada(proy, fr, 'SIN_NOVEDAD')}
                                className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] cursor-pointer"
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                disabled={guardandoEsta}
                                onClick={() => registrarLlamada(proy, fr, 'CON_NOVEDAD')}
                                className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] cursor-pointer"
                              >
                                NOV
                              </button>
                              <button
                                type="button"
                                disabled={guardandoEsta}
                                onClick={() => registrarLlamada(proy, fr, 'NO_CONTESTO')}
                                className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] cursor-pointer"
                              >
                                S/R
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-1 py-1">
                            <button
                              type="button"
                              disabled={guardandoEsta}
                              onClick={() => registrarLlamada(proy, fr, 'SIN_NOVEDAD')}
                              title="Sin Novedad"
                              className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-600 hover:text-white font-bold text-[10px] cursor-pointer"
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              disabled={guardandoEsta}
                              onClick={() => registrarLlamada(proy, fr, 'CON_NOVEDAD')}
                              title="Con Novedad"
                              className="px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-500 hover:text-white font-bold text-[10px] cursor-pointer"
                            >
                              NOV
                            </button>
                            <button
                              type="button"
                              disabled={guardandoEsta}
                              onClick={() => registrarLlamada(proy, fr, 'NO_CONTESTO')}
                              title="No Contestó"
                              className="px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-600 hover:text-white font-bold text-[10px] cursor-pointer"
                            >
                              S/R
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
