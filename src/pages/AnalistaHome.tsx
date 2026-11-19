import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import {
  Search,
  Calendar,
  Building2,
  ClipboardCheck,
  UserSearch,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';

export default function AnalistaHome() {
  const hoyLocal = new Date().toLocaleDateString('en-CA');

  const [pestana, setPestana] = useState<'ASISTENCIAS_PROYECTO' | 'CONSULTA_CEDULA'>('ASISTENCIAS_PROYECTO');
  const [listaProyectos, setListaProyectos] = useState<string[]>([]);

  const [proyectoFiltro, setProyectoFiltro] = useState<string>('TODOS');
  const [fechaDesdeAsist, setFechaDesdeAsist] = useState<string>(hoyLocal);
  const [fechaHastaAsist, setFechaHastaAsist] = useState<string>(hoyLocal);
  const [turnoFiltro, setTurnoFiltro] = useState<string>('TODOS');
  const [asistenciasProyecto, setAsistenciasProyecto] = useState<any[]>([]);
  const [cargandoAsist, setCargandoAsist] = useState(false);

  const [cedulaBusqueda, setCedulaBusqueda] = useState<string>('');
  const [fechaDesdeCedula, setFechaDesdeCedula] = useState<string>('');
  const [fechaHastaCedula, setFechaHastaCedula] = useState<string>('');
  const [buscandoCedula, setBuscandoCedula] = useState(false);
  const [resultadoCedula, setResultadoCedula] = useState<{
    cedula: string;
    nombreCompleto: string;
    fichaActual: any | null;
    movimientos: any[];
    asistencias: any[];
  } | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

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
      setListaProyectos(Array.from(setProy).sort());
    };
    cargarProyectos();
  }, []);
  const consultarAsistenciasProyecto = async () => {
    setCargandoAsist(true);
    try {
      let query = supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .gte('fecha', fechaDesdeAsist)
        .lte('fecha', fechaHastaAsist)
        .order('fecha', { ascending: false })
        .order('proyecto', { ascending: true })
        .order('nombre_completo', { ascending: true });

      if (proyectoFiltro !== 'TODOS') {
        query = query.eq('proyecto', proyectoFiltro);
      }
      if (turnoFiltro !== 'TODOS') {
        query = query.eq('turno', turnoFiltro);
      }

      const { data, error } = await query.limit(300);
      if (error) throw error;
      setAsistenciasProyecto(data || []);
    } catch (err) {
      console.error('Error consultando asistencias:', err);
    } finally {
      setCargandoAsist(false);
    }
  };

  useEffect(() => {
    if (pestana === 'ASISTENCIAS_PROYECTO') {
      consultarAsistenciasProyecto();
    }
  }, [pestana, proyectoFiltro, fechaDesdeAsist, fechaHastaAsist, turnoFiltro]);

  const consultarExpedientePorCedula = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorBusqueda(null);

    const cedLimpia = cedulaBusqueda.trim().toUpperCase();
    if (!cedLimpia) {
      setErrorBusqueda('Ingrese un número de cédula para consultar el historial.');
      return;
    }

    setBuscandoCedula(true);
    try {
      const { data: registrosPlantilla, error: errPlant } = await supabase
        .from('plantilla_proyectos')
        .select('*')
        .ilike('cedula', `%${cedLimpia}%`)
        .order('created_at', { ascending: false });

      if (errPlant) throw errPlant;

      let queryMovs = supabase
        .from('movimientos_plantilla')
        .select('*')
        .ilike('cedula', `%${cedLimpia}%`)
        .order('created_at', { ascending: false });

      if (fechaDesdeCedula) {
        queryMovs = queryMovs.gte('created_at', `${fechaDesdeCedula}T00:00:00`);
      }
      if (fechaHastaCedula) {
        queryMovs = queryMovs.lte('created_at', `${fechaHastaCedula}T23:59:59`);
      }

      const { data: movsData, error: errMovs } = await queryMovs;
      if (errMovs) throw errMovs;

      let queryAsist = supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .ilike('cedula', `%${cedLimpia}%`)
        .order('fecha', { ascending: false });

      if (fechaDesdeCedula) {
        queryAsist = queryAsist.gte('fecha', fechaDesdeCedula);
      }
      if (fechaHastaCedula) {
        queryAsist = queryAsist.lte('fecha', fechaHastaCedula);
      }

      const { data: asistData, error: errAsist } = await queryAsist;
      if (errAsist) throw errAsist;

      const listaPlantilla = Array.isArray(registrosPlantilla) ? registrosPlantilla : [];
      const listaMovs = Array.isArray(movsData) ? movsData : [];
      const listaAsist = Array.isArray(asistData) ? asistData : [];

      if (listaPlantilla.length === 0 && listaMovs.length === 0 && listaAsist.length === 0) {
        setResultadoCedula(null);
        setErrorBusqueda(`No se encontraron registros asociados a la cédula "${cedLimpia}".`);
        return;
      }

      const fichaActiva =
        listaPlantilla.find((r: any) => r.estado === 'ACTIVO') ||
        listaPlantilla.at(0) ||
        null;

      const nombreEncontrado = fichaActiva
        ? `${fichaActiva.nombres} ${fichaActiva.apellidos}`
        : listaMovs.at(0)?.nombre_completo ||
          listaAsist.at(0)?.nombre_completo ||
          'OFICIAL';

      setResultadoCedula({
        cedula: fichaActiva?.cedula || cedLimpia,
        nombreCompleto: nombreEncontrado,
        fichaActual: fichaActiva,
        movimientos: listaMovs,
        asistencias: listaAsist,
      });
    } catch (err: any) {
      setErrorBusqueda('Error consultando expediente: ' + (err?.message || 'Verifique conexión.'));
    } finally {
      setBuscandoCedula(false);
    }
  };
  const totalPresentes = asistenciasProyecto.filter((a) => a.estatus === 'PRESENTE').length;
  const totalApoyos = asistenciasProyecto.filter(
    (a) => a.estatus === 'APOYO PRESTADO' || a.estatus === 'APOYO RECIBIDO'
  ).length;
  const totalFaltas = asistenciasProyecto.filter((a) => a.estatus === 'FALTA INJUSTIFICADA').length;
  const totalOtros = asistenciasProyecto.filter((a) =>
    ['REPOSO MEDICO', 'PERMISO', 'DESCANSO'].includes(a.estatus)
  ).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-teal-600">
        <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
          Módulo de Auditoría y Control de Personal
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
          <FileSpreadsheet className="text-teal-600" size={26} /> Panel del Analista de Operaciones
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Consulta de asistencias diarias por proyecto y trazabilidad histórica por cédula de identidad.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={() => setPestana('ASISTENCIAS_PROYECTO')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            pestana === 'ASISTENCIAS_PROYECTO'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardCheck size={18} /> ASISTENCIAS DIARIAS POR PROYECTO
        </button>

        <button
          type="button"
          onClick={() => setPestana('CONSULTA_CEDULA')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            pestana === 'CONSULTA_CEDULA'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserSearch size={18} /> HISTORIAL DE OFICIAL POR CÉDULA
        </button>
      </div>

      {pestana === 'ASISTENCIAS_PROYECTO' ? (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                <Building2 size={14} /> Proyecto
              </label>
              <select
                value={proyectoFiltro}
                onChange={(e) => setProyectoFiltro(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800"
              >
                <option value="TODOS">TODOS LOS PROYECTOS</option>
                {listaProyectos.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                <Calendar size={14} /> Desde
              </label>
              <input
                type="date"
                value={fechaDesdeAsist}
                onChange={(e) => setFechaDesdeAsist(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                <Calendar size={14} /> Hasta
              </label>
              <input
                type="date"
                value={fechaHastaAsist}
                onChange={(e) => setFechaHastaAsist(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                <Clock size={14} /> Turno
              </label>
              <select
                value={turnoFiltro}
                onChange={(e) => setTurnoFiltro(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800"
              >
                <option value="TODOS">TODOS LOS TURNOS</option>
                <option value="MIXTO">MIXTO</option>
                <option value="DIURNO">DIURNO</option>
                <option value="NOCTURNO">NOCTURNO</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-emerald-600 uppercase">Presentes</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{totalPresentes}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-amber-600 uppercase">Apoyos</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{totalApoyos}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-red-600 uppercase">Faltas Injust.</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{totalFaltas}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Reposo / Perm. / Lib.</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{totalOtros}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            {cargandoAsist ? (
              <p className="text-center text-slate-500 py-8 text-sm">Consultando registros de asistencia...</p>
            ) : asistenciasProyecto.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">
                No hay asistencias registradas para los filtros seleccionados.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {asistenciasProyecto.map((reg) => (
                  <div
                    key={reg.id}
                    className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {reg.fecha}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                          GRUPO {reg.grupo}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-white">
                          {reg.turno}
                        </span>
                        <span className="font-bold text-sm text-slate-800">{reg.nombre_completo}</span>
                        <span className="text-xs text-slate-500">(C.I. {reg.cedula})</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Proyecto: <strong>{reg.proyecto}</strong>
                        {reg.proyecto_apoyo ? (
                          <>
                            {' '}
                            •{' '}
                            <span className="text-amber-700 font-semibold">
                              {reg.estatus === 'APOYO PRESTADO'
                                ? `Apoyo prestado en: ${reg.proyecto_apoyo}`
                                : `Recibido desde: ${reg.proyecto_apoyo}`}
                            </span>
                          </>
                        ) : null}
                        {reg.observacion ? ` • Obs: ${reg.observacion}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          reg.estatus === 'PRESENTE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : reg.estatus.includes('APOYO')
                            ? 'bg-amber-100 text-amber-800'
                            : reg.estatus === 'FALTA INJUSTIFICADA'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {reg.estatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <form
            onSubmit={consultarExpedientePorCedula}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Cédula de Identidad del Oficial *
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={cedulaBusqueda}
                    onChange={(e) => setCedulaBusqueda(e.target.value)}
                    placeholder="Ej: V-20123456 o 20123456"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Período Desde (Opcional)
                </label>
                <input
                  type="date"
                  value={fechaDesdeCedula}
                  onChange={(e) => setFechaDesdeCedula(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Período Hasta (Opcional)
                </label>
                <input
                  type="date"
                  value={fechaHastaCedula}
                  onChange={(e) => setFechaHastaCedula(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setFechaDesdeCedula('');
                  setFechaHastaCedula('');
                }}
                className="text-xs text-slate-500 underline cursor-pointer"
              >
                Limpiar filtro de fechas (Ver todo desde su ingreso)
              </button>

              <button
                type="submit"
                disabled={buscandoCedula}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {buscandoCedula ? 'Consultando expediente...' : 'Consultar Historial por Cédula'}
              </button>
            </div>
          </form>

          {errorBusqueda && (
            <div className="p-4 rounded-xl text-sm border bg-red-50 border-red-200 text-red-800 flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{errorBusqueda}</span>
            </div>
          )}

          {resultadoCedula && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-teal-600 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-teal-600 uppercase">Expediente Individual</span>
                    <h2 className="text-xl font-bold text-slate-800">{resultadoCedula.nombreCompleto}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cédula: <strong>{resultadoCedula.cedula}</strong>
                      {resultadoCedula.fichaActual && (
                        <>
                          {' '}
                          • Proyecto Actual / Último: <strong>{resultadoCedula.fichaActual.proyecto}</strong> • Grupo{' '}
                          <strong>{resultadoCedula.fichaActual.grupo}</strong> • Turno{' '}
                          <strong>{resultadoCedula.fichaActual.turno || 'MIXTO'}</strong>
                        </>
                      )}
                    </p>
                  </div>

                  {resultadoCedula.fichaActual && (
                    <span
                      className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase self-start ${
                        resultadoCedula.fichaActual.estado === 'ACTIVO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      ESTATUS: {resultadoCedula.fichaActual.estado}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 uppercase">Guardias Presente</div>
                    <div className="text-xl font-black text-emerald-700">
                      {resultadoCedula.asistencias.filter((a) => a.estatus === 'PRESENTE').length}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 uppercase">Apoyos en Otros Serv.</div>
                    <div className="text-xl font-black text-amber-700">
                      {
                        resultadoCedula.asistencias.filter(
                          (a) => a.estatus === 'APOYO PRESTADO' || a.estatus === 'APOYO RECIBIDO'
                        ).length
                      }
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 uppercase">Traslados Registrados</div>
                    <div className="text-xl font-black text-blue-700">
                      {
                        resultadoCedula.movimientos.filter(
                          (m) =>
                            m.tipo_movimiento === 'TRASLADO ENVIADO' ||
                            m.tipo_movimiento === 'TRASLADO RECIBIDO'
                        ).length
                      }
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 uppercase">Faltas / Reposos</div>
                    <div className="text-xl font-black text-red-700">
                      {
                        resultadoCedula.asistencias.filter((a) =>
                          ['FALTA INJUSTIFICADA', 'REPOSO MEDICO'].includes(a.estatus)
                        ).length
                      }
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ArrowRightLeft size={18} className="text-teal-600" /> Historial de Ingresos, Traslados y Egresos (
                  {resultadoCedula.movimientos.length})
                </h3>
                {resultadoCedula.movimientos.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No hay movimientos de plantilla en este período.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {resultadoCedula.movimientos.map((mov) => {
                      const esAlta =
                        mov.tipo_movimiento === 'NUEVO INGRESO' || mov.tipo_movimiento === 'TRASLADO RECIBIDO';
                      return (
                        <div key={mov.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  esAlta ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {mov.tipo_movimiento}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-white">
                                {mov.turno || 'MIXTO'}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                Proyecto: <strong>{mov.proyecto}</strong> (Grupo {mov.grupo})
                              </span>
                            </div>
                            {mov.proyecto_relacionado && (
                              <p className="text-xs text-slate-600 mt-1">
                                {esAlta ? 'Proveniente de:' : 'Trasladado hacia:'}{' '}
                                <strong>{mov.proyecto_relacionado}</strong>
                              </p>
                            )}
                            {mov.observacion && (
                              <p className="text-xs text-slate-500 mt-0.5">Motivo / Detalle: {mov.observacion}</p>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 text-right">
                            <div>{new Date(mov.created_at).toLocaleString('es-VE')}</div>
                            <div>Registró: {mov.registrado_por}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CheckCircle2 size={18} className="text-blue-600" /> Historial de Asistencias Diarias y Apoyos Prestados (
                  {resultadoCedula.asistencias.length})
                </h3>
                {resultadoCedula.asistencias.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No hay asistencias diarias registradas en este período.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {resultadoCedula.asistencias.map((asist) => (
                      <div key={asist.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {asist.fecha}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-white">
                              {asist.turno}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                              Servicio Base: <strong>{asist.proyecto}</strong> (Grupo {asist.grupo})
                            </span>
                          </div>
                          {asist.proyecto_apoyo && (
                            <p className="text-xs text-amber-800 font-semibold mt-1">
                              {asist.estatus === 'APOYO PRESTADO'
                                ? `🔄 Apoyo prestado en el servicio: ${asist.proyecto_apoyo}`
                                : `🔄 Apoyo recibido desde: ${asist.proyecto_apoyo}`}
                            </p>
                          )}
                          {asist.observacion && (
                            <p className="text-xs text-slate-500 mt-0.5">Obs: {asist.observacion}</p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-center ${
                            asist.estatus === 'PRESENTE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : asist.estatus.includes('APOYO')
                              ? 'bg-amber-100 text-amber-800'
                              : asist.estatus === 'FALTA INJUSTIFICADA'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {asist.estatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
