import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import { ordenarRegistrosAsistencia } from '../utils/pdfAsistenciaDiaria';
import { Building2, Calendar, RefreshCw, Shield, Users } from 'lucide-react';

interface MonitorProps {
  modo: 'CECOM' | 'OPERACIONES' | 'DIRECTIVA';
  titulo?: string;
}

const PROYECTOS_CON_JEFE_OP = ['ESTACIONAMIENTO CCCT', 'COMERCIO CCCT'];
const PROYECTOS_CON_DIURNO = [
  'CHACAITO',
  'BARUTA',
  'TRINIDAD',
  'CENTRO PLAZA',
  'CONCRESA',
  'TRINITARIAS',
  'LA GRANJA',
  'ASOPROSUR',
  'ASOPRSUR',
];
const PROYECTOS_CON_NOCTURNO = ['YARIBU', 'DUNCAN LA CALIFORNIA'];

const ESTATUS_ASISTENTES = [
  'PRESENTE',
  'SERVICIO ESPECIAL PROPIO',
  'SERVICIO ESPECIAL MIXTO',
  'SERVICIO ESPECIAL DIURNO/NOCTURNO',
  'SERVICIO ESPECIAL RECIBIDO',
  'APOYO RECIBIDO',
];

export default function MonitorAsistenciaOperativa({ modo, titulo }: MonitorProps) {
  const hoyLocal = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

  const [fechaFiltro, setFechaFiltro] = useState<string>(hoyLocal);
  const [listaProyectos, setListaProyectos] = useState<string[]>([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>(
    modo === 'CECOM' ? 'TODOS' : ''
  );
  const [registrosDia, setRegistrosDia] = useState<any[]>([]);
  const [lideresActivosMap, setLideresActivosMap] = useState<Record<string, boolean>>({});
  const [cargando, setCargando] = useState<boolean>(false);

  const pad2 = (n: number) => String(n).padStart(2, '0');
  useEffect(() => {
    const cargarProyectos = async () => {
      const setProy = new Set<string>(Array.isArray(PROYECTOS) ? PROYECTOS : []);
      const { data } = await supabase.from('projects').select('*');
      if (Array.isArray(data)) {
        data.forEach((p: any) => {
          const val = p?.nombre || p?.name || p?.proyecto;
          if (val) setProy.add(String(val).trim());
        });
      }
      const ordenados = Array.from(setProy).sort();
      setListaProyectos(ordenados);
      if (modo !== 'CECOM' && !proyectoSeleccionado && ordenados.length > 0) {
        setProyectoSeleccionado(ordenados.at(0) || 'TODOS');
      }
    };
    cargarProyectos();
  }, []);

  const consultarDatos = async () => {
    setCargando(true);
    try {
      let query = supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .eq('fecha', fechaFiltro);

      if (proyectoSeleccionado && proyectoSeleccionado !== 'TODOS') {
        query = query.eq('proyecto', proyectoSeleccionado);
      }

      const { data: asistData } = await query.limit(1000);
      setRegistrosDia(Array.isArray(asistData) ? asistData : []);

      // Verificar presencia activa por QR de los líderes de cada proyecto en la fecha
      const { data: logsQR } = await supabase
        .from('attendance_logs')
        .select('*')
        .gte('created_at', `${fechaFiltro}T00:00:00`)
        .lte('created_at', `${fechaFiltro}T23:59:59`)
        .order('created_at', { ascending: true });

      const mapaQR: Record<string, boolean> = {};
      if (Array.isArray(logsQR)) {
        logsQR.forEach((log: any) => {
          const proy = String(log?.project_name || '').trim().toUpperCase();
          if (!proy) return;
          const tipo = String(log?.type || log?.event_type || log?.action || log?.tipo || '').toUpperCase();
          if (tipo.includes('SALIDA') || tipo.includes('OUT') || tipo.includes('EXIT')) {
            mapaQR[proy] = false;
          } else {
            mapaQR[proy] = true;
          }
        });
      }
      setLideresActivosMap(mapaQR);
    } catch (err) {
      console.error('Error cargando monitor operativo:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (proyectoSeleccionado) {
      consultarDatos();
    }
  }, [fechaFiltro, proyectoSeleccionado]);

  const calcularResumenProyecto = (nombreProyecto: string) => {
    const proyUpper = nombreProyecto.toUpperCase();
    const asistentes = registrosDia.filter(
      (r) =>
        String(r.proyecto || '').toUpperCase() === proyUpper &&
        ESTATUS_ASISTENTES.includes(String(r.estatus || '').toUpperCase())
    );

    const tieneJefeOp = PROYECTOS_CON_JEFE_OP.includes(proyUpper);
    const tieneDiurno = PROYECTOS_CON_DIURNO.includes(proyUpper);
    const tieneNocturno = PROYECTOS_CON_NOCTURNO.includes(proyUpper);

    const lider = lideresActivosMap[proyUpper] ? 1 : 0;
    const jefeOp = tieneJefeOp
      ? asistentes.filter((a) => String(a.cargo || '').toUpperCase() === 'J. OPERACIONES').length
      : 0;
    const mixtos = asistentes.filter(
      (a) =>
        String(a.cargo || '').toUpperCase() !== 'LIDER' &&
        String(a.cargo || '').toUpperCase() !== 'J. OPERACIONES' &&
        ['MIXTO', '24X24'].includes(String(a.turno || 'MIXTO').toUpperCase())
    ).length;
    const diurnos = asistentes.filter(
      (a) =>
        String(a.cargo || '').toUpperCase() !== 'LIDER' &&
        String(a.cargo || '').toUpperCase() !== 'J. OPERACIONES' &&
        String(a.turno || '').toUpperCase() === 'DIURNO'
    ).length;
    const nocturnos = asistentes.filter(
      (a) =>
        String(a.cargo || '').toUpperCase() !== 'LIDER' &&
        String(a.cargo || '').toUpperCase() !== 'J. OPERACIONES' &&
        String(a.turno || '').toUpperCase() === 'NOCTURNO'
    ).length;

    const total = lider + jefeOp + mixtos + diurnos + nocturnos;
    return {
      lider,
      jefeOp,
      mixtos,
      diurnos,
      nocturnos,
      total,
      tieneJefeOp,
      tieneDiurno: tieneDiurno || diurnos > 0,
      tieneNocturno: tieneNocturno || nocturnos > 0,
    };
  };
  const proyectosAMostrar =
    proyectoSeleccionado === 'TODOS'
      ? listaProyectos
      : proyectoSeleccionado
      ? [proyectoSeleccionado]
      : [];

  const totalGlobalEmpresa = proyectosAMostrar.reduce(
    (acc, p) => acc + calcularResumenProyecto(p).total,
    0
  );

  const listaOrdenada = ordenarRegistrosAsistencia(registrosDia);

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            {modo === 'CECOM'
              ? 'Centro de Control CECOM — Fuerza Operativa'
              : modo === 'OPERACIONES'
              ? 'Operaciones — Personal Operativo en Guardia'
              : 'Directiva — Control Completo de Asistencia por Proyecto'}
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <Shield className="text-blue-600" size={22} />
            {titulo || 'Monitor de Asistencia Operativa'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Building2 size={12} /> Proyecto
            </label>
            <select
              value={proyectoSeleccionado}
              onChange={(e) => setProyectoSeleccionado(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50"
            >
              {modo === 'CECOM' && <option value="TODOS">TODOS LOS PROYECTOS</option>}
              {listaProyectos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Calendar size={12} /> Fecha
            </label>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
            />
          </div>

          <button
            type="button"
            onClick={consultarDatos}
            className="mt-4 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {modo === 'CECOM' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Total Fuerza Operativa Activa ({fechaFiltro})
              </span>
              <p className="text-xs text-slate-400">
                Sumatoria de líderes activos por QR, jefes de operaciones y oficiales presentes
              </p>
            </div>
            <span className="text-3xl font-black text-emerald-400">
              {pad2(totalGlobalEmpresa)}
            </span>
          </div>

          {cargando ? (
            <p className="text-center text-slate-500 py-8 text-sm">Calculando fuerza operativa...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proyectosAMostrar.map((proy) => {
                const res = calcularResumenProyecto(proy);
                return (
                  <div
                    key={proy}
                    className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <span className="text-xs font-black uppercase text-blue-300">{proy}</span>
                      <span className="text-base font-black text-emerald-400">
                        TOTAL: {pad2(res.total)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-slate-800 p-2 rounded-lg">
                        <div className="text-slate-400 font-bold">LÍDER PROYECTO</div>
                        <div className="text-base font-black text-white">{pad2(res.lider)}</div>
                      </div>

                      {res.tieneJefeOp && (
                        <div className="bg-slate-800 p-2 rounded-lg">
                          <div className="text-slate-400 font-bold">J. OPERACIONES</div>
                          <div className="text-base font-black text-white">{pad2(res.jefeOp)}</div>
                        </div>
                      )}

                      <div className="bg-slate-800 p-2 rounded-lg">
                        <div className="text-slate-400 font-bold">OF. MIXTOS</div>
                        <div className="text-base font-black text-blue-300">{pad2(res.mixtos)}</div>
                      </div>

                      {res.tieneDiurno && (
                        <div className="bg-slate-800 p-2 rounded-lg">
                          <div className="text-slate-400 font-bold">OF. DIURNOS</div>
                          <div className="text-base font-black text-amber-300">{pad2(res.diurnos)}</div>
                        </div>
                      )}

                      {res.tieneNocturno && (
                        <div className="bg-slate-800 p-2 rounded-lg">
                          <div className="text-slate-400 font-bold">OF. NOCTURNOS</div>
                          <div className="text-base font-black text-purple-300">{pad2(res.nocturnos)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {modo === 'DIRECTIVA' && proyectoSeleccionado && (
        (() => {
          const res = calcularResumenProyecto(proyectoSeleccionado);
          return (
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Resumen Numérico de Plantilla Presente — {proyectoSeleccionado} ({fechaFiltro})
                </span>
                <span className="text-lg font-black text-emerald-400">
                  TOTAL: {pad2(res.total)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="text-slate-400 font-bold uppercase">Líder de Proyecto</div>
                  <div className="text-xl font-black text-white mt-0.5">{pad2(res.lider)}</div>
                </div>

                {res.tieneJefeOp && (
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-slate-400 font-bold uppercase">Jefe de Operaciones</div>
                    <div className="text-xl font-black text-white mt-0.5">{pad2(res.jefeOp)}</div>
                  </div>
                )}

                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="text-slate-400 font-bold uppercase">Oficiales Mixtos</div>
                  <div className="text-xl font-black text-blue-300 mt-0.5">{pad2(res.mixtos)}</div>
                </div>

                {res.tieneDiurno && (
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-slate-400 font-bold uppercase">Oficiales Diurnos</div>
                    <div className="text-xl font-black text-amber-300 mt-0.5">{pad2(res.diurnos)}</div>
                  </div>
                )}

                {res.tieneNocturno && (
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-slate-400 font-bold uppercase">Oficiales Nocturnos</div>
                    <div className="text-xl font-black text-purple-300 mt-0.5">{pad2(res.nocturnos)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}

      {(modo === 'OPERACIONES' || modo === 'DIRECTIVA') && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users size={18} className="text-blue-600" />
            Personal Operativo y Novedades — {proyectoSeleccionado} ({fechaFiltro})
          </h3>

          {cargando ? (
            <p className="text-center text-slate-500 py-8 text-sm">Consultando personal operativo...</p>
          ) : listaOrdenada.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">
              No hay asistencia registrada para {proyectoSeleccionado} en esta fecha.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {listaOrdenada.map((reg) => (
                <div
                  key={reg.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-blue-100 text-blue-800">
                        {reg.turno === 'DIURNO' || reg.turno === 'NOCTURNO'
                          ? reg.turno
                          : `${reg.turno} • GRP ${reg.grupo}`}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-teal-100 text-teal-800">
                        {reg.cargo || 'OFICIAL'}
                      </span>
                      <span className="font-bold text-sm text-slate-800">{reg.nombre_completo}</span>
                      <span className="text-xs font-mono text-slate-500">C.I. {reg.cedula}</span>
                      {reg.hora_entrada && reg.hora_entrada !== '--:--' && (
                        <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          Entrada: {reg.hora_entrada}
                        </span>
                      )}
                    </div>
                    {(reg.proyecto_apoyo || reg.observacion) && (
                      <p className="text-xs text-slate-600 mt-1">
                        {reg.proyecto_apoyo ? `Proyecto Relacionado: ${reg.proyecto_apoyo} • ` : ''}
                        {reg.observacion || ''}
                      </p>
                    )}
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-center ${
                      ESTATUS_ASISTENTES.includes(reg.estatus)
                        ? 'bg-emerald-100 text-emerald-800'
                        : reg.estatus === 'FALTA INJUSTIFICADA' || reg.estatus === 'BAJA POR SALUD'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {reg.estatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
