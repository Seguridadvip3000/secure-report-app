import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import {
  generarPDFAsistenciaDiaria,
  generarPDFInformeDiarioDirectiva,
  ordenarRegistrosAsistencia,
  DatosInformeDiarioPDF,
} from '../utils/pdfAsistenciaDiaria';
import {
  Search,
  ClipboardList,
  UserCheck,
  Building2,
  Calendar,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Edit3,
  History,
  Clock,
  Users,
} from 'lucide-react';

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

export default function AnalistaHome() {
  const { currentUser } = useAuth();
  const hoyLocal = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

  const rolActual = (currentUser?.role || '').toLowerCase();
  const esDirectivaOAdmin = ['directiva', 'admin', 'directivo'].includes(rolActual);
  const puedeEditarHoraDirectiva = ['directiva', 'admin', 'directivo'].includes(rolActual);
  const nombreAnalista = currentUser?.nombre_completo || currentUser?.username || 'Analista';

  const [pestana, setPestana] = useState<'ASISTENCIAS_PROYECTO' | 'PLANTILLA_PROYECTO' | 'HISTORIAL_CEDULA'>(
    'ASISTENCIAS_PROYECTO'
  );
  const [listaProyectos, setListaProyectos] = useState<string[]>([]);

  const [proyectoFiltro, setProyectoFiltro] = useState<string>('TODOS');
  const [fechaDesdeAsist, setFechaDesdeAsist] = useState<string>(hoyLocal);
  const [fechaHastaAsist, setFechaHastaAsist] = useState<string>(hoyLocal);
  const [turnoFiltro, setTurnoFiltro] = useState<string>('TODOS');
  const [asistenciasProyecto, setAsistenciasProyecto] = useState<any[]>([]);
  const [auditoriaDia, setAuditoriaDia] = useState<any[]>([]);
  const [liderActivoPorQR, setLiderActivoPorQR] = useState<boolean>(false);
  const [cargandoAsist, setCargandoAsist] = useState(false);

  // Pestaña Plantilla por Proyecto (A / B / C)
  const [proyectoPlantilla, setProyectoPlantilla] = useState<string>('');
  const [plantillaProyectoList, setPlantillaProyectoList] = useState<any[]>([]);
  const [filtroHorarioPlantilla, setFiltroHorarioPlantilla] = useState<'MIXTO' | '24X24' | 'DIURNO_NOCTURNO'>('MIXTO');
  const [grupoDesplegadoAnalista, setGrupoDesplegadoAnalista] = useState<'A' | 'B' | 'C'>('B');
  const [oficialEditandoFechaTab, setOficialEditandoFechaTab] = useState<any | null>(null);
  const [fechaIngresoTabInput, setFechaIngresoTabInput] = useState<string>(hoyLocal);
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false);

  // Modal Modificar Asistencia
  const [registroEditando, setRegistroEditando] = useState<any | null>(null);
  const [nuevoEstatus, setNuevoEstatus] = useState<string>('PRESENTE');
  const [nuevoTurno, setNuevoTurno] = useState<string>('MIXTO');
  const [nuevaHoraEntrada, setNuevaHoraEntrada] = useState<string>('');
  const [nuevoProyectoApoyo, setNuevoProyectoApoyo] = useState<string>('');
  const [justificacionCambio, setJustificacionCambio] = useState<string>('');
  const [guardandoCambio, setGuardandoCambio] = useState(false);

  // Pestaña Historial por Cédula
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [fechaDesdeCedula, setFechaDesdeCedula] = useState('');
  const [fechaHastaCedula, setFechaHastaCedula] = useState('');
  const [buscandoCedula, setBuscandoCedula] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [editandoFechaIngresoAnalista, setEditandoFechaIngresoAnalista] = useState(false);
  const [fechaIngresoAnalistaInput, setFechaIngresoAnalistaInput] = useState(hoyLocal);
  const [resultadoCedula, setResultadoCedula] = useState<{
    cedula: string;
    nombreCompleto: string;
    fichaActual: any | null;
    movimientos: any[];
    asistencias: any[];
  } | null>(null);

  const [mensajeGlobal, setMensajeGlobal] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
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
      if (ordenados.length > 0 && !proyectoPlantilla) {
        setProyectoPlantilla(ordenados.at(0) || '');
      }
    };
    cargarProyectos();
  }, []);

  const verificarLiderPorQR = async (proyecto: string, fechaRef: string) => {
    if (!proyecto || proyecto === 'TODOS') {
      setLiderActivoPorQR(false);
      return;
    }
    try {
      const { data: logsHoy } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('project_name', proyecto)
        .gte('created_at', `${fechaRef}T00:00:00`)
        .lte('created_at', `${fechaRef}T23:59:59`)
        .order('created_at', { ascending: true });

      const listaLogs = Array.isArray(logsHoy) ? logsHoy : [];
      if (listaLogs.length === 0) {
        setLiderActivoPorQR(false);
        return;
      }
      const ultimoLog = listaLogs.at(-1);
      const tipoEvento = String(
        ultimoLog?.type || ultimoLog?.event_type || ultimoLog?.action || ultimoLog?.tipo || ''
      ).toUpperCase();
      setLiderActivoPorQR(
        !(tipoEvento.includes('SALIDA') || tipoEvento.includes('OUT') || tipoEvento.includes('EXIT'))
      );
    } catch {
      setLiderActivoPorQR(false);
    }
  };

  const consultarAsistencias = async () => {
    setCargandoAsist(true);
    try {
      let query = supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .gte('fecha', fechaDesdeAsist)
        .lte('fecha', fechaHastaAsist);

      if (proyectoFiltro !== 'TODOS') query = query.eq('proyecto', proyectoFiltro);
      if (turnoFiltro !== 'TODOS') query = query.eq('turno', turnoFiltro);

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      setAsistenciasProyecto(Array.isArray(data) ? data : []);

      await verificarLiderPorQR(proyectoFiltro, fechaDesdeAsist);

      let qAud = supabase
        .from('auditoria_modificaciones_asistencia')
        .select('*')
        .gte('fecha', fechaDesdeAsist)
        .lte('fecha', fechaHastaAsist)
        .order('created_at', { ascending: false });

      if (proyectoFiltro !== 'TODOS') qAud = qAud.eq('proyecto', proyectoFiltro);
      const { data: dataAud } = await qAud.limit(100);
      setAuditoriaDia(Array.isArray(dataAud) ? dataAud : []);
    } catch (err) {
      console.error('Error consultando asistencias:', err);
    } finally {
      setCargandoAsist(false);
    }
  };

  const consultarPlantillaProyecto = async (proy: string) => {
    if (!proy) return;
    setCargandoPlantilla(true);
    try {
      const { data, error } = await supabase
        .from('plantilla_proyectos')
        .select('*')
        .eq('proyecto', proy)
        .eq('estado', 'ACTIVO')
        .order('apellidos', { ascending: true });

      if (error) throw error;
      setPlantillaProyectoList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error consultando plantilla:', err);
    } finally {
      setCargandoPlantilla(false);
    }
  };

  useEffect(() => {
    if (pestana === 'ASISTENCIAS_PROYECTO') {
      consultarAsistencias();
    }
  }, [proyectoFiltro, fechaDesdeAsist, fechaHastaAsist, turnoFiltro, pestana]);

  useEffect(() => {
    if (pestana === 'PLANTILLA_PROYECTO' && proyectoPlantilla) {
      consultarPlantillaProyecto(proyectoPlantilla);
    }
  }, [proyectoPlantilla, pestana]);
  const guardarFechaIngresoDesdePlantilla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oficialEditandoFechaTab || !fechaIngresoTabInput) return;

    setGuardandoCambio(true);
    try {
      const fechaISO = `${fechaIngresoTabInput}T07:00:00-04:00`;
      const { error } = await supabase
        .from('plantilla_proyectos')
        .update({
          fecha_ingreso: fechaISO,
          updated_at: new Date().toISOString(),
        })
        .eq('id', oficialEditandoFechaTab.id);

      if (error) throw error;

      setMensajeGlobal({
        tipo: 'exito',
        texto: `✅ Fecha de ingreso de ${oficialEditandoFechaTab.nombres} ${oficialEditandoFechaTab.apellidos} actualizada a ${fechaIngresoTabInput}.`,
      });
      setOficialEditandoFechaTab(null);
      await consultarPlantillaProyecto(proyectoPlantilla);
    } catch (err: any) {
      setMensajeGlobal({ tipo: 'error', texto: 'Error guardando fecha: ' + (err?.message || 'Error.') });
    } finally {
      setGuardandoCambio(false);
    }
  };

  const abrirModalEdicion = (reg: any) => {
    setMensajeGlobal(null);
    setRegistroEditando(reg);
    setNuevoEstatus(reg.estatus);
    setNuevoTurno(reg.turno || 'MIXTO');
    setNuevaHoraEntrada(reg.hora_entrada || '07:00 AM');
    setNuevoProyectoApoyo(reg.proyecto_apoyo || '');
    setJustificacionCambio('');
  };

  const guardarModificacionAnalista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registroEditando) return;

    if (!justificacionCambio.trim()) {
      setMensajeGlobal({
        tipo: 'error',
        texto: '⚠️ Debe escribir obligatoriamente el motivo o justificación de la modificación.',
      });
      return;
    }

    const requiereProyectoRel = [
      'APOYO ENVIADO',
      'SERVICIO ESPECIAL ENVIADO',
      'APOYO RECIBIDO',
      'SERVICIO ESPECIAL RECIBIDO',
    ].includes(nuevoEstatus);

    if (requiereProyectoRel && !nuevoProyectoApoyo.trim()) {
      setMensajeGlobal({
        tipo: 'error',
        texto: `⚠️ Debe seleccionar el Proyecto Origen/Destino para ${nuevoEstatus}.`,
      });
      return;
    }

    setGuardandoCambio(true);
    try {
      const ahora = new Date().toISOString();
      const justifLimpia = justificacionCambio.trim();
      const proyRel = requiereProyectoRel ? nuevoProyectoApoyo.trim() : null;
      const horaFinal = puedeEditarHoraDirectiva ? nuevaHoraEntrada.trim() : registroEditando.hora_entrada;

      const { error: errUpd } = await supabase
        .from('asistencias_diarias_oficiales')
        .update({
          estatus: nuevoEstatus,
          turno: nuevoTurno,
          hora_entrada: horaFinal,
          proyecto_apoyo: proyRel,
          modificado_por: nombreAnalista,
          modificado_at: ahora,
          justificacion_modificacion: justifLimpia,
          updated_at: ahora,
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
          justificacion: justifLimpia,
          modificado_por: nombreAnalista,
        },
      ]);

      setMensajeGlobal({
        tipo: 'exito',
        texto: `✅ Asistencia de ${registroEditando.nombre_completo} modificada a ${nuevoEstatus} y registrada en auditoría.`,
      });
      setRegistroEditando(null);
      await consultarAsistencias();
    } catch (err: any) {
      setMensajeGlobal({
        tipo: 'error',
        texto: 'Error al guardar modificación: ' + (err?.message || 'Error de conexión.'),
      });
    } finally {
      setGuardandoCambio(false);
    }
  };
  const prepararYGenerarPDF = async (tipo: 'ASISTENCIA' | 'IMPRIMIR' | 'INFORME_DIRECTIVA') => {
    try {
      let qMovs = supabase
        .from('movimientos_plantilla')
        .select('*')
        .gte('created_at', `${fechaDesdeAsist}T00:00:00`)
        .lte('created_at', `${fechaHastaAsist}T23:59:59`);

      if (proyectoFiltro !== 'TODOS') qMovs = qMovs.eq('proyecto', proyectoFiltro);
      const { data: movsDia } = await qMovs;

      const etiquetaFecha =
        fechaDesdeAsist === fechaHastaAsist
          ? fechaDesdeAsist
          : `${fechaDesdeAsist} al ${fechaHastaAsist}`;

      const datosPDF: DatosInformeDiarioPDF = {
        proyecto: proyectoFiltro === 'TODOS' ? 'TODOS LOS PROYECTOS' : proyectoFiltro,
        fecha: etiquetaFecha,
        registros: asistenciasProyecto,
        movimientosDia: Array.isArray(movsDia) ? movsDia : [],
        auditoriaModificaciones: auditoriaDia,
      };

      if (tipo === 'INFORME_DIRECTIVA') {
        await generarPDFInformeDiarioDirectiva(datosPDF);
      } else {
        await generarPDFAsistenciaDiaria(datosPDF, tipo === 'IMPRIMIR' ? 'IMPRIMIR' : 'DESCARGAR');
      }
    } catch (err: any) {
      setMensajeGlobal({ tipo: 'error', texto: 'Error generando PDF: ' + (err?.message || 'Error.') });
    }
  };

  const consultarExpedientePorCedula = async (e: React.FormEvent) => {
    e.preventDefault();
    const cedulaLimpia = cedulaBusqueda.trim().toUpperCase();
    if (!cedulaLimpia) return;

    setBuscandoCedula(true);
    setErrorBusqueda(null);
    setResultadoCedula(null);
    setEditandoFechaIngresoAnalista(false);

    try {
      const { data: fichasPlantilla, error: errPlantilla } = await supabase
        .from('plantilla_proyectos')
        .select('*')
        .ilike('cedula', `%${cedulaLimpia}%`)
        .order('created_at', { ascending: false });

      if (errPlantilla) throw errPlantilla;

      let qMovs = supabase
        .from('movimientos_plantilla')
        .select('*')
        .ilike('cedula', `%${cedulaLimpia}%`)
        .order('created_at', { ascending: false });

      if (fechaDesdeCedula) qMovs = qMovs.gte('created_at', `${fechaDesdeCedula}T00:00:00`);
      if (fechaHastaCedula) qMovs = qMovs.lte('created_at', `${fechaHastaCedula}T23:59:59`);
      const { data: historialMovs, error: errMovs } = await qMovs;
      if (errMovs) throw errMovs;

      let qAsist = supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .ilike('cedula', `%${cedulaLimpia}%`)
        .order('fecha', { ascending: false });

      if (fechaDesdeCedula) qAsist = qAsist.gte('fecha', fechaDesdeCedula);
      if (fechaHastaCedula) qAsist = qAsist.lte('fecha', fechaHastaCedula);
      const { data: historialAsist, error: errAsist } = await qAsist;
      if (errAsist) throw errAsist;

      const fichaActual = fichasPlantilla && fichasPlantilla.length > 0 ? fichasPlantilla.at(0) : null;
      const nombreDetectado = fichaActual
        ? `${fichaActual.nombres} ${fichaActual.apellidos}`
        : historialMovs && historialMovs.length > 0
        ? historialMovs.at(0).nombre_completo
        : historialAsist && historialAsist.length > 0
        ? historialAsist.at(0).nombre_completo
        : '';

      if (!fichaActual && (!historialMovs || historialMovs.length === 0) && (!historialAsist || historialAsist.length === 0)) {
        setErrorBusqueda(`No se encontraron registros para la cédula "${cedulaLimpia}".`);
        return;
      }

      setResultadoCedula({
        cedula: fichaActual?.cedula || cedulaLimpia,
        nombreCompleto: nombreDetectado,
        fichaActual,
        movimientos: historialMovs || [],
        asistencias: historialAsist || [],
      });
    } catch (err: any) {
      setErrorBusqueda('Error al consultar expediente: ' + (err?.message || 'Verifique conexión.'));
    } finally {
      setBuscandoCedula(false);
    }
  };

  const guardarFechaIngresoPorAnalista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultadoCedula?.fichaActual || !fechaIngresoAnalistaInput) return;

    setGuardandoCambio(true);
    try {
      const fechaISO = `${fechaIngresoAnalistaInput}T07:00:00-04:00`;
      const { error } = await supabase
        .from('plantilla_proyectos')
        .update({
          fecha_ingreso: fechaISO,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resultadoCedula.fichaActual.id);

      if (error) throw error;

      setMensajeGlobal({
        tipo: 'exito',
        texto: `✅ Fecha de ingreso de ${resultadoCedula.nombreCompleto} actualizada a ${fechaIngresoAnalistaInput}.`,
      });
      setResultadoCedula({
        ...resultadoCedula,
        fichaActual: { ...resultadoCedula.fichaActual, fecha_ingreso: fechaISO },
      });
      setEditandoFechaIngresoAnalista(false);
    } catch (err: any) {
      setMensajeGlobal({ tipo: 'error', texto: 'Error actualizando fecha: ' + (err?.message || 'Error.') });
    } finally {
      setGuardandoCambio(false);
    }
  };
  const listaOrdenadaAsistencia = ordenarRegistrosAsistencia(asistenciasProyecto);

  const totalPresentes = asistenciasProyecto.filter((a) =>
    ESTATUS_ASISTENTES.includes(a.estatus)
  ).length;
  const totalApoyos = asistenciasProyecto.filter((a) =>
    ['APOYO RECIBIDO', 'APOYO ENVIADO', 'SERVICIO ESPECIAL RECIBIDO', 'SERVICIO ESPECIAL ENVIADO'].includes(
      a.estatus
    )
  ).length;
  const totalFaltas = asistenciasProyecto.filter((a) => a.estatus === 'FALTA INJUSTIFICADA').length;
  const totalOtros = asistenciasProyecto.filter((a) =>
    ['REPOSO MEDICO', 'BAJA POR SALUD', 'VACACIONES', 'FALTA JUSTIFICADA', 'PERMISO', 'DESCANSO'].includes(
      a.estatus
    )
  ).length;

  // Cálculo del Cuadro Ejecutivo cuando se selecciona un proyecto puntual
  const proyUpper = proyectoFiltro.toUpperCase();
  const asistentesProyecto = asistenciasProyecto.filter((a) =>
    ESTATUS_ASISTENTES.includes(String(a.estatus || '').toUpperCase())
  );
  const tieneJefeOp = PROYECTOS_CON_JEFE_OP.includes(proyUpper);
  const tieneDiurno = PROYECTOS_CON_DIURNO.includes(proyUpper);
  const tieneNocturno = PROYECTOS_CON_NOCTURNO.includes(proyUpper);

  const countLider = liderActivoPorQR ? 1 : 0;
  const countJefeOp = tieneJefeOp
    ? asistentesProyecto.filter((a) => String(a.cargo || '').toUpperCase() === 'J. OPERACIONES').length
    : 0;
  const countOficialesMixtos = asistentesProyecto.filter(
    (a) =>
      String(a.cargo || '').toUpperCase() !== 'LIDER' &&
      String(a.cargo || '').toUpperCase() !== 'J. OPERACIONES' &&
      ['MIXTO', '24X24'].includes(String(a.turno || 'MIXTO').toUpperCase())
  ).length;
  const countOficialesDiurnos = asistentesProyecto.filter(
    (a) =>
      String(a.cargo || '').toUpperCase() !== 'LIDER' &&
      String(a.cargo || '').toUpperCase() !== 'J. OPERACIONES' &&
      String(a.turno || '').toUpperCase() === 'DIURNO'
  ).length;
  const countOficialesNocturnos = asistentesProyecto.filter(
    (a) =>
      String(a.cargo || '').toUpperCase() !== 'LIDER' &&
      String(a.cargo || '').toUpperCase() !== 'J. OPERACIONES' &&
      String(a.turno || '').toUpperCase() === 'NOCTURNO'
  ).length;
  const totalCuadroEjecutivo =
    countLider + countJefeOp + countOficialesMixtos + countOficialesDiurnos + countOficialesNocturnos;
  const pad2 = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-teal-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
            Módulo Analista de Operaciones
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <ClipboardList className="text-teal-600" size={26} /> Control de Asistencia, Plantilla y Auditoría
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consulta y edición auditada de asistencia, gestión de plantilla por grupo (A/B/C) y generación de PDFs.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800">
          <Clock size={16} /> Edición de Asistencia: ACTIVA
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={() => setPestana('ASISTENCIAS_PROYECTO')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            pestana === 'ASISTENCIAS_PROYECTO' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardList size={18} /> ASISTENCIAS Y PDF
        </button>

        <button
          type="button"
          onClick={() => setPestana('PLANTILLA_PROYECTO')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            pestana === 'PLANTILLA_PROYECTO' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users size={18} /> PLANTILLA POR PROYECTO
        </button>

        <button
          type="button"
          onClick={() => setPestana('HISTORIAL_CEDULA')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            pestana === 'HISTORIAL_CEDULA' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck size={18} /> HISTORIAL POR CÉDULA
        </button>
      </div>
      {pestana === 'ASISTENCIAS_PROYECTO' && (
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
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
                >
                  <option value="TODOS">TODOS LOS PROYECTOS</option>
                  {listaProyectos.map((proy) => (
                    <option key={proy} value={proy}>
                      {proy}
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
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Horario</label>
                <select
                  value={turnoFiltro}
                  onChange={(e) => setTurnoFiltro(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
                >
                  <option value="TODOS">TODOS LOS HORARIOS</option>
                  <option value="MIXTO">MIXTO</option>
                  <option value="24X24">24X24</option>
                  <option value="DIURNO">DIURNO</option>
                  <option value="NOCTURNO">NOCTURNO</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => prepararYGenerarPDF('ASISTENCIA')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download size={15} /> Descargar PDF Asistencia
              </button>

              <button
                type="button"
                onClick={() => prepararYGenerarPDF('IMPRIMIR')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer size={15} /> Imprimir Asistencia
              </button>

              {esDirectivaOAdmin && (
                <button
                  type="button"
                  onClick={() => prepararYGenerarPDF('INFORME_DIRECTIVA')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-700 text-white hover:bg-red-800 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download size={15} /> Informe Diario Directiva
                </button>
              )}
            </div>
          </div>

          {proyectoFiltro !== 'TODOS' && (
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Resumen Numérico de Plantilla Presente — {proyectoFiltro}
                </span>
                <span className="text-lg font-black text-emerald-400">
                  TOTAL: {pad2(totalCuadroEjecutivo)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="text-slate-400 font-bold uppercase">Líder de Proyecto</div>
                  <div className="text-xl font-black text-white mt-0.5">{pad2(countLider)}</div>
                </div>

                {tieneJefeOp && (
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-slate-400 font-bold uppercase">Jefe de Operaciones</div>
                    <div className="text-xl font-black text-white mt-0.5">{pad2(countJefeOp)}</div>
                  </div>
                )}

                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="text-slate-400 font-bold uppercase">Oficiales Mixtos</div>
                  <div className="text-xl font-black text-blue-300 mt-0.5">{pad2(countOficialesMixtos)}</div>
                </div>

                {(tieneDiurno || countOficialesDiurnos > 0) && (
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-slate-400 font-bold uppercase">Oficiales Diurnos</div>
                    <div className="text-xl font-black text-amber-300 mt-0.5">{pad2(countOficialesDiurnos)}</div>
                  </div>
                )}

                {(tieneNocturno || countOficialesNocturnos > 0) && (
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-slate-400 font-bold uppercase">Oficiales Nocturnos</div>
                    <div className="text-xl font-black text-purple-300 mt-0.5">{pad2(countOficialesNocturnos)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

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
              <div className="text-xs font-bold text-slate-500 uppercase">Salud / Vac. / Novedades</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{totalOtros}</div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            {cargandoAsist ? (
              <p className="text-center text-slate-500 py-8 text-sm">Consultando registros de asistencia...</p>
            ) : listaOrdenadaAsistencia.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">
                No hay asistencias registradas para los filtros seleccionados.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {listaOrdenadaAsistencia.map((reg) => (
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
                          {reg.turno === 'DIURNO' || reg.turno === 'NOCTURNO'
                            ? reg.turno
                            : `${reg.turno} • GRP ${reg.grupo}`}
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
                          ESTATUS_ASISTENTES.includes(reg.estatus)
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
      )}
      {pestana === 'PLANTILLA_PROYECTO' && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Plantilla Activa por Proyecto ({plantillaProyectoList.length})
              </h2>
              <p className="text-xs text-slate-500">
                Despliegue cada horario y grupo (A / B / C) para verificar personal y editar fechas de ingreso.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proyecto *</label>
              <select
                value={proyectoPlantilla}
                onChange={(e) => setProyectoPlantilla(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold bg-slate-50"
              >
                {listaProyectos.map((proy) => (
                  <option key={proy} value={proy}>
                    {proy}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['MIXTO', '24X24', 'DIURNO_NOCTURNO'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setFiltroHorarioPlantilla(tab);
                  if (tab === '24X24' && grupoDesplegadoAnalista === 'C') {
                    setGrupoDesplegadoAnalista('A');
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                  filtroHorarioPlantilla === tab
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {tab === 'MIXTO' ? 'MIXTO' : tab === '24X24' ? '24X24' : 'DIURNO / NOCTURNO'}
              </button>
            ))}
          </div>

          {filtroHorarioPlantilla !== 'DIURNO_NOCTURNO' && (
            <div className="flex flex-wrap gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 self-center mr-1">Grupo:</span>
              {(filtroHorarioPlantilla === 'MIXTO' ? (['A', 'B', 'C'] as const) : (['A', 'B'] as const)).map(
                (grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setGrupoDesplegadoAnalista(grp)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                      grupoDesplegadoAnalista === grp
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-300'
                    }`}
                  >
                    GRUPO {grp}
                  </button>
                )
              )}
            </div>
          )}

          {cargandoPlantilla ? (
            <p className="text-center text-slate-500 py-8 text-sm">Cargando plantilla del proyecto...</p>
          ) : (
            (() => {
              const filtrados = plantillaProyectoList.filter((item) => {
                const trn = String(item.turno || 'MIXTO').toUpperCase();
                const grp = String(item.grupo || 'A').toUpperCase();
                if (filtroHorarioPlantilla === 'MIXTO') {
                  return trn === 'MIXTO' && grp === grupoDesplegadoAnalista;
                }
                if (filtroHorarioPlantilla === '24X24') {
                  return trn === '24X24' && grp === grupoDesplegadoAnalista;
                }
                return trn === 'DIURNO' || trn === 'NOCTURNO';
              });

              return filtrados.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-xs">
                  No hay personal registrado en este bloque.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtrados.map((of) => (
                    <div key={of.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-xs font-black bg-teal-100 text-teal-800">
                            {of.cargo || 'OFICIAL'}
                          </span>
                          <span className="font-bold text-sm text-slate-800">
                            {of.apellidos}, {of.nombres}
                          </span>
                          <span className="text-xs font-mono text-slate-500">C.I. {of.cedula}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Fecha de Ingreso:{' '}
                          {of.fecha_ingreso ? (
                            <strong>{new Date(of.fecha_ingreso).toLocaleDateString('es-VE')}</strong>
                          ) : (
                            <span className="text-amber-700 font-bold">Sin fecha registrada</span>
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setOficialEditandoFechaTab(of);
                          setFechaIngresoTabInput(
                            of.fecha_ingreso
                              ? new Date(of.fecha_ingreso).toLocaleDateString('en-CA')
                              : hoyLocal
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 self-start sm:self-center cursor-pointer"
                      >
                        Editar Fecha de Ingreso
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      )}
      {pestana === 'HISTORIAL_CEDULA' && (
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
                    {resultadoCedula.fichaActual && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-600">
                          Fecha de Ingreso:{' '}
                          {resultadoCedula.fichaActual.fecha_ingreso ? (
                            <strong>
                              {new Date(resultadoCedula.fichaActual.fecha_ingreso).toLocaleDateString('es-VE')}
                            </strong>
                          ) : (
                            <span className="text-amber-700 font-bold">Sin fecha registrada</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFechaIngresoAnalistaInput(
                              resultadoCedula.fichaActual.fecha_ingreso
                                ? new Date(resultadoCedula.fichaActual.fecha_ingreso).toLocaleDateString('en-CA')
                                : hoyLocal
                            );
                            setEditandoFechaIngresoAnalista(!editandoFechaIngresoAnalista);
                          }}
                          className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                        >
                          Editar Fecha de Ingreso
                        </button>
                      </div>
                    )}
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

                {editandoFechaIngresoAnalista && resultadoCedula.fichaActual && (
                  <form
                    onSubmit={guardarFechaIngresoPorAnalista}
                    className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 flex flex-wrap items-center gap-3"
                  >
                    <label className="text-xs font-bold text-blue-900">Nueva Fecha de Ingreso:</label>
                    <input
                      type="date"
                      required
                      value={fechaIngresoAnalistaInput}
                      onChange={(e) => setFechaIngresoAnalistaInput(e.target.value)}
                      className="border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white"
                    />
                    <button
                      type="submit"
                      disabled={guardandoCambio}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    >
                      {guardandoCambio ? 'Guardando...' : 'Guardar Fecha'}
                    </button>
                  </form>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 uppercase">Guardias Presente</div>
                    <div className="text-xl font-black text-emerald-700">
                      {
                        resultadoCedula.asistencias.filter((a) =>
                          ESTATUS_ASISTENTES.includes(a.estatus)
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
                  <option value="SERVICIO ESPECIAL MIXTO">S.E MIXTO</option>
                  <option value="SERVICIO ESPECIAL DIURNO/NOCTURNO">S.E DIURNO/NOCTURNO</option>
                  <option value="SERVICIO ESPECIAL PROPIO">SERVICIO ESPECIAL PROPIO</option>
                  <option value="SERVICIO ESPECIAL RECIBIDO">SERVICIO ESPECIAL RECIBIDO</option>
                  <option value="SERVICIO ESPECIAL ENVIADO">SERVICIO ESPECIAL ENVIADO</option>
                  <option value="APOYO RECIBIDO">APOYO RECIBIDO</option>
                  <option value="APOYO ENVIADO">APOYO ENVIADO</option>
                  <option value="VACACIONES">VACACIONES</option>
                  <option value="REPOSO MEDICO">REPOSO MÉDICO</option>
                  <option value="BAJA POR SALUD">BAJA POR SALUD</option>
                  <option value="FALTA JUSTIFICADA">FALTA JUSTIFICADA</option>
                  <option value="FALTA INJUSTIFICADA">FALTA INJUSTIFICADA</option>
                  <option value="PERMISO">PERMISO</option>
                  <option value="DESCANSO">LIBRE / DESCANSO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Horario *</label>
                <select
                  value={nuevoTurno}
                  onChange={(e) => setNuevoTurno(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="MIXTO">MIXTO</option>
                  <option value="24X24">24X24</option>
                  <option value="DIURNO">DIURNO</option>
                  <option value="NOCTURNO">NOCTURNO</option>
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

      {oficialEditandoFechaTab && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={guardarFechaIngresoDesdePlantilla} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-800">Editar Fecha de Ingreso</h3>
            <p className="text-xs text-slate-600">
              Personal: <strong>{oficialEditandoFechaTab.nombres} {oficialEditandoFechaTab.apellidos}</strong> ({oficialEditandoFechaTab.cedula})
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Ingreso *</label>
              <input
                type="date"
                required
                value={fechaIngresoTabInput}
                onChange={(e) => setFechaIngresoTabInput(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOficialEditandoFechaTab(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoCambio}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 cursor-pointer"
              >
                {guardandoCambio ? 'Guardando...' : 'Guardar Fecha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
