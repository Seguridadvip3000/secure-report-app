import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import { leTocaGuardiaHoy } from '../utils/rotacionGuardia';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  Radio,
} from 'lucide-react';

interface ResumenProyectoCobertura {
  proyecto: string;
  esperadosHoy: number;
  presentesHoy: number;
  diurnosPresentes: number;
  nocturnosMixtosPresentes: number;
  apoyosRecibidos: number;
  ausentesList: string[];
  pendientesMarcarList: string[];
  porcentajeCobertura: number;
}

const obtenerFechaCaracas = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

export default function TableroCoberturaPage() {
  const [fechaHoy] = useState<string>(obtenerFechaCaracas());
  const [resumenes, setResumenes] = useState<ResumenProyectoCobertura[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'CUBIERTO' | 'INCOMPLETO'>('TODOS');

  const cargarCoberturaEnVivo = async () => {
    try {
      const setProyectos = new Set<string>(Array.isArray(PROYECTOS) ? PROYECTOS : []);
      const { data: projsDb } = await supabase.from('projects').select('*');
      if (Array.isArray(projsDb)) {
        projsDb.forEach((p: any) => {
          const n = p?.nombre || p?.name || p?.proyecto;
          if (n) setProyectos.add(String(n).trim());
        });
      }

      const { data: plantillaData } = await supabase
        .from('plantilla_proyectos')
        .select('*')
        .eq('estado', 'ACTIVO');

      const plantillaActiva = Array.isArray(plantillaData) ? plantillaData : [];

      const { data: asistHoyData } = await supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .eq('fecha', fechaHoy);

      const asistHoy = Array.isArray(asistHoyData) ? asistHoyData : [];

      const { data: logsQrData } = await supabase
        .from('attendance_logs')
        .select('*')
        .gte('created_at', `${fechaHoy}T00:00:00`)
        .lte('created_at', `${fechaHoy}T23:59:59`);

      const logsQr = Array.isArray(logsQrData) ? logsQrData : [];

      plantillaActiva.forEach((p) => {
        if (p.proyecto) setProyectos.add(String(p.proyecto).trim());
      });

      const estatusPresentes = [
        'PRESENTE',
        'APOYO RECIBIDO',
        'SERVICIO ESPECIAL MIXTO',
        'SERVICIO ESPECIAL DIURNO/NOCTURNO',
        'SERVICIO ESPECIAL PROPIO',
        'SERVICIO ESPECIAL RECIBIDO',
      ];

      const listaCalculada: ResumenProyectoCobertura[] = Array.from(setProyectos)
        .sort()
        .map((proy) => {
          const personalProy = plantillaActiva.filter(
            (p) => String(p.proyecto || '').trim().toUpperCase() === proy.toUpperCase()
          );
          const marcasProy = asistHoy.filter(
            (a) => String(a.proyecto || '').trim().toUpperCase() === proy.toUpperCase()
          );
          const logsProy = logsQr.filter(
            (l) => String(l.project_name || '').trim().toUpperCase() === proy.toUpperCase()
          );

          let esperadosHoy = 0;
          let presentesHoy = 0;
          let diurnosPresentes = 0;
          let nocturnosMixtosPresentes = 0;
          let apoyosRecibidos = 0;
          const ausentesList: string[] = [];
          const pendientesMarcarList: string[] = [];
          const cedulasContadas = new Set<string>();

          personalProy.forEach((of) => {
            const ced = String(of.cedula || '').toUpperCase();
            const cargoUp = String(of.cargo || 'OFICIAL').toUpperCase();
            const turnoUp = String(of.turno || 'MIXTO').toUpperCase();
            const marca = marcasProy.find((m) => String(m.cedula || '').toUpperCase() === ced);

            let leToca = false;
            if (cargoUp === 'LIDER') {
              const diaSem = new Date(`${fechaHoy}T12:00:00`).getDay();
              leToca = diaSem >= 1 && diaSem <= 5;
            } else {
              leToca = leTocaGuardiaHoy(of.grupo || 'A', of.turno || 'MIXTO', fechaHoy);
            }

            if (leToca) esperadosHoy++;

            if (marca) {
              const est = String(marca.estatus || '').toUpperCase();
              if (estatusPresentes.includes(est)) {
                presentesHoy++;
                cedulasContadas.add(ced);
                if (turnoUp === 'DIURNO' || cargoUp === 'LIDER') {
                  diurnosPresentes++;
                } else {
                  nocturnosMixtosPresentes++;
                }
              } else if (leToca) {
                ausentesList.push(`${of.apellidos}, ${of.nombres} (${est})`);
              }
            } else if (cargoUp === 'LIDER') {
              const ultimoLog = logsProy.at(-1);
              const tipoEv = String(
                ultimoLog?.type || ultimoLog?.event_type || ultimoLog?.action || ''
              ).toUpperCase();
              const liderEnPuesto =
                logsProy.length > 0 &&
                !tipoEv.includes('SALIDA') &&
                !tipoEv.includes('OUT');

              if (liderEnPuesto) {
                presentesHoy++;
                diurnosPresentes++;
                cedulasContadas.add(ced);
              } else if (leToca) {
                pendientesMarcarList.push(`${of.apellidos}, ${of.nombres} (LÍDER QR)`);
              }
            } else if (leToca) {
              pendientesMarcarList.push(`${of.apellidos}, ${of.nombres} (${turnoUp})`);
            }
          });

          // Sumar apoyos o servicios especiales recibidos externos
          marcasProy.forEach((m) => {
            const ced = String(m.cedula || '').toUpperCase();
            const est = String(m.estatus || '').toUpperCase();
            const trn = String(m.turno || 'MIXTO').toUpperCase();
            if (!cedulasContadas.has(ced) && estatusPresentes.includes(est)) {
              presentesHoy++;
              apoyosRecibidos++;
              cedulasContadas.add(ced);
              if (trn === 'DIURNO') {
                diurnosPresentes++;
              } else {
                nocturnosMixtosPresentes++;
              }
            }
          });

          const porcentajeCobertura =
            esperadosHoy > 0
              ? Math.min(100, Math.round((presentesHoy / esperadosHoy) * 100))
              : presentesHoy > 0
              ? 100
              : 0;

          return {
            proyecto: proy,
            esperadosHoy,
            presentesHoy,
            diurnosPresentes,
            nocturnosMixtosPresentes,
            apoyosRecibidos,
            ausentesList,
            pendientesMarcarList,
            porcentajeCobertura,
          };
        });

      setResumenes(listaCalculada);
      setUltimaActualizacion(
        new Intl.DateTimeFormat('es-VE', {
          timeZone: 'America/Caracas',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(new Date())
      );
    } catch (err) {
      console.error('Error cargando tablero cobertura:', err);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => {
    cargarCoberturaEnVivo();

    const canal = supabase
      .channel('cobertura-tiempo-real')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asistencias_diarias_oficiales' },
        () => cargarCoberturaEnVivo()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs' },
        () => cargarCoberturaEnVivo()
      )
      .subscribe();

    const intervalo = setInterval(cargarCoberturaEnVivo, 25000);

    return () => {
      clearInterval(intervalo);
      supabase.removeChannel(canal);
    };
  }, [fechaHoy]);

  const totalEsperadosGlobal = resumenes.reduce((acc, r) => acc + r.esperadosHoy, 0);
  const totalPresentesGlobal = resumenes.reduce((acc, r) => acc + r.presentesHoy, 0);
  const totalDiurnosGlobal = resumenes.reduce((acc, r) => acc + r.diurnosPresentes, 0);
  const totalNocturnosGlobal = resumenes.reduce((acc, r) => acc + r.nocturnosMixtosPresentes, 0);
  const porcentajeGlobal =
    totalEsperadosGlobal > 0
      ? Math.round((totalPresentesGlobal / totalEsperadosGlobal) * 100)
      : 0;

  const filtrados = resumenes.filter((r) => {
    if (busqueda.trim() && !r.proyecto.toLowerCase().includes(busqueda.toLowerCase().trim())) {
      return false;
    }
    if (filtroEstado === 'CUBIERTO') {
      return r.esperadosHoy > 0 && r.presentesHoy >= r.esperadosHoy;
    }
    if (filtroEstado === 'INCOMPLETO') {
      return r.presentesHoy < r.esperadosHoy || r.ausentesList.length > 0;
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-cyan-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-1.5">
            <Radio size={14} className="animate-pulse text-emerald-600" /> Monitoreo Operativo en Vivo ({fechaHoy})
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <Activity className="text-cyan-600" size={26} /> Tablero de Cobertura por Proyecto
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Se actualiza automáticamente a medida que los líderes marcan asistencia o escanean su entrada QR. Última lectura: <strong>{ultimaActualizacion || 'Cargando...'}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={cargarCoberturaEnVivo}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer self-start md:self-center"
        >
          <RefreshCw size={15} /> Actualizar Ahora
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Cobertura Global Hoy</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{porcentajeGlobal}%</div>
          <div className="text-xs text-slate-300 mt-0.5">
            {totalPresentesGlobal} de {totalEsperadosGlobal} puestos
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Esperados en Guardia</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{totalEsperadosGlobal}</div>
          <div className="text-xs text-slate-400 mt-0.5">Según rotación del día</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-200">
          <div className="text-[11px] font-bold text-emerald-700 uppercase">Operativos en Puesto</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{totalPresentesGlobal}</div>
          <div className="text-xs text-emerald-600 mt-0.5">Activos en servicio</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-200">
          <div className="text-[11px] font-bold text-amber-700 uppercase">Turno Diurno</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{totalDiurnosGlobal}</div>
          <div className="text-xs text-slate-400 mt-0.5">Diurnos + Líderes QR</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-200">
          <div className="text-[11px] font-bold text-indigo-700 uppercase">Nocturnos y Mixtos</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{totalNocturnosGlobal}</div>
          <div className="text-xs text-slate-400 mt-0.5">Nocturno + Mixto + 24x24</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Filtrar proyecto..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as any)}
          className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <option value="TODOS">Todos los Proyectos ({resumenes.length})</option>
          <option value="CUBIERTO">100% Cubiertos</option>
          <option value="INCOMPLETO">Con Novedad / Pendientes por Llegar</option>
        </select>
      </div>
      {cargando ? (
        <p className="text-center text-slate-500 py-10 text-sm">Cargando cobertura operativa en tiempo real...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((item) => {
            const completo = item.esperadosHoy > 0 && item.presentesHoy >= item.esperadosHoy;
            const tieneAusencias = item.ausentesList.length > 0;

            return (
              <div
                key={item.proyecto}
                className={`bg-white p-5 rounded-2xl shadow-sm border-2 space-y-3 ${
                  tieneAusencias
                    ? 'border-red-300'
                    : completo
                    ? 'border-emerald-300'
                    : item.esperadosHoy === 0
                    ? 'border-slate-200'
                    : 'border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase">{item.proyecto}</h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Users size={13} /> {item.presentesHoy} / {item.esperadosHoy} operativos
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                      tieneAusencias
                        ? 'bg-red-100 text-red-800'
                        : completo
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {completo && !tieneAusencias ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {item.porcentajeCobertura}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      tieneAusencias
                        ? 'bg-red-500'
                        : completo
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${item.porcentajeCobertura}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-slate-500 font-semibold">Diurnos</div>
                    <div className="font-black text-amber-700 text-sm">{item.diurnosPresentes}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-semibold">Noct./Mixto</div>
                    <div className="font-black text-indigo-700 text-sm">{item.nocturnosMixtosPresentes}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-semibold">Apoyos</div>
                    <div className="font-black text-teal-700 text-sm">{item.apoyosRecibidos}</div>
                  </div>
                </div>

                {item.ausentesList.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11px] text-red-900 space-y-0.5">
                    <div className="font-black uppercase">⚠️ Ausencias / Novedades:</div>
                    {item.ausentesList.map((a, idx) => (
                      <div key={idx}>• {a}</div>
                    ))}
                  </div>
                )}

                {item.pendientesMarcarList.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 space-y-0.5">
                    <div className="font-bold uppercase">⏳ Pendientes por marcar entrada:</div>
                    {item.pendientesMarcarList.slice(0, 4).map((p, idx) => (
                      <div key={idx}>• {p}</div>
                    ))}
                    {item.pendientesMarcarList.length > 4 && (
                      <div className="italic">+{item.pendientesMarcarList.length - 4} más...</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
