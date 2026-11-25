import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import { leTocaGuardiaHoy } from '../utils/rotacionGuardia';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import {
  FileSpreadsheet,
  FileText,
  Building2,
  Save,
  ClipboardList,
} from 'lucide-react';

const NOMBRES_MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

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

interface FilaDiaInasistencia {
  dia: number;
  plazaDiurna: number;
  plazaNocturna: number;
  asistDiurna: number;
  asistNocturna: number;
  faltasDiurnas: number;
  faltasNocturnas: number;
  totalFaltas: number;
}

export default function RelacionInasistenciasPage() {
  const { currentUser } = useAuth();
  const usuarioNombre = currentUser?.nombre_completo || currentUser?.username || 'Operaciones';

  const hoy = new Date();
  const [listaProyectos, setListaProyectos] = useState<string[]>([]);
  const [proyecto, setProyecto] = useState<string>('');
  const [anio, setAnio] = useState<number>(hoy.getFullYear());
  const [mes, setMes] = useState<number>(hoy.getMonth() + 1);

  const [plazaDiurnaConfig, setPlazaDiurnaConfig] = useState<number>(0);
  const [plazaNocturnaConfig, setPlazaNocturnaConfig] = useState<number>(0);
  const [guardandoPlazas, setGuardandoPlazas] = useState<boolean>(false);

  const [filas1ra, setFilas1ra] = useState<FilaDiaInasistencia[]>([]);
  const [filas2da, setFilas2da] = useState<FilaDiaInasistencia[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    const cargarProy = async () => {
      const setP = new Set<string>(Array.isArray(PROYECTOS) ? PROYECTOS : []);
      const { data } = await supabase.from('projects').select('*');
      if (Array.isArray(data)) {
        data.forEach((p: any) => {
          const val = p?.nombre || p?.name || p?.proyecto;
          if (val) setP.add(String(val).trim());
        });
      }
      const arr = Array.from(setP).sort();
      setListaProyectos(arr);
      if (arr.length > 0 && !proyecto) setProyecto(arr.at(0) || '');
    };
    cargarProy();
  }, []);
  const cargarRelacionMes = async () => {
    if (!proyecto) return;
    setCargando(true);
    setMensaje(null);

    try {
      const ultimoDiaMes = new Date(anio, mes, 0).getDate();
      const fechaDesde = `${anio}-${pad2(mes)}-01`;
      const fechaHasta = `${anio}-${pad2(mes)}-${pad2(ultimoDiaMes)}`;

      const { data: configData } = await supabase
        .from('plazas_proyecto_config')
        .select('*')
        .eq('proyecto', proyecto)
        .maybeSingle();

      const { data: plantillaData } = await supabase
        .from('plantilla_proyectos')
        .select('*')
        .eq('proyecto', proyecto)
        .eq('estado', 'ACTIVO');

      const activos = Array.isArray(plantillaData) ? plantillaData : [];

      let pDiurna = configData?.plazas_diurnas ?? 0;
      let pNocturna = configData?.plazas_nocturnas ?? 0;

      if (!configData && activos.length > 0) {
        const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
        activos.forEach((of) => {
          const cargoUp = String(of.cargo || 'OFICIAL').toUpperCase();
          const trnUp = String(of.turno || 'MIXTO').toUpperCase();
          if (cargoUp === 'LIDER') {
            pDiurna += 1;
          } else if (leTocaGuardiaHoy(of.grupo || 'A', of.turno || 'MIXTO', hoyISO)) {
            if (trnUp === 'DIURNO') pDiurna += 1;
            else pNocturna += 1;
          }
        });
      }

      setPlazaDiurnaConfig(pDiurna);
      setPlazaNocturnaConfig(pNocturna);

      const { data: asistData } = await supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .eq('proyecto', proyecto)
        .gte('fecha', fechaDesde)
        .lte('fecha', fechaHasta);

      const asistencias = Array.isArray(asistData) ? asistData : [];

      const { data: logsQrData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('project_name', proyecto)
        .gte('created_at', `${fechaDesde}T00:00:00`)
        .lte('created_at', `${fechaHasta}T23:59:59`);

      const logsQr = Array.isArray(logsQrData) ? logsQrData : [];

      const estatusAsistentes = [
        'PRESENTE',
        'APOYO RECIBIDO',
        'SERVICIO ESPECIAL MIXTO',
        'SERVICIO ESPECIAL DIURNO/NOCTURNO',
        'SERVICIO ESPECIAL PROPIO',
        'SERVICIO ESPECIAL RECIBIDO',
      ];

      const q1: FilaDiaInasistencia[] = [];
      const q2: FilaDiaInasistencia[] = [];

      for (let d = 1; d <= ultimoDiaMes; d++) {
        const fechaISO = `${anio}-${pad2(mes)}-${pad2(d)}`;
        const marcasDia = asistencias.filter((a) => a.fecha === fechaISO);

        let asistDiurna = 0;
        let asistNocturna = 0;
        const cedulasContadas = new Set<string>();
        let liderYaContadoEnDia = false;

        marcasDia.forEach((m) => {
          const est = String(m.estatus || '').toUpperCase();
          if (!estatusAsistentes.includes(est)) return;

          const ced = String(m.cedula || '').toUpperCase();
          const cargoUp = String(m.cargo || 'OFICIAL').toUpperCase();
          const turnoUp = String(m.turno || 'MIXTO').toUpperCase();

          cedulasContadas.add(ced);
          if (cargoUp === 'LIDER') {
            liderYaContadoEnDia = true;
            asistDiurna += 1;
          } else if (turnoUp === 'DIURNO') {
            asistDiurna += 1;
          } else {
            asistNocturna += 1;
          }
        });

        if (!liderYaContadoEnDia) {
          const logsDia = logsQr.filter((lg: any) => {
            const fLog = new Date(lg.created_at).toLocaleDateString('en-CA', {
              timeZone: 'America/Caracas',
            });
            return fLog === fechaISO;
          });
          if (logsDia.length > 0) {
            asistDiurna += 1;
          }
        }

        const faltasDiurnas = pDiurna - asistDiurna;
        const faltasNocturnas = pNocturna - asistNocturna;
        const totalFaltas = faltasDiurnas + faltasNocturnas;

        const fila: FilaDiaInasistencia = {
          dia: d,
          plazaDiurna: pDiurna,
          plazaNocturna: pNocturna,
          asistDiurna,
          asistNocturna,
          faltasDiurnas,
          faltasNocturnas,
          totalFaltas,
        };

        if (d <= 15) q1.push(fila);
        else q2.push(fila);
      }

      setFilas1ra(q1);
      setFilas2da(q2);
    } catch (err) {
      console.error('Error cargando relación de inasistencias:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (proyecto) cargarRelacionMes();
  }, [proyecto, anio, mes]);

  const guardarConfigPlazas = async () => {
    if (!proyecto) return;
    setGuardandoPlazas(true);
    try {
      await supabase.from('plazas_proyecto_config').upsert(
        [
          {
            proyecto,
            plazas_diurnas: plazaDiurnaConfig,
            plazas_nocturnas: plazaNocturnaConfig,
            updated_by: usuarioNombre,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'proyecto' }
      );
      setMensaje(`✅ Plazas contratadas de ${proyecto} guardadas (${plazaDiurnaConfig} Diurnas / ${plazaNocturnaConfig} Nocturnas-Mixtas).`);
      await cargarRelacionMes();
    } catch (err) {
      console.error('Error guardando plazas:', err);
    } finally {
      setGuardandoPlazas(false);
    }
  };
  const rolActual = (currentUser?.role || '').toLowerCase();
  const puedeEditarTodo = ['directiva', 'administrador', 'admin'].includes(rolActual);
  const [modoEdicionTotal, setModoEdicionTotal] = useState<boolean>(false);

  const actualizarCeldaDia = (
    quincena: '1RA' | '2DA',
    indexFila: number,
    campo: 'plazaDiurna' | 'plazaNocturna' | 'asistDiurna' | 'asistNocturna',
    nuevoValor: number
  ) => {
    const setter = quincena === '1RA' ? setFilas1ra : setFilas2da;
    setter((prev) =>
      prev.map((fila, idx) => {
        if (idx !== indexFila) return fila;
        const actualizada = { ...fila, [campo]: nuevoValor };
        actualizada.faltasDiurnas = actualizada.plazaDiurna - actualizada.asistDiurna;
        actualizada.faltasNocturnas = actualizada.plazaNocturna - actualizada.asistNocturna;
        actualizada.totalFaltas = actualizada.faltasDiurnas + actualizada.faltasNocturnas;
        return actualizada;
      })
    );
  };

  const exportarExcelInasistencias = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(proyecto.slice(0, 28) || 'INASISTENCIAS');

    const escribirBloqueQuincena = (tituloQuincena: string, filas: FilaDiaInasistencia[]) => {
      ws.addRow(['', '', proyecto.toUpperCase()]);
      ws.addRow(['', '', 'RELACION DE INASISTENCIAS']);
      ws.addRow(['', '', 'SEGURIDAD VIP 3000', '', proyecto.toUpperCase()]);
      ws.addRow([`${tituloQuincena} ${NOMBRES_MESES[mes - 1]}`, '', '', '', anio]);
      const h1 = ws.addRow(['Día', 'PLAZA', 'PLAZA', 'ASISTENTES', 'ASISTENTES', 'Faltas', 'Faltas', 'TOTAL']);
      const h2 = ws.addRow(['', 'Diurnas', 'Nocturna', 'Diurna', 'Nocturna', 'Diurnas', 'Nocturnas', '']);
      h1.font = { bold: true };
      h2.font = { bold: true };

      filas.forEach((f) => {
        ws.addRow([
          f.dia,
          f.plazaDiurna,
          f.plazaNocturna,
          f.asistDiurna,
          f.asistNocturna,
          f.faltasDiurnas,
          f.faltasNocturnas,
          f.totalFaltas,
        ]);
      });

      const sumaTotal = filas.reduce((acc, x) => acc + x.totalFaltas, 0);
      const rTot = ws.addRow(['', '', '', '', '', '', '', sumaTotal]);
      rTot.font = { bold: true };
      ws.addRow([]);
    };

    escribirBloqueQuincena('1RA', filas1ra);
    escribirBloqueQuincena('2DA', filas2da);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relacion_Inasistencias_${proyecto.replace(/\s+/g, '_')}_${NOMBRES_MESES[mes - 1]}_${anio}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportarPDFInasistencias = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const logo = await cargarLogoBase64();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 216, 25, 'F');
    if (logo) {
      try {
        doc.addImage(logo, 'JPEG', 12, 3.5, 18, 18);
      } catch {}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SEGURIDAD VIP 3000 C.A. — RELACIÓN DE INASISTENCIAS', 35, 11);
    doc.setFontSize(9.5);
    doc.setTextColor(147, 197, 253);
    doc.text(`Proyecto: ${proyecto}  |  Período: ${NOMBRES_MESES[mes - 1]} ${anio}`, 35, 18);

    let y = 32;
    const dibujarTablaQuincena = (titulo: string, filas: FilaDiaInasistencia[]) => {
      if (y > 220) {
        doc.addPage();
        y = 18;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${titulo} ${NOMBRES_MESES[mes - 1]} ${anio}`, 14, y);
      y += 4;

      doc.setFillColor(226, 232, 240);
      doc.rect(14, y, 188, 6, 'F');
      doc.setFontSize(7.5);
      doc.text('Día', 18, y + 4);
      doc.text('PLAZA Diur.', 42, y + 4, { align: 'right' });
      doc.text('PLAZA Noct.', 68, y + 4, { align: 'right' });
      doc.text('ASIST. Diur.', 95, y + 4, { align: 'right' });
      doc.text('ASIST. Noct.', 122, y + 4, { align: 'right' });
      doc.text('Faltas Diur.', 148, y + 4, { align: 'right' });
      doc.text('Faltas Noct.', 175, y + 4, { align: 'right' });
      doc.text('TOTAL', 199, y + 4, { align: 'right' });
      y += 8;

      doc.setFont('helvetica', 'normal');
      filas.forEach((f) => {
        doc.text(String(f.dia), 18, y);
        doc.text(String(f.plazaDiurna), 42, y, { align: 'right' });
        doc.text(String(f.plazaNocturna), 68, y, { align: 'right' });
        doc.text(String(f.asistDiurna), 95, y, { align: 'right' });
        doc.text(String(f.asistNocturna), 122, y, { align: 'right' });
        doc.text(String(f.faltasDiurnas), 148, y, { align: 'right' });
        doc.text(String(f.faltasNocturnas), 175, y, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(String(f.totalFaltas), 199, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 4.3;
      });

      const totQ = filas.reduce((a, b) => a + b.totalFaltas, 0);
      doc.setFont('helvetica', 'bold');
      doc.line(14, y - 2, 202, y - 2);
      doc.text(`TOTAL FALTAS ${titulo}:`, 150, y + 2, { align: 'right' });
      doc.text(String(totQ), 199, y + 2, { align: 'right' });
      y += 9;
    };

    dibujarTablaQuincena('1RA QUINCENA', filas1ra);
    dibujarTablaQuincena('2DA QUINCENA', filas2da);

    doc.save(`Relacion_Inasistencias_${proyecto.replace(/\s+/g, '_')}_${NOMBRES_MESES[mes - 1]}_${anio}.pdf`);
  };

  const renderTablaQuincena = (titulo: '1RA' | '2DA', filas: FilaDiaInasistencia[]) => {
    const totalQ = filas.reduce((acc, x) => acc + x.totalFaltas, 0);
    return (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase">
              {titulo} {NOMBRES_MESES[mes - 1]} {anio} — {proyecto}
            </h3>
            <p className="text-[11px] text-slate-500">
              Diurno incluye Líder QR + Diurnos • Nocturno incluye Nocturnos + Mixtos + 24X24.
            </p>
          </div>
          <span className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-black">
            TOTAL FALTAS: {totalQ}
          </span>
        </div>

        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
              <th className="p-2 border">Día</th>
              <th className="p-2 border bg-blue-50">PLAZA Diurnas</th>
              <th className="p-2 border bg-indigo-50">PLAZA Nocturna</th>
              <th className="p-2 border bg-emerald-50">ASIST. Diurna</th>
              <th className="p-2 border bg-teal-50">ASIST. Nocturna</th>
              <th className="p-2 border bg-amber-50">Faltas Diurnas</th>
              <th className="p-2 border bg-orange-50">Faltas Nocturnas</th>
              <th className="p-2 border bg-slate-200 font-black">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filas.map((f, idx) => (
              <tr key={f.dia} className="hover:bg-slate-50">
                <td className="p-1.5 border font-bold">{f.dia}</td>
                <td className="p-1 border">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.plazaDiurna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'plazaDiurna', Number(e.target.value))}
                      className="w-12 text-center border border-blue-400 rounded py-0.5 font-bold bg-blue-50"
                    />
                  ) : (
                    f.plazaDiurna
                  )}
                </td>
                <td className="p-1 border">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.plazaNocturna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'plazaNocturna', Number(e.target.value))}
                      className="w-12 text-center border border-indigo-400 rounded py-0.5 font-bold bg-indigo-50"
                    />
                  ) : (
                    f.plazaNocturna
                  )}
                </td>
                <td className="p-1 border font-semibold text-emerald-800">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.asistDiurna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'asistDiurna', Number(e.target.value))}
                      className="w-12 text-center border border-emerald-400 rounded py-0.5 font-bold bg-emerald-50"
                    />
                  ) : (
                    f.asistDiurna
                  )}
                </td>
                <td className="p-1 border font-semibold text-teal-800">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.asistNocturna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'asistNocturna', Number(e.target.value))}
                      className="w-12 text-center border border-teal-400 rounded py-0.5 font-bold bg-teal-50"
                    />
                  ) : (
                    f.asistNocturna
                  )}
                </td>
                <td className={`p-1.5 border font-bold ${f.faltasDiurnas > 0 ? 'text-red-600 bg-red-50' : ''}`}>
                  {f.faltasDiurnas}
                </td>
                <td className={`p-1.5 border font-bold ${f.faltasNocturnas > 0 ? 'text-red-600 bg-red-50' : ''}`}>
                  {f.faltasNocturnas}
                </td>
                <td className={`p-1.5 border font-black ${f.totalFaltas > 0 ? 'text-red-700 bg-red-100' : 'bg-slate-50'}`}>
                  {f.totalFaltas}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-amber-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Control Administrativo de Faltas — Operaciones, Directiva y Administración
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <ClipboardList className="text-amber-600" size={26} /> Relación de Inasistencias por Proyecto
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Compara plazas contratadas vs. asistencia real diaria (Diurna con Líder QR y Nocturna/Mixta) por quincena.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {puedeEditarTodo && (
            <button
              type="button"
              onClick={() => setModoEdicionTotal(!modoEdicionTotal)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                modoEdicionTotal
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              {modoEdicionTotal ? '✅ Finalizar Edición' : '✏️ Editar Celdas (Directiva)'}
            </button>
          )}
          <button
            type="button"
            onClick={exportarExcelInasistencias}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={16} /> Exportar Excel
          </button>
          <button
            type="button"
            onClick={exportarPDFInasistencias}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
          {mensaje}
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Building2 size={13} /> Proyecto
          </label>
          <select
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          >
            {listaProyectos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mes</label>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          >
            {NOMBRES_MESES.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Año</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Plazas Diurnas</label>
          <input
            type="number"
            value={plazaDiurnaConfig}
            onChange={(e) => setPlazaDiurnaConfig(Number(e.target.value))}
            className="w-full border border-blue-300 bg-blue-50/50 rounded-xl px-3 py-2 text-xs font-black"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Plazas Noct./Mixtas</label>
          <div className="flex gap-1.5">
            <input
              type="number"
              value={plazaNocturnaConfig}
              onChange={(e) => setPlazaNocturnaConfig(Number(e.target.value))}
              className="w-full border border-indigo-300 bg-indigo-50/50 rounded-xl px-3 py-2 text-xs font-black"
            />
            <button
              type="button"
              onClick={guardarConfigPlazas}
              disabled={guardandoPlazas}
              title="Guardar Plazas Contratadas"
              className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shrink-0"
            >
              <Save size={15} />
            </button>
          </div>
        </div>
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 py-8 text-sm">Calculando relación de inasistencias...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {renderTablaQuincena('1RA', filas1ra)}
          {renderTablaQuincena('2DA', filas2da)}
        </div>
      )}
    </div>
  );
}
