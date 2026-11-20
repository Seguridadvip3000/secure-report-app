import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import { leTocaGuardiaHoy } from '../utils/rotacionGuardia';
import {
  generarPDFAsistenciaDiaria,
  generarPDFInformeDiarioDirectiva,
} from '../utils/pdfAsistenciaDiaria';
import {
  Search,
  Calendar,
  Building2,
  ClipboardCheck,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileSpreadsheet,
  Edit3,
  Printer,
  Download,
  History,
} from 'lucide-react';

export default function AnalistaHome() {
  const { currentUser } = useAuth();
  const hoyLocal = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

  const rolActual = (currentUser?.role || '').toLowerCase();
  const puedeEditarHoraDirectiva = ['directiva', 'administrador', 'admin'].includes(rolActual);
  const esDirectivaOAdmin = ['directiva', 'administrador', 'admin'].includes(rolActual);
  const nombreAnalista = currentUser?.nombre_completo || currentUser?.username || 'Analista';

  const [pestana, setPestana] = useState<'ASISTENCIAS_PROYECTO' | 'CONSULTA_CEDULA'>('ASISTENCIAS_PROYECTO');
  const [listaProyectos, setListaProyectos] = useState<string[]>([]);

  const [proyectoFiltro, setProyectoFiltro] = useState<string>('TODOS');
  const [fechaDesdeAsist, setFechaDesdeAsist] = useState<string>(hoyLocal);
  const [fechaHastaAsist, setFechaHastaAsist] = useState<string>(hoyLocal);
  const [turnoFiltro, setTurnoFiltro] = useState<string>('TODOS');
  const [asistenciasProyecto, setAsistenciasProyecto] = useState<any[]>([]);
  const [auditoriaDia, setAuditoriaDia] = useState<any[]>([]);
  const [cargandoAsist, setCargandoAsist] = useState(false);

  const [registroEditando, setRegistroEditando] = useState<any | null>(null);
  const [nuevoEstatus, setNuevoEstatus] = useState<string>('PRESENTE');
  const [nuevoTurno, setNuevoTurno] = useState<string>('MIXTO');
  const [nuevaHoraEntrada, setNuevaHoraEntrada] = useState<string>('07:00 a. m.');
  const [nuevoProyectoApoyo, setNuevoProyectoApoyo] = useState<string>('');
  const [justificacionCambio, setJustificacionCambio] = useState<string>('');
  const [guardandoCambio, setGuardandoCambio] = useState(false);
  const [mensajeGlobal, setMensajeGlobal] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

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
      const horaCaracasStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Caracas',
        hour: '2-digit',
        hour12: false,
      }).format(new Date());
      const horaNum = Number(horaCaracasStr);

      // Si se consulta un proyecto y fecha específica post-09:00 AM, asegurar falta automática
      // ÚNICAMENTE para el personal al que le tocaba guardia ese día (rotación 24x48, 24x24 A/B y 12h)
      if (
        proyectoFiltro !== 'TODOS' &&
        fechaDesdeAsist === fechaHastaAsist &&
        (fechaDesdeAsist < hoyLocal || (fechaDesdeAsist === hoyLocal && horaNum >= 9))
      ) {
        const { data: activosProy } = await supabase
          .from('plantilla_proyectos')
          .select('*')
          .eq('proyecto', proyectoFiltro)
          .eq('estado', 'ACTIVO');

        const { data: existentesDia } = await supabase
          .from('asistencias_diarias_oficiales')
          .select('cedula')
          .eq('proyecto', proyectoFiltro)
          .eq('fecha', fechaDesdeAsist);

        const setExistentes = new Set(
          (existentesDia || []).map((e: any) => String(e.cedula).toUpperCase())
        );

        const faltantesAuto: any[] = [];
        (activosProy || []).forEach((of: any) => {
          const ced = String(of.cedula).toUpperCase();
          if (!setExistentes.has(ced) && leTocaGuardiaHoy(of.grupo, of.turno, fechaDesdeAsist)) {
            faltantesAuto.push({
              fecha: fechaDesdeAsist,
              proyecto: proyectoFiltro,
              proyecto_apoyo: null,
              cedula: ced,
              nombre_completo: `${of.apellidos}, ${of.nombres}`,
              cargo: of.cargo || 'OFICIAL',
              grupo: of.grupo,
              turno: of.turno || 'MIXTO',
              hora_entrada: '--:--',
              estatus: 'FALTA INJUSTIFICADA',
              observacion: 'Falta automática: sin registro antes de las 09:00 AM',
              registrado_por: 'SISTEMA (CIERRE 09:00 AM)',
            });
          }
        });

        if (faltantesAuto.length > 0) {
          await supabase
            .from('asistencias_diarias_oficiales')
            .upsert(faltantesAuto, { onConflict: 'fecha,proyecto,cedula,turno' });
        }
      }

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

      const { data, error } = await query.limit(400);
      if (error) throw error;
      setAsistenciasProyecto(data || []);

      let queryAud = supabase
        .from('auditoria_modificaciones_asistencia')
        .select('*')
        .gte('fecha', fechaDesdeAsist)
        .lte('fecha', fechaHastaAsist)
        .order('created_at', { ascending: false });

      if (proyectoFiltro !== 'TODOS') {
        queryAud = queryAud.eq('proyecto', proyectoFiltro);
      }
      const { data: audData } = await queryAud.limit(100);
      setAuditoriaDia(audData || []);
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
  const abrirModalEdicion = (reg: any) => {
    setMensajeGlobal(null);
    setRegistroEditando(reg);
    setNuevoEstatus(reg.estatus || 'PRESENTE');
    setNuevoTurno(reg.turno || 'MIXTO');
    setNuevaHoraEntrada(reg.hora_entrada || '07:00 a. m.');
    setNuevoProyectoApoyo(reg.proyecto_apoyo || '');
    setJustificacionCambio('');
  };

  const guardarModificacionAnalista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registroEditando) return;

    if (!justificacionCambio.trim()) {
      setMensajeGlobal({
        tipo: 'error',
        texto:
          nuevoEstatus === 'BAJA POR SALUD'
            ? '⚠️ Debe explicar obligatoriamente el porqué de la BAJA POR SALUD.'
            : '⚠️ Debe escribir obligatoriamente una observación que justifique la modificación.',
      });
      return;
    }

    const requiereDestino =
      nuevoEstatus === 'APOYO ENVIADO' ||
      nuevoEstatus === 'SERVICIO ESPECIAL ENVIADO' ||
      nuevoEstatus === 'APOYO RECIBIDO' ||
      nuevoEstatus === 'SERVICIO ESPECIAL RECIBIDO';

    if (requiereDestino && !nuevoProyectoApoyo.trim()) {
      setMensajeGlobal({
        tipo: 'error',
        texto: '⚠️ Debe seleccionar el proyecto relacionado para este movimiento.',
      });
      return;
    }

    setGuardandoCambio(true);
    try {
      const ahoraISO = new Date().toISOString();
      const sinHora = [
        'FALTA INJUSTIFICADA',
        'FALTA JUSTIFICADA',
        'VACACIONES',
        'DESCANSO',
        'BAJA POR SALUD',
      ].includes(nuevoEstatus);

      const horaFinal = sinHora
        ? '--:--'
        : puedeEditarHoraDirectiva
        ? nuevaHoraEntrada
        : registroEditando.hora_entrada && registroEditando.hora_entrada !== '--:--'
        ? registroEditando.hora_entrada
        : new Intl.DateTimeFormat('es-VE', {
            timeZone: 'America/Caracas',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }).format(new Date());

      const { error: errUpd } = await supabase
        .from('asistencias_diarias_oficiales')
        .update({
          estatus: nuevoEstatus,
          turno: nuevoTurno,
          hora_entrada: horaFinal,
          proyecto_apoyo: requiereDestino ? nuevoProyectoApoyo.trim() : null,
          observacion: `${registroEditando.observacion ? registroEditando.observacion + ' | ' : ''}[${nuevoEstatus} - ${nombreAnalista}: ${justificacionCambio.trim()}]`,
          modificado_por: nombreAnalista,
          modificado_at: ahoraISO,
          justificacion_modificacion: justificacionCambio.trim(),
          updated_at: ahoraISO,
        })
        .eq('id', registroEditando.id);

      if (errUpd) throw errUpd;

      await supabase.from('auditoria_modificaciones_asistencia').insert([
        {
          asistencia_id: registroEditando.id,
          fecha: registroEditando.fecha,
          proyecto: registroEditando.proyecto,
          cedula: registroEditando.cedula,
          nombre_completo: registroEditando.nombre_completo,
          estatus_anterior: registroEditando.estatus,
          estatus_nuevo: nuevoEstatus,
          turno_anterior: registroEditando.turno,
          turno_nuevo: nuevoTurno,
          hora_entrada_anterior: registroEditando.hora_entrada,
          hora_entrada_nueva: horaFinal,
          justificacion: justificacionCambio.trim(),
          modificado_por: nombreAnalista,
        },
      ]);

      setMensajeGlobal({
        tipo: 'exito',
        texto: `✅ Asistencia de ${registroEditando.nombre_completo} actualizada a ${nuevoEstatus} y auditada correctamente.`,
      });
      setRegistroEditando(null);
      setJustificacionCambio('');
      await consultarAsistenciasProyecto();
    } catch (err: any) {
      setMensajeGlobal({
        tipo: 'error',
        texto: 'Error guardando modificación: ' + (err?.message || 'Verifique conexión.'),
      });
    } finally {
      setGuardandoCambio(false);
    }
  };

  const exportarOImprimirAsistenciaProyecto = async (modo: 'DESCARGAR' | 'IMPRIMIR') => {
    if (proyectoFiltro === 'TODOS') {
      setMensajeGlobal({
        tipo: 'error',
        texto: '⚠️ Seleccione un Proyecto específico para generar o imprimir su Asistencia Diaria.',
      });
      return;
    }

    const { data: movsDia } = await supabase
      .from('movimientos_plantilla')
      .select('proyecto, tipo_movimiento, cedula, nombre_completo, proyecto_relacionado, observacion')
      .eq('proyecto', proyectoFiltro)
      .gte('created_at', `${fechaDesdeAsist}T00:00:00`)
      .lte('created_at', `${fechaHastaAsist}T23:59:59`);

    await generarPDFAsistenciaDiaria(
      {
        proyecto: proyectoFiltro,
        fecha:
          fechaDesdeAsist === fechaHastaAsist
            ? fechaDesdeAsist
            : `${fechaDesdeAsist} al ${fechaHastaAsist}`,
        registros: asistenciasProyecto,
        movimientosDia: movsDia || [],
        auditoriaModificaciones: auditoriaDia,
      },
      modo
    );
  };

  const descargarInformeDiarioSoloDirectiva = async () => {
    if (!esDirectivaOAdmin) return;

    let queryMovs = supabase
      .from('movimientos_plantilla')
      .select('proyecto, tipo_movimiento, cedula, nombre_completo, proyecto_relacionado, observacion')
      .gte('created_at', `${fechaDesdeAsist}T00:00:00`)
      .lte('created_at', `${fechaHastaAsist}T23:59:59`);

    if (proyectoFiltro !== 'TODOS') {
      queryMovs = queryMovs.eq('proyecto', proyectoFiltro);
    }

    const { data: movsDia } = await queryMovs;

    await generarPDFInformeDiarioDirectiva({
      proyecto: proyectoFiltro === 'TODOS' ? 'TODOS LOS PROYECTOS' : proyectoFiltro,
      fecha:
        fechaDesdeAsist === fechaHastaAsist
          ? fechaDesdeAsist
          : `${fechaDesdeAsist} al ${fechaHastaAsist}`,
      registros: asistenciasProyecto,
      movimientosDia: movsDia || [],
      auditoriaModificaciones: auditoriaDia,
    });
  };
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

      if (fechaDesdeCedula) queryMovs = queryMovs.gte('created_at', `${fechaDesdeCedula}T00:00:00`);
      if (fechaHastaCedula) queryMovs = queryMovs.lte('created_at', `${fechaHastaCedula}T23:59:59`);

      const { data: movsData, error: errMovs } = await queryMovs;
      if (errMovs) throw errMovs;

      let queryAsist = supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .ilike('cedula', `%${cedLimpia}%`)
        .order('fecha', { ascending: false });

      if (fechaDesdeCedula) queryAsist = queryAsist.gte('fecha', fechaDesdeCedula);
      if (fechaHastaCedula) queryAsist = queryAsist.lte('fecha', fechaHastaCedula);

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
        listaPlantilla.find((r: any) => r.estado === 'ACTIVO') || listaPlantilla.at(0) || null;

      const nombreEncontrado = fichaActiva
        ? `${fichaActiva.nombres} ${fichaActiva.apellidos}`
        : listaMovs.at(0)?.nombre_completo || listaAsist.at(0)?.nombre_completo || 'OFICIAL';

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
  const totalPresentes = asistenciasProyecto.filter(
    (a) => a.estatus === 'PRESENTE' || a.estatus === 'SERVICIO ESPECIAL PROPIO'
  ).length;
  const totalApoyos = asistenciasProyecto.filter((a) =>
    ['APOYO ENVIADO', 'APOYO RECIBIDO', 'SERVICIO ESPECIAL RECIBIDO', 'SERVICIO ESPECIAL ENVIADO'].includes(
      a.estatus
    )
  ).length;
  const totalFaltas = asistenciasProyecto.filter((a) => a.estatus === 'FALTA INJUSTIFICADA').length;
  const totalOtros = asistenciasProyecto.filter((a) =>
    ['REPOSO MEDICO', 'BAJA POR SALUD', 'VACACIONES', 'FALTA JUSTIFICADA', 'PERMISO', 'DESCANSO'].includes(
      a.estatus
    )
  ).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-teal-600">
        <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
          Módulo de Auditoría y Control de Personal
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
          <FileSpreadsheet className="text-teal-600" size={26} /> Panel de Auditoría y Control de Asistencia
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Control de guardia diaria por proyecto, edición auditada, descarga/impresión de PDFs y expediente por cédula.
        </p>
      </div>

      {mensajeGlobal && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-start gap-2 ${
            mensajeGlobal.tipo === 'exito'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {mensajeGlobal.tipo === 'exito' ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span>{mensajeGlobal.texto}</span>
        </div>
      )}

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
          <Search size={18} /> HISTORIAL DE OFICIAL POR CÉDULA
        </button>
      </div>

      {pestana === 'ASISTENCIAS_PROYECTO' ? (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <Clock size={14} /> Horario
                </label>
                <select
                  value={turnoFiltro}
                  onChange={(e) => setTurnoFiltro(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800"
                >
                  <option value="TODOS">TODOS LOS HORARIOS</option>
                  <option value="MIXTO">MIXTO (24x48)</option>
                  <option value="24X24">24X24</option>
                  <option value="DIURNO">DIURNO (12h)</option>
                  <option value="NOCTURNO">NOCTURNO (12h)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {proyectoFiltro === 'TODOS'
                  ? 'Seleccione un proyecto específico para exportar su Asistencia Diaria por Proyecto.'
                  : `Planilla lista: ASISTENCIA DE ${proyectoFiltro}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => exportarOImprimirAsistenciaProyecto('DESCARGAR')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={15} /> PDF Asistencia Diaria por Proyecto
                </button>
                <button
                  type="button"
                  onClick={() => exportarOImprimirAsistenciaProyecto('IMPRIMIR')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={15} /> Imprimir Asistencia
                </button>
                {esDirectivaOAdmin && (
                  <button
                    type="button"
                    onClick={descargarInformeDiarioSoloDirectiva}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-800 hover:bg-red-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={15} /> Informe Diario (Directiva)
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-emerald-600 uppercase">Presentes / Serv. Esp.</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{totalPresentes}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-amber-600 uppercase">Apoyos / Traslados</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{totalApoyos}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-red-600 uppercase">Faltas del Día</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{totalFaltas}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase">Salud / Vac. / F. Just.</div>
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
                    className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {reg.fecha}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800">
                          {reg.cargo || 'OFICIAL'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                          {reg.turno} • GRP {reg.grupo}
                        </span>
                        <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          Entrada: {reg.hora_entrada || '--:--'}
                        </span>
                        <span className="font-bold text-sm text-slate-800">{reg.nombre_completo}</span>
                        <span className="text-xs text-slate-500">(C.I. {reg.cedula})</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Proyecto: <strong>{reg.proyecto}</strong>
                        {reg.proyecto_apoyo ? (
                          <>
                            {' '}
                            • <span className="text-amber-700 font-semibold">Destino/Origen: {reg.proyecto_apoyo}</span>
                          </>
                        ) : null}
                        {reg.observacion ? ` • Obs: ${reg.observacion}` : ''}
                      </p>
                      {reg.modificado_por && (
                        <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                          ✏️ Modificado por {reg.modificado_por} el{' '}
                          {new Date(reg.modificado_at).toLocaleString('es-VE', { timeZone: 'America/Caracas' })} —
                          Justificación: {reg.justificacion_modificacion}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          reg.estatus === 'PRESENTE' || reg.estatus === 'SERVICIO ESPECIAL PROPIO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : reg.estatus.includes('APOYO') || reg.estatus.includes('SERVICIO ESPECIAL')
                            ? 'bg-amber-100 text-amber-800'
                            : reg.estatus === 'FALTA INJUSTIFICADA' || reg.estatus === 'BAJA POR SALUD'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {reg.estatus}
                      </span>

                      <button
                        type="button"
                        onClick={() => abrirModalEdicion(reg)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={13} /> Modificar Asistencia
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {auditoriaDia.length > 0 && (
            <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 space-y-2">
              <h3 className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                <History size={15} /> Bitácora de Modificaciones de Asistencia ({auditoriaDia.length})
              </h3>
              <div className="divide-y divide-amber-200/60">
                {auditoriaDia.map((aud) => (
                  <div key={aud.id} className="py-2 text-xs text-slate-700">
                    <strong>
                      [{new Date(aud.created_at).toLocaleString('es-VE', { timeZone: 'America/Caracas' })}]
                    </strong>{' '}
                    <strong>{aud.modificado_por}</strong> modificó a <strong>{aud.nombre_completo}</strong> ({aud.cedula}):{' '}
                    <span className="line-through text-red-700">{aud.estatus_anterior}</span> →{' '}
                    <span className="font-bold text-emerald-700">{aud.estatus_nuevo}</span>.{' '}
                    <span className="text-amber-900 font-semibold">Justificación: {aud.justificacion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Período Desde</label>
                <input
                  type="date"
                  value={fechaDesdeCedula}
                  onChange={(e) => setFechaDesdeCedula(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Período Hasta</label>
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
                {buscandoCedula ? 'Consultando...' : 'Consultar Historial por Cédula'}
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
                          • Cargo: <strong>{resultadoCedula.fichaActual.cargo || 'OFICIAL'}</strong> • Proyecto:{' '}
                          <strong>{resultadoCedula.fichaActual.proyecto}</strong> • Grupo{' '}
                          <strong>{resultadoCedula.fichaActual.grupo}</strong> • Horario{' '}
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
                      {
                        resultadoCedula.asistencias.filter(
                          (a) => a.estatus === 'PRESENTE' || a.estatus === 'SERVICIO ESPECIAL PROPIO'
                        ).length
                      }
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 uppercase">Apoyos / Serv. Esp.</div>
                    <div className="text-xl font-black text-amber-700">
                      {
                        resultadoCedula.asistencias.filter((a) =>
                          [
                            'APOYO ENVIADO',
                            'APOYO RECIBIDO',
                            'SERVICIO ESPECIAL RECIBIDO',
                            'SERVICIO ESPECIAL ENVIADO',
                          ].includes(a.estatus)
                        ).length
                      }
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 uppercase">Traslados</div>
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
                    <div className="text-xs font-bold text-slate-500 uppercase">Faltas / Salud / Vac.</div>
                    <div className="text-xl font-black text-red-700">
                      {
                        resultadoCedula.asistencias.filter((a) =>
                          ['FALTA INJUSTIFICADA', 'REPOSO MEDICO', 'BAJA POR SALUD', 'VACACIONES'].includes(
                            a.estatus
                          )
                        ).length
                      }
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ArrowRightLeft size={18} className="text-teal-600" /> Movimientos de Plantilla (
                  {resultadoCedula.movimientos.length})
                </h3>
                {resultadoCedula.movimientos.map((mov) => (
                  <div key={mov.id} className="py-2.5 border-b border-slate-100 text-xs flex justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-800">{mov.tipo_movimiento}</span> ({mov.cargo || 'OFICIAL'} •{' '}
                      {mov.turno || 'MIXTO'}) • <strong>{mov.proyecto}</strong>
                      {mov.proyecto_relacionado ? ` ↔ ${mov.proyecto_relacionado}` : ''}
                      {mov.observacion ? ` • ${mov.observacion}` : ''}
                    </div>
                    <span className="text-slate-400">{new Date(mov.created_at).toLocaleString('es-VE')}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CheckCircle2 size={18} className="text-blue-600" /> Asistencias y Apoyos (
                  {resultadoCedula.asistencias.length})
                </h3>
                {resultadoCedula.asistencias.map((asist) => (
                  <div key={asist.id} className="py-2.5 border-b border-slate-100 text-xs flex justify-between gap-2">
                    <div>
                      <strong>{asist.fecha}</strong> • Entrada: <strong>{asist.hora_entrada || '--:--'}</strong> •{' '}
                      <strong>{asist.proyecto}</strong> ({asist.cargo || 'OFICIAL'} • {asist.turno})
                      {asist.proyecto_apoyo ? ` → ${asist.proyecto_apoyo}` : ''}
                      {asist.observacion ? ` • ${asist.observacion}` : ''}
                    </div>
                    <span className="font-bold text-slate-800">{asist.estatus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {registroEditando && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={guardarModificacionAnalista}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-800">Modificar Asistencia (Auditoría)</h3>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Oficial: <strong>{registroEditando.nombre_completo}</strong> ({registroEditando.cedula})
              <br />
              Proyecto: <strong>{registroEditando.proyecto}</strong> • Fecha: <strong>{registroEditando.fecha}</strong>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nuevo Estatus *</label>
                <select
                  value={nuevoEstatus}
                  onChange={(e) => setNuevoEstatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="PRESENTE">PRESENTE</option>
                  <option value="SERVICIO ESPECIAL PROPIO">SERVICIO ESPECIAL PROPIO</option>
                  <option value="SERVICIO ESPECIAL RECIBIDO">SERVICIO ESPECIAL RECIBIDO</option>
                  <option value="SERVICIO ESPECIAL ENVIADO">SERVICIO ESPECIAL ENVIADO</option>
                  <option value="APOYO RECIBIDO">APOYO RECIBIDO</option>
                  <option value="APOYO ENVIADO">APOYO ENVIADO</option>
                  <option value="BAJA POR SALUD">BAJA POR SALUD</option>
                  <option value="VACACIONES">VACACIONES</option>
                  <option value="FALTA JUSTIFICADA">FALTA JUSTIFICADA</option>
                  <option value="FALTA INJUSTIFICADA">FALTA INJUSTIFICADA</option>
                  <option value="REPOSO MEDICO">REPOSO MÉDICO</option>
                  <option value="PERMISO">PERMISO</option>
                  <option value="DESCANSO">DESCANSO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Horario *</label>
                <select
                  value={nuevoTurno}
                  onChange={(e) => setNuevoTurno(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="MIXTO">MIXTO (24x48)</option>
                  <option value="24X24">24X24</option>
                  <option value="DIURNO">DIURNO (12h)</option>
                  <option value="NOCTURNO">NOCTURNO (12h)</option>
                </select>
              </div>
            </div>
            {puedeEditarHoraDirectiva && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Hora de Entrada (Solo Directiva/Admin)
                </label>
                <input
                  type="text"
                  value={nuevaHoraEntrada}
                  onChange={(e) => setNuevaHoraEntrada(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            )}

            {['APOYO ENVIADO', 'SERVICIO ESPECIAL ENVIADO', 'APOYO RECIBIDO', 'SERVICIO ESPECIAL RECIBIDO'].includes(
              nuevoEstatus
            ) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Proyecto Origen / Destino *
                </label>
                <select
                  required
                  value={nuevoProyectoApoyo}
                  onChange={(e) => setNuevoProyectoApoyo(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  <option value="">-- Seleccione Proyecto --</option>
                  {listaProyectos
                    .filter((p) => p !== registroEditando.proyecto)
                    .map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-red-700 uppercase mb-1">
                {nuevoEstatus === 'BAJA POR SALUD'
                  ? 'Motivo / Diagnóstico de la Baja por Salud * (Obligatorio)'
                  : 'Observación / Justificación de la Modificación * (Obligatoria)'}
              </label>
              <textarea
                required
                rows={3}
                value={justificacionCambio}
                onChange={(e) => setJustificacionCambio(e.target.value)}
                placeholder={
                  nuevoEstatus === 'BAJA POR SALUD'
                    ? 'Explique obligatoriamente el porqué de la baja por salud...'
                    : 'Explique obligatoriamente el motivo de esta corrección...'
                }
                className="w-full border border-red-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRegistroEditando(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoCambio || !justificacionCambio.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guardandoCambio ? 'Guardando...' : 'Guardar Modificación'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
