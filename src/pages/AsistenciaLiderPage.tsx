import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import {
  obtenerGrupoMixtoPorFecha,
  obtenerGrupo24x24PorFecha,
  leTocaGuardiaHoy,
} from '../utils/rotacionGuardia';
import {
  Users,
  UserPlus,
  History,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  ClipboardCheck,
  Check,
  X,
  MoreHorizontal,
  Shield,
  Calendar,
} from 'lucide-react';

export type CargoOperativo =
  | 'OFICIAL'
  | 'J. GRUPO'
  | 'OPERADOR'
  | 'J. OPERACIONES'
  | 'J. SALA'
  | 'LIDER';

export const LISTA_CARGOS_OPERATIVOS: CargoOperativo[] = [
  'OFICIAL',
  'J. GRUPO',
  'OPERADOR',
  'J. OPERACIONES',
  'J. SALA',
  'LIDER',
];

export type HorarioOperativo = 'MIXTO' | '24X24' | 'DIURNO' | 'NOCTURNO';

interface OficialPlantilla {
  id: string;
  proyecto: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  cargo: CargoOperativo;
  grupo: 'A' | 'B' | 'C';
  turno: HorarioOperativo;
  estado: 'ACTIVO' | 'INACTIVO';
  tipo_ultimo_movimiento: string;
  proyecto_origen_destino?: string | null;
  observacion?: string | null;
  fecha_ingreso?: string | null;
  fecha_egreso?: string | null;
  registrado_por?: string | null;
}

type TipoAltaPlantilla =
  | 'NUEVO INGRESO'
  | 'TRASLADO RECIBIDO'
  | 'SERVICIO ESPECIAL RECIBIDO'
  | 'APOYO RECIBIDO';

type TipoOtroMovimiento =
  | 'APOYO ENVIADO'
  | 'TRASLADO ENVIADO'
  | 'VACACIONES'
  | 'REPOSO MEDICO'
  | 'BAJA POR SALUD'
  | 'FALTA JUSTIFICADA'
  | 'PERMISO'
  | 'DESCANSO'
  | 'EGRESO';

interface MovimientoPlantilla {
  id: string;
  proyecto: string;
  cedula: string;
  nombre_completo: string;
  cargo?: string;
  grupo: string;
  turno?: string;
  tipo_movimiento: string;
  proyecto_relacionado?: string | null;
  observacion?: string | null;
  registrado_por?: string | null;
  created_at: string;
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

export default function AsistenciaLiderPage() {
  const { currentUser } = useAuth();

  const rolActual = (currentUser?.role || '').toLowerCase();
  const esLider = rolActual === 'lider';
  const { fechaStr: hoyLocal } = obtenerFechaHoraCaracas();

  const bloqueadoAsistenciaBase = false;

  const grupoMixtoHoy = obtenerGrupoMixtoPorFecha(hoyLocal);
  const grupo24x24Hoy = obtenerGrupo24x24PorFecha(hoyLocal);

  const proyectosUsuario: string[] =
    Array.isArray(currentUser?.proyectos) && currentUser.proyectos.length > 0
      ? currentUser.proyectos
      : currentUser?.proyecto_id
      ? [currentUser.proyecto_id]
      : ['SIN PROYECTO ASIGNADO'];

  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>(
    proyectosUsuario.at(0) || 'SIN PROYECTO ASIGNADO'
  );
  const [listaProyectosGlobales, setListaProyectosGlobales] = useState<string[]>([]);
  const [seccionPrincipal, setSeccionPrincipal] = useState<'ASISTENCIA_GUARDIA' | 'PLANTILLA_GENERAL'>(
    'PLANTILLA_GENERAL'
  );
  const [subMenuPlantilla, setSubMenuPlantilla] = useState<'LISTA_GENERAL' | 'REGISTRAR' | 'HISTORIAL'>(
    'LISTA_GENERAL'
  );

  const [plantillaActiva, setPlantillaActiva] = useState<OficialPlantilla[]>([]);
  const [pendientesReclutamiento, setPendientesReclutamiento] = useState<any[]>([]);
  const [aspiranteReclutamientoId, setAspiranteReclutamientoId] = useState<string>('');
  const [asistenciasHoyList, setAsistenciasHoyList] = useState<any[]>([]);
  const [asistenciasHoyMap, setAsistenciasHoyMap] = useState<Record<string, any>>({});
  const [liderActivoPorQR, setLiderActivoPorQR] = useState<boolean>(false);
  const [movimientos, setMovimientos] = useState<MovimientoPlantilla[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [filtroPlantilla, setFiltroPlantilla] = useState<'MIXTO' | '24X24' | 'DIURNO_NOCTURNO'>('MIXTO');
  const [grupoDesplegadoPlantilla, setGrupoDesplegadoPlantilla] = useState<'A' | 'B' | 'C'>(grupoMixtoHoy);
  const [busqueda, setBusqueda] = useState('');

  const [cedula, setCedula] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [cargoAlta, setCargoAlta] = useState<CargoOperativo>('OFICIAL');
  const [grupo, setGrupo] = useState<'A' | 'B' | 'C'>(grupoMixtoHoy);
  const [turnoAlta, setTurnoAlta] = useState<HorarioOperativo>('MIXTO');
  const [tipoIngreso, setTipoIngreso] = useState<TipoAltaPlantilla>('NUEVO INGRESO');
  const [proyectoOrigen, setProyectoOrigen] = useState('');
  const [observacionIngreso, setObservacionIngreso] = useState('');

  const [oficialOtro, setOficialOtro] = useState<OficialPlantilla | null>(null);
  const [tipoOtro, setTipoOtro] = useState<TipoOtroMovimiento>('APOYO ENVIADO');
  const [turnoOtro, setTurnoOtro] = useState<HorarioOperativo>('MIXTO');
  const [proyectoDestinoOtro, setProyectoDestinoOtro] = useState('');
  const [observacionOtro, setObservacionOtro] = useState('');

  const [oficialEditandoFecha, setOficialEditandoFecha] = useState<OficialPlantilla | null>(null);
  const [nuevaFechaIngresoInput, setNuevaFechaIngresoInput] = useState<string>(hoyLocal);

  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const nombreRegistrador = currentUser?.nombre_completo || currentUser?.username || 'Líder';
  const cargarProyectosDisponibles = async () => {
    try {
      const nombresProyectos = new Set<string>([
        ...(Array.isArray(PROYECTOS) ? PROYECTOS : []),
        ...proyectosUsuario.filter((p) => p && p !== '*'),
      ]);

      const { data: projsTabla } = await supabase.from('projects').select('*');
      if (Array.isArray(projsTabla)) {
        projsTabla.forEach((p: any) => {
          const val = p?.nombre || p?.name || p?.proyecto;
          if (val) nombresProyectos.add(String(val).trim());
        });
      }

      setListaProyectosGlobales(Array.from(nombresProyectos).sort());
    } catch {
      setListaProyectosGlobales(Array.isArray(PROYECTOS) ? PROYECTOS : proyectosUsuario);
    }
  };

  const verificarPresenciaLiderPorQR = async (proyecto: string) => {
    try {
      const { data: logsHoy } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('project_name', proyecto)
        .gte('created_at', `${hoyLocal}T00:00:00`)
        .lte('created_at', `${hoyLocal}T23:59:59`)
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

      if (tipoEvento.includes('SALIDA') || tipoEvento.includes('OUT') || tipoEvento.includes('EXIT')) {
        setLiderActivoPorQR(false);
      } else {
        setLiderActivoPorQR(true);
      }
    } catch {
      setLiderActivoPorQR(false);
    }
  };

  const cargarDatosProyecto = async () => {
    if (!proyectoSeleccionado) return;
    setCargando(true);
    try {
      const { data: dataActivos, error: errActivos } = await supabase
        .from('plantilla_proyectos')
        .select('*')
        .eq('proyecto', proyectoSeleccionado)
        .eq('estado', 'ACTIVO')
        .order('apellidos', { ascending: true });

      if (errActivos) throw errActivos;
      const activos = (dataActivos as OficialPlantilla[]) || [];
      setPlantillaActiva(activos);

      const { data: dataPendReclut } = await supabase
        .from('aspirantes_reclutamiento')
        .select('*')
        .eq('proyecto_asignado', proyectoSeleccionado)
        .eq('estatus_seleccion', 'PENDIENTE POR INGRESO')
        .order('created_at', { ascending: false });

      setPendientesReclutamiento(Array.isArray(dataPendReclut) ? dataPendReclut : []);

      const { data: dataAsistHoy } = await supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .eq('proyecto', proyectoSeleccionado)
        .eq('fecha', hoyLocal)
        .order('created_at', { ascending: true });

      const listaHoy = Array.isArray(dataAsistHoy) ? dataAsistHoy : [];
      const mapaHoy: Record<string, any> = {};

      listaHoy.forEach((reg: any) => {
        mapaHoy[String(reg.cedula).toUpperCase()] = reg;
      });

      setAsistenciasHoyList(listaHoy);
      setAsistenciasHoyMap(mapaHoy);

      await verificarPresenciaLiderPorQR(proyectoSeleccionado);

      const { data: dataMovs } = await supabase
        .from('movimientos_plantilla')
        .select('*')
        .eq('proyecto', proyectoSeleccionado)
        .order('created_at', { ascending: false })
        .limit(100);

      setMovimientos((dataMovs as MovimientoPlantilla[]) || []);
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error cargando datos: ' + (err?.message || 'Verifique conexión.'),
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProyectosDisponibles();
  }, []);

  useEffect(() => {
    cargarDatosProyecto();
  }, [proyectoSeleccionado]);
  const marcarAsistenciaDirecta = async (
    oficial: OficialPlantilla,
    nuevoEstatus:
      | 'PRESENTE'
      | 'FALTA INJUSTIFICADA'
      | 'SERVICIO ESPECIAL MIXTO'
      | 'SERVICIO ESPECIAL DIURNO/NOCTURNO'
  ) => {
    setMensaje(null);
    const ced = oficial.cedula.toUpperCase();
    const registroPrevio = asistenciasHoyMap[ced];

    const esServicioEspecial =
      nuevoEstatus === 'SERVICIO ESPECIAL MIXTO' ||
      nuevoEstatus === 'SERVICIO ESPECIAL DIURNO/NOCTURNO';

    if (!esServicioEspecial && bloqueadoAsistenciaBase) {
      setMensaje({
        tipo: 'error',
        texto: '⚠️ Horario cerrado (09:00 AM). Solo puede activar Servicios Especiales o registrar nuevos ingresos.',
      });
      return;
    }

    if (esLider && registroPrevio) {
      setMensaje({
        tipo: 'error',
        texto: `⚠️ ${oficial.apellidos}, ${oficial.nombres} ya tiene asistencia registrada hoy (${registroPrevio.estatus}).`,
      });
      return;
    }

    setGuardando(true);
    try {
      const momento = obtenerFechaHoraCaracas();
      const turnoOf =
        nuevoEstatus === 'SERVICIO ESPECIAL MIXTO'
          ? 'MIXTO'
          : oficial.turno || 'MIXTO';
      const horaEntrada = nuevoEstatus === 'FALTA INJUSTIFICADA' ? '--:--' : momento.hora12;

      const { error } = await supabase.from('asistencias_diarias_oficiales').upsert(
        [
          {
            fecha: momento.fechaStr,
            proyecto: proyectoSeleccionado,
            proyecto_apoyo: null,
            cedula: ced,
            nombre_completo: `${oficial.apellidos}, ${oficial.nombres}`,
            cargo: oficial.cargo || 'OFICIAL',
            grupo: oficial.grupo,
            turno: turnoOf,
            hora_entrada: horaEntrada,
            estatus: nuevoEstatus,
            observacion: `${nuevoEstatus} marcado por ${nombreRegistrador}`,
            registrado_por: nombreRegistrador,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'fecha,proyecto,cedula,turno' }
      );

      if (error) throw error;

      if (esServicioEspecial) {
        await supabase.from('movimientos_plantilla').insert([
          {
            plantilla_id: oficial.id,
            proyecto: proyectoSeleccionado,
            cedula: ced,
            nombre_completo: `${oficial.nombres} ${oficial.apellidos}`,
            cargo: oficial.cargo || 'OFICIAL',
            grupo: oficial.grupo,
            turno: turnoOf,
            tipo_movimiento: nuevoEstatus,
            observacion: `Activado desde personal franco (${horaEntrada})`,
            registrado_por: nombreRegistrador,
          },
        ]);
      }

      setMensaje({
        tipo: 'exito',
        texto:
          nuevoEstatus === 'FALTA INJUSTIFICADA'
            ? `❌ ${oficial.apellidos}, ${oficial.nombres} marcado AUSENTE y reflejado en Asistencia del Día.`
            : `✅ ${oficial.apellidos}, ${oficial.nombres} registrado como ${nuevoEstatus} (${horaEntrada}) y reflejado en Asistencia del Día.`,
      });
      await cargarDatosProyecto();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error registrando asistencia: ' + (err?.message || 'Error de conexión.'),
      });
    } finally {
      setGuardando(false);
    }
  };

  const manejarRegistrarAlta = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const cedulaLimpia = cedula.trim().toUpperCase();
    const nombresLimpios = nombres.trim().toUpperCase();
    const apellidosLimpios = apellidos.trim().toUpperCase();

    const esTemporal24h =
      tipoIngreso === 'SERVICIO ESPECIAL RECIBIDO' || tipoIngreso === 'APOYO RECIBIDO';
    const requiereOrigen =
      tipoIngreso === 'TRASLADO RECIBIDO' || esTemporal24h;

    if (!cedulaLimpia || !nombresLimpios || !apellidosLimpios) {
      setMensaje({ tipo: 'error', texto: 'Debe completar Cédula, Nombres y Apellidos.' });
      return;
    }

    if (requiereOrigen && !proyectoOrigen.trim()) {
      setMensaje({
        tipo: 'error',
        texto: `Debe seleccionar el Proyecto de Origen para ${tipoIngreso}.`,
      });
      return;
    }

    const grupoFinal: 'A' | 'B' | 'C' =
      turnoAlta === '24X24' && grupo === 'C' ? 'A' : grupo;

    setGuardando(true);
    try {
      const momento = obtenerFechaHoraCaracas();
      const ahora = new Date().toISOString();
      const origenLimpio = requiereOrigen ? proyectoOrigen.trim() : null;
      const obsTexto =
        observacionIngreso.trim() ||
        `${tipoIngreso}${origenLimpio ? ` desde ${origenLimpio}` : ''}`;

      const { error: errAsistDia } = await supabase
        .from('asistencias_diarias_oficiales')
        .upsert(
          [
            {
              fecha: momento.fechaStr,
              proyecto: proyectoSeleccionado,
              proyecto_apoyo: origenLimpio,
              cedula: cedulaLimpia,
              nombre_completo: `${apellidosLimpios}, ${nombresLimpios}`,
              cargo: cargoAlta,
              grupo: grupoFinal,
              turno: turnoAlta,
              hora_entrada: momento.hora12,
              estatus: esTemporal24h ? tipoIngreso : 'PRESENTE',
              observacion: `${tipoIngreso}${origenLimpio ? ` (Origen: ${origenLimpio})` : ''} — ${obsTexto}`,
              registrado_por: nombreRegistrador,
              updated_at: ahora,
            },
          ],
          { onConflict: 'fecha,proyecto,cedula,turno' }
        );

      if (errAsistDia) throw errAsistDia;

      if (esTemporal24h) {
        await supabase.from('movimientos_plantilla').insert([
          {
            proyecto: proyectoSeleccionado,
            cedula: cedulaLimpia,
            nombre_completo: `${nombresLimpios} ${apellidosLimpios}`,
            cargo: cargoAlta,
            grupo: grupoFinal,
            turno: turnoAlta,
            tipo_movimiento: tipoIngreso,
            proyecto_relacionado: origenLimpio,
            observacion: obsTexto,
            registrado_por: nombreRegistrador,
          },
        ]);

        setMensaje({
          tipo: 'exito',
          texto: `✅ ${nombresLimpios} ${apellidosLimpios} (${cargoAlta}) registrado como ${tipoIngreso} y reflejado en Asistencia del Día (${momento.hora12}).`,
        });
      } else {
        const yaExisteActivo = plantillaActiva.some(
          (p) => p.cedula.trim().toUpperCase() === cedulaLimpia && p.estado === 'ACTIVO'
        );
        if (yaExisteActivo) {
          setMensaje({
            tipo: 'error',
            texto: `La cédula ${cedulaLimpia} ya está ACTIVA en ${proyectoSeleccionado}.`,
          });
          setGuardando(false);
          return;
        }

        const { data: insertado, error: errInsert } = await supabase
          .from('plantilla_proyectos')
          .insert([
            {
              proyecto: proyectoSeleccionado,
              cedula: cedulaLimpia,
              nombres: nombresLimpios,
              apellidos: apellidosLimpios,
              cargo: cargoAlta,
              grupo: grupoFinal,
              turno: turnoAlta,
              estado: 'ACTIVO',
              tipo_ultimo_movimiento: tipoIngreso,
              proyecto_origen_destino: origenLimpio,
              observacion: obsTexto,
              fecha_ingreso: ahora,
              registrado_por: nombreRegistrador,
            },
          ])
          .select()
          .single();

        if (errInsert) throw errInsert;

        await supabase.from('movimientos_plantilla').insert([
          {
            plantilla_id: insertado.id,
            proyecto: proyectoSeleccionado,
            cedula: cedulaLimpia,
            nombre_completo: `${nombresLimpios} ${apellidosLimpios}`,
            cargo: cargoAlta,
            grupo: grupoFinal,
            turno: turnoAlta,
            tipo_movimiento: tipoIngreso,
            proyecto_relacionado: origenLimpio,
            observacion: obsTexto,
            registrado_por: nombreRegistrador,
          },
        ]);

        // Si provenía de Reclutamiento (PENDIENTE POR INGRESO), actualizar su estatus a INGRESADO
        if (aspiranteReclutamientoId) {
          await supabase
            .from('aspirantes_reclutamiento')
            .update({
              estatus_seleccion: 'INGRESADO',
              fecha_ingreso_efectivo: ahora,
              updated_at: ahora,
            })
            .eq('id', aspiranteReclutamientoId);
        }

        setMensaje({
          tipo: 'exito',
          texto: `✅ ${nombresLimpios} ${apellidosLimpios} (${cargoAlta} • ${turnoAlta}) anexado a la plantilla fija y reflejado en Asistencia del Día.`,
        });
      }

      setAspiranteReclutamientoId(null);
      setCedula('');
      setNombres('');
      setApellidos('');
      setCargoAlta('OFICIAL');
      setGrupo(grupoMixtoHoy);
      setTurnoAlta('MIXTO');
      setProyectoOrigen('');
      setObservacionIngreso('');
      setSeccionPrincipal('ASISTENCIA_GUARDIA');
      await cargarDatosProyecto();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error al registrar: ' + (err?.message || 'Error de red.') });
    } finally {
      setGuardando(false);
    }
  };
  const guardarFechaIngresoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oficialEditandoFecha || !nuevaFechaIngresoInput) return;

    setGuardando(true);
    try {
      const fechaISO = `${nuevaFechaIngresoInput}T07:00:00-04:00`;
      const { error } = await supabase
        .from('plantilla_proyectos')
        .update({
          fecha_ingreso: fechaISO,
          updated_at: new Date().toISOString(),
        })
        .eq('id', oficialEditandoFecha.id);

      if (error) throw error;

      setMensaje({
        tipo: 'exito',
        texto: `✅ Fecha de ingreso de ${oficialEditandoFecha.nombres} ${oficialEditandoFecha.apellidos} actualizada a ${nuevaFechaIngresoInput}.`,
      });
      setOficialEditandoFecha(null);
      await cargarDatosProyecto();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error guardando fecha: ' + (err?.message || 'Error.') });
    } finally {
      setGuardando(false);
    }
  };

  const confirmarMovimientoOtro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oficialOtro) return;
    setMensaje(null);

    const requiereDestino = tipoOtro === 'TRASLADO ENVIADO' || tipoOtro === 'APOYO ENVIADO';
    const requiereMotivoObligatorio =
      tipoOtro === 'EGRESO' ||
      tipoOtro === 'FALTA JUSTIFICADA' ||
      tipoOtro === 'BAJA POR SALUD';

    if (requiereMotivoObligatorio && !observacionOtro.trim()) {
      setMensaje({ tipo: 'error', texto: `⚠️ Debe escribir obligatoriamente el motivo de ${tipoOtro}.` });
      return;
    }

    if (requiereDestino && !proyectoDestinoOtro.trim()) {
      setMensaje({
        tipo: 'error',
        texto: `⚠️ Debe seleccionar obligatoriamente el Proyecto Destino para ${tipoOtro}.`,
      });
      return;
    }

    setGuardando(true);
    try {
      const momento = obtenerFechaHoraCaracas();
      const ahora = new Date().toISOString();
      const destinoLimpio = requiereDestino ? proyectoDestinoOtro.trim() : null;
      const motivoLimpio = observacionOtro.trim() || null;
      const cargoOficial = oficialOtro.cargo || 'OFICIAL';
      const ced = oficialOtro.cedula.toUpperCase();

      const esBajaDefinitivaPlantilla =
        tipoOtro === 'EGRESO' || tipoOtro === 'TRASLADO ENVIADO';

      if (!esBajaDefinitivaPlantilla) {
        await supabase.from('asistencias_diarias_oficiales').upsert(
          [
            {
              fecha: momento.fechaStr,
              proyecto: proyectoSeleccionado,
              proyecto_apoyo: destinoLimpio,
              cedula: ced,
              nombre_completo: `${oficialOtro.apellidos}, ${oficialOtro.nombres}`,
              cargo: cargoOficial,
              grupo: oficialOtro.grupo,
              turno: turnoOtro,
              hora_entrada: tipoOtro === 'APOYO ENVIADO' ? momento.hora12 : '--:--',
              estatus: tipoOtro,
              observacion: motivoLimpio || `${tipoOtro}${destinoLimpio ? ` hacia ${destinoLimpio}` : ''}`,
              registrado_por: nombreRegistrador,
              updated_at: ahora,
            },
          ],
          { onConflict: 'fecha,proyecto,cedula,turno' }
        );

        await supabase.from('movimientos_plantilla').insert([
          {
            plantilla_id: oficialOtro.id,
            proyecto: proyectoSeleccionado,
            cedula: ced,
            nombre_completo: `${oficialOtro.nombres} ${oficialOtro.apellidos}`,
            cargo: cargoOficial,
            grupo: oficialOtro.grupo,
            turno: turnoOtro,
            tipo_movimiento: tipoOtro,
            proyecto_relacionado: destinoLimpio,
            observacion: motivoLimpio,
            registrado_por: nombreRegistrador,
          },
        ]);

        setMensaje({
          tipo: 'exito',
          texto: `✅ ${tipoOtro} registrado para ${oficialOtro.apellidos}, ${oficialOtro.nombres} y reflejado en Asistencia del Día.`,
        });
      } else {
        const { error: errUpdate } = await supabase
          .from('plantilla_proyectos')
          .update({
            estado: 'INACTIVO',
            turno: turnoOtro,
            tipo_ultimo_movimiento: tipoOtro,
            proyecto_origen_destino: destinoLimpio,
            observacion: motivoLimpio,
            fecha_egreso: ahora,
            updated_at: ahora,
          })
          .eq('id', oficialOtro.id);

        if (errUpdate) throw errUpdate;

        await supabase.from('movimientos_plantilla').insert([
          {
            plantilla_id: oficialOtro.id,
            proyecto: proyectoSeleccionado,
            cedula: ced,
            nombre_completo: `${oficialOtro.nombres} ${oficialOtro.apellidos}`,
            cargo: cargoOficial,
            grupo: oficialOtro.grupo,
            turno: turnoOtro,
            tipo_movimiento: tipoOtro,
            proyecto_relacionado: destinoLimpio,
            observacion: motivoLimpio,
            registrado_por: nombreRegistrador,
          },
        ]);

        if (tipoOtro === 'EGRESO') {
          await supabase.from('egresados_empresa').insert([
            {
              cedula: ced,
              nombres: oficialOtro.nombres,
              apellidos: oficialOtro.apellidos,
              cargo: cargoOficial,
              turno: turnoOtro,
              grupo: oficialOtro.grupo,
              proyecto_egreso: proyectoSeleccionado,
              fecha_ingreso: oficialOtro.fecha_ingreso
                ? String(oficialOtro.fecha_ingreso).slice(0, 10)
                : null,
              fecha_egreso: momento.fechaStr,
              motivo_egreso: motivoLimpio || 'EGRESO OPERATIVO',
              egresado_por: nombreRegistrador,
              elegible_reingreso: 'ELEGIBLE',
            },
          ]);
        }

        if (tipoOtro === 'TRASLADO ENVIADO' && destinoLimpio) {
          const { data: nuevoDestino } = await supabase
            .from('plantilla_proyectos')
            .insert([
              {
                proyecto: destinoLimpio,
                cedula: ced,
                nombres: oficialOtro.nombres,
                apellidos: oficialOtro.apellidos,
                cargo: cargoOficial,
                grupo: oficialOtro.grupo,
                turno: turnoOtro,
                estado: 'ACTIVO',
                tipo_ultimo_movimiento: 'TRASLADO RECIBIDO',
                proyecto_origen_destino: proyectoSeleccionado,
                observacion: motivoLimpio,
                fecha_ingreso: ahora,
                registrado_por: nombreRegistrador,
              },
            ])
            .select()
            .single();

          if (nuevoDestino?.id) {
            await supabase.from('movimientos_plantilla').insert([
              {
                plantilla_id: nuevoDestino.id,
                proyecto: destinoLimpio,
                cedula: ced,
                nombre_completo: `${oficialOtro.nombres} ${oficialOtro.apellidos}`,
                cargo: cargoOficial,
                grupo: oficialOtro.grupo,
                turno: turnoOtro,
                tipo_movimiento: 'TRASLADO RECIBIDO',
                proyecto_relacionado: proyectoSeleccionado,
                observacion: motivoLimpio,
                registrado_por: nombreRegistrador,
              },
            ]);
          }
        }

        setMensaje({
          tipo: 'exito',
          texto: `✅ Movimiento ${tipoOtro} de ${oficialOtro.nombres} ${oficialOtro.apellidos} procesado${tipoOtro === 'EGRESO' ? ' y archivado en Base de Datos de Egresados' : ''}.`,
        });
      }

      setOficialOtro(null);
      setProyectoDestinoOtro('');
      setObservacionOtro('');
      await cargarDatosProyecto();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error procesando movimiento: ' + (err?.message || 'Error.') });
    } finally {
      setGuardando(false);
    }
  };
  const estatusAsistentes = [
    'PRESENTE',
    'SERVICIO ESPECIAL PROPIO',
    'SERVICIO ESPECIAL MIXTO',
    'SERVICIO ESPECIAL DIURNO/NOCTURNO',
    'SERVICIO ESPECIAL RECIBIDO',
    'APOYO RECIBIDO',
  ];

  const asistentesHoy = asistenciasHoyList.filter((a) =>
    estatusAsistentes.includes(String(a.estatus || '').toUpperCase())
  );

  const proyUpper = proyectoSeleccionado.toUpperCase();
  const tieneJefeOp = PROYECTOS_CON_JEFE_OP.includes(proyUpper);
  const tieneDiurno = PROYECTOS_CON_DIURNO.includes(proyUpper);
  const tieneNocturno = PROYECTOS_CON_NOCTURNO.includes(proyUpper);

  const countLider = liderActivoPorQR ? 1 : 0;
  const countJefeOp = tieneJefeOp
    ? asistentesHoy.filter((a) => String(a.cargo || '').toUpperCase() === 'J. OPERACIONES').length
    : 0;
  const countOficialesMixtos = asistentesHoy.filter(
    (a) =>
      String(a.cargo || '').toUpperCase() !== 'LIDER' &&
      String(a.cargo || '').toUpperCase() !== 'J. OPERACIONES' &&
      ['MIXTO', '24X24'].includes(String(a.turno || 'MIXTO').toUpperCase())
  ).length;
  const countOficialesDiurnos = asistentesHoy.filter(
    (a) =>
      String(a.cargo || '').toUpperCase() !== 'LIDER' &&
      String(a.cargo || '').toUpperCase() !== 'J. OPERACIONES' &&
      String(a.turno || '').toUpperCase() === 'DIURNO'
  ).length;
  const countOficialesNocturnos = asistentesHoy.filter(
    (a) =>
      String(a.cargo || '').toUpperCase() !== 'LIDER' &&
      String(a.cargo || '').toUpperCase() !== 'J. OPERACIONES' &&
      String(a.turno || '').toUpperCase() === 'NOCTURNO'
  ).length;

  const totalPersonalPresenteDia =
    countLider +
    countJefeOp +
    countOficialesMixtos +
    countOficialesDiurnos +
    countOficialesNocturnos;

  const pad2 = (n: number) => String(n).padStart(2, '0');

  const proyectosParaTraslado = listaProyectosGlobales.filter((p) => p !== proyectoSeleccionado);

  const formatearBadgeHorario = (of: OficialPlantilla) => {
    const trn = (of.turno || 'MIXTO').toUpperCase();
    if (trn === 'DIURNO' || trn === 'NOCTURNO') return trn;
    if (trn === '24X24') return `24X24 • GRP ${of.grupo}`;
    return `MIXTO • GRP ${of.grupo}`;
  };

  const renderFilaOperativa = (oficial: OficialPlantilla, esLibreHoy: boolean) => {
    const ced = oficial.cedula.toUpperCase();
    const marcaHoy = asistenciasHoyMap[ced];
    const yaMarcadoPorLider = esLider && !!marcaHoy;
    const trn = (oficial.turno || 'MIXTO').toUpperCase();
    const permiteServicioEspecial = trn === 'MIXTO' || trn === 'DIURNO' || trn === 'NOCTURNO';

    return (
      <div
        key={oficial.id}
        className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-100 text-blue-800">
              {formatearBadgeHorario(oficial)}
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-teal-100 text-teal-800">
              {oficial.cargo || 'OFICIAL'}
            </span>
            <span className="font-bold text-slate-800 text-sm">
              {oficial.apellidos}, {oficial.nombres}
            </span>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              C.I. {oficial.cedula}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 mt-0.5">
            Fecha de Ingreso:{' '}
            {oficial.fecha_ingreso ? (
              <strong>{new Date(oficial.fecha_ingreso).toLocaleDateString('es-VE')}</strong>
            ) : (
              <span className="text-amber-700 font-bold">Sin fecha (Pendiente por editar)</span>
            )}
          </div>

          {marcaHoy && (
            <div className="mt-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  estatusAsistentes.includes(marcaHoy.estatus)
                    ? 'bg-emerald-100 text-emerald-800'
                    : marcaHoy.estatus === 'FALTA INJUSTIFICADA' || marcaHoy.estatus === 'BAJA POR SALUD'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                HOY: {marcaHoy.estatus}{' '}
                {marcaHoy.hora_entrada && marcaHoy.hora_entrada !== '--:--' ? `(${marcaHoy.hora_entrada})` : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!bloqueadoAsistenciaBase && (
            <>
              <button
                type="button"
                disabled={guardando || yaMarcadoPorLider}
                onClick={() => marcarAsistenciaDirecta(oficial, 'PRESENTE')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Check size={14} /> PRESENTE
              </button>

              <button
                type="button"
                disabled={guardando || yaMarcadoPorLider}
                onClick={() => marcarAsistenciaDirecta(oficial, 'FALTA INJUSTIFICADA')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <X size={14} /> AUSENTE
              </button>

              <button
                type="button"
                disabled={guardando || yaMarcadoPorLider}
                onClick={() => {
                  setMensaje(null);
                  setOficialOtro(oficial);
                  setTipoOtro('APOYO ENVIADO');
                  setTurnoOtro(oficial.turno || 'MIXTO');
                  setProyectoDestinoOtro('');
                  setObservacionOtro('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <MoreHorizontal size={14} /> OTRO
              </button>
            </>
          )}

          {esLibreHoy && permiteServicioEspecial && (
            <>
              <button
                type="button"
                disabled={guardando}
                onClick={() => marcarAsistenciaDirecta(oficial, 'SERVICIO ESPECIAL MIXTO')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-40"
              >
                S.E MIXTO
              </button>

              <button
                type="button"
                disabled={guardando}
                onClick={() => marcarAsistenciaDirecta(oficial, 'SERVICIO ESPECIAL DIURNO/NOCTURNO')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 cursor-pointer disabled:opacity-40"
              >
                S.E DIURNO/NOCTURNO
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setOficialEditandoFecha(oficial);
              setNuevaFechaIngresoInput(
                oficial.fecha_ingreso
                  ? new Date(oficial.fecha_ingreso).toLocaleDateString('en-CA')
                  : hoyLocal
              );
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
          >
            <Calendar size={12} /> Fecha Ingreso
          </button>
        </div>
      </div>
    );
  };
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubMenuPlantilla('LISTA_GENERAL')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer ${
                subMenuPlantilla === 'LISTA_GENERAL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <Users size={16} /> Plantilla General ({plantillaActiva.length})
            </button>

            <button
              type="button"
              onClick={() => setSubMenuPlantilla('REGISTRAR')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer ${
                subMenuPlantilla === 'REGISTRAR'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-emerald-700 border border-emerald-200'
              }`}
            >
              <UserPlus size={16} /> Registrar Ingreso / Recibido 24h
              {pendientesReclutamiento.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-[10px] font-black rounded-full bg-violet-600 text-white">
                  {pendientesReclutamiento.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSubMenuPlantilla('HISTORIAL')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer ${
                subMenuPlantilla === 'HISTORIAL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <History size={16} /> Historial ({movimientos.length})
            </button>
          </div>

          {subMenuPlantilla === 'LISTA_GENERAL' && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-5">
              <div className="flex flex-wrap gap-2">
                {(['MIXTO', '24X24', 'DIURNO_NOCTURNO'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setFiltroPlantilla(tab);
                      if (tab === '24X24' && grupoDesplegadoPlantilla === 'C') {
                        setGrupoDesplegadoPlantilla('A');
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                      filtroPlantilla === tab
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {tab === 'MIXTO'
                      ? 'MIXTO'
                      : tab === '24X24'
                      ? '24X24'
                      : 'DIURNO / NOCTURNO'}
                  </button>
                ))}
              </div>

              {filtroPlantilla !== 'DIURNO_NOCTURNO' && (
                <div className="flex flex-wrap gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 self-center mr-1">
                    Seleccione Grupo:
                  </span>
                  {(filtroPlantilla === 'MIXTO' ? (['A', 'B', 'C'] as const) : (['A', 'B'] as const)).map(
                    (grp) => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setGrupoDesplegadoPlantilla(grp)}
                        className={`px-4 py-2 rounded-lg text-xs font-black cursor-pointer ${
                          grupoDesplegadoPlantilla === grp
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        GRUPO {grp}
                      </button>
                    )
                  )}
                </div>
              )}

              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por cédula, nombre o cargo..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              {(() => {
                const miembrosDesplegados = plantillaActiva.filter((item) => {
                  const trn = (item.turno || 'MIXTO').toUpperCase();
                  const grp = (item.grupo || 'A').toUpperCase();
                  const texto = `${item.cedula} ${item.nombres} ${item.apellidos} ${item.cargo || ''}`.toLowerCase();
                  if (!texto.includes(busqueda.toLowerCase().trim())) return false;
                  if (filtroPlantilla === 'MIXTO') {
                    return trn === 'MIXTO' && grp === grupoDesplegadoPlantilla;
                  }
                  if (filtroPlantilla === '24X24') {
                    return trn === '24X24' && grp === grupoDesplegadoPlantilla;
                  }
                  return trn === 'DIURNO' || trn === 'NOCTURNO';
                });

                return (
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-slate-800 uppercase border-b border-slate-100 pb-2">
                      {filtroPlantilla === 'DIURNO_NOCTURNO'
                        ? `PLANTILLA DIURNO / NOCTURNO (${miembrosDesplegados.length})`
                        : `PLANTILLA ${filtroPlantilla} — GRUPO ${grupoDesplegadoPlantilla} (${miembrosDesplegados.length})`}
                    </h3>
                    {miembrosDesplegados.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        No hay personal registrado en este grupo.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {miembrosDesplegados.map((oficial) => {
                          const esLibreHoy = !leTocaGuardiaHoy(oficial.grupo, oficial.turno, hoyLocal);
                          return renderFilaOperativa(oficial, esLibreHoy);
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          {subMenuPlantilla === 'REGISTRAR' && (
            <form
              onSubmit={manejarRegistrarAlta}
              className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5"
            >
              <h2 className="text-lg font-bold text-slate-800">Registrar Personal en Plantilla / Recibido 24h</h2>

              {pendientesReclutamiento.length > 0 && (
                <div className="p-4 rounded-xl bg-violet-50 border-2 border-violet-300 space-y-2">
                  <div className="text-xs font-black text-violet-900 uppercase">
                    🆕 Personal Aprobado por Reclutamiento (Pendiente por Ingreso en {proyectoSeleccionado})
                  </div>
                  <p className="text-xs text-violet-700">
                    Seleccione un aspirante aprobado para cargar sus datos automáticamente y confirmar su ingreso hoy:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {pendientesReclutamiento.map((asp) => (
                      <button
                        key={asp.id}
                        type="button"
                        onClick={() => {
                          setAspiranteReclutamientoId(asp.id);
                          setCedula(`${asp.nacionalidad || 'V'}-${asp.cedula}`);
                          setNombres(asp.nombres || '');
                          setApellidos(asp.apellidos || '');
                          setCargoAlta((asp.cargo_asignado || 'OFICIAL') as CargoOperativo);
                          setTurnoAlta((asp.turno_asignado || 'MIXTO') as HorarioOperativo);
                          setGrupo((asp.grupo_asignado || 'A') as 'A' | 'B' | 'C');
                          setTipoIngreso('NUEVO INGRESO');
                          setObservacionIngreso('Ingreso aprobado por Reclutamiento');
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                          aspiranteReclutamientoId === asp.id
                            ? 'bg-violet-700 text-white border-violet-700 shadow-sm'
                            : 'bg-white text-violet-900 border-violet-300 hover:bg-violet-100'
                        }`}
                      >
                        {asp.nombres} {asp.apellidos} (C.I. {asp.cedula}) • {asp.cargo_asignado} ({asp.turno_asignado})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cédula *</label>
                  <input
                    type="text"
                    required
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej: V-20123456"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-teal-800 uppercase mb-1">Cargo * (Obligatorio)</label>
                  <select
                    required
                    value={cargoAlta}
                    onChange={(e) => setCargoAlta(e.target.value as CargoOperativo)}
                    className="w-full border border-teal-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-teal-900 bg-teal-50/40"
                  >
                    {LISTA_CARGOS_OPERATIVOS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Horario Asignado *</label>
                  <select
                    required
                    value={turnoAlta}
                    onChange={(e) => {
                      const val = e.target.value as HorarioOperativo;
                      setTurnoAlta(val);
                      if (val === '24X24' && grupo === 'C') setGrupo('A');
                    }}
                    className="w-full border border-blue-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-blue-900 bg-blue-50/40"
                  >
                    <option value="MIXTO">MIXTO</option>
                    <option value="24X24">24X24</option>
                    <option value="DIURNO">DIURNO</option>
                    <option value="NOCTURNO">NOCTURNO</option>
                  </select>
                </div>

                {(turnoAlta === 'MIXTO' || turnoAlta === '24X24') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {turnoAlta === '24X24' ? 'Grupo 24X24 (A o B) *' : 'Grupo MIXTO (A, B o C) *'}
                    </label>
                    <select
                      value={grupo}
                      onChange={(e) => setGrupo(e.target.value as 'A' | 'B' | 'C')}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800"
                    >
                      <option value="A">GRUPO A</option>
                      <option value="B">GRUPO B</option>
                      {turnoAlta === 'MIXTO' && <option value="C">GRUPO C</option>}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Registro *</label>
                  <select
                    value={tipoIngreso}
                    onChange={(e) => {
                      setTipoIngreso(e.target.value as TipoAltaPlantilla);
                      setProyectoOrigen('');
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50/50"
                  >
                    <option value="NUEVO INGRESO">NUEVO INGRESO (Plantilla Fija)</option>
                    <option value="TRASLADO RECIBIDO">TRASLADO RECIBIDO (Plantilla Fija)</option>
                    <option value="SERVICIO ESPECIAL RECIBIDO">SERVICIO ESPECIAL RECIBIDO (Solo 24h)</option>
                    <option value="APOYO RECIBIDO">APOYO RECIBIDO (Solo 24h)</option>
                  </select>
                </div>

                {tipoIngreso !== 'NUEVO INGRESO' && (
                  <div>
                    <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">
                      Proyecto de Origen *
                    </label>
                    <select
                      required
                      value={proyectoOrigen}
                      onChange={(e) => setProyectoOrigen(e.target.value)}
                      className="w-full border border-emerald-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                    >
                      <option value="">-- Seleccione Proyecto Origen --</option>
                      {proyectosParaTraslado.map((proy) => (
                        <option key={proy} value={proy}>
                          {proy}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observación</label>
                  <input
                    type="text"
                    value={observacionIngreso}
                    onChange={(e) => setObservacionIngreso(e.target.value)}
                    placeholder="Detalle adicional (se reflejará en la asistencia del día)..."
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAspiranteReclutamientoId(null);
                    setSubMenuPlantilla('LISTA_GENERAL');
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || (tipoIngreso !== 'NUEVO INGRESO' && !proyectoOrigen.trim())}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-40"
                >
                  {guardando ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          )}
          {subMenuPlantilla === 'HISTORIAL' && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">
                Historial de Movimientos ({movimientos.length})
              </h2>
              <div className="divide-y divide-slate-100">
                {movimientos.map((mov) => (
                  <div key={mov.id} className="py-2.5 text-xs flex justify-between gap-2">
                    <div>
                      <strong>[{mov.tipo_movimiento}]</strong> ({mov.cargo || 'OFICIAL'}) {mov.nombre_completo} ({mov.cedula})
                      {mov.proyecto_relacionado ? ` ↔ ${mov.proyecto_relacionado}` : ''}
                      {mov.observacion ? ` • ${mov.observacion}` : ''}
                    </div>
                    <span className="text-slate-400">{new Date(mov.created_at).toLocaleString('es-VE')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
       )}


      {oficialOtro && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={confirmarMovimientoOtro} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">Registrar Novedad / Movimiento (OTRO)</h3>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Personal: <strong>{oficialOtro.nombres} {oficialOtro.apellidos}</strong> ({oficialOtro.cargo || 'OFICIAL'})
              <br />
              Cédula: <strong>{oficialOtro.cedula}</strong>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccione Opción *</label>
                <select
                  value={tipoOtro}
                  onChange={(e) => {
                    setTipoOtro(e.target.value as TipoOtroMovimiento);
                    setProyectoDestinoOtro('');
                    setObservacionOtro('');
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-800 bg-amber-50/50"
                >
                  <option value="APOYO ENVIADO">APOYO ENVIADO</option>
                  <option value="TRASLADO ENVIADO">TRASLADO ENVIADO</option>
                  <option value="VACACIONES">VACACIONES</option>
                  <option value="REPOSO MEDICO">REPOSO MÉDICO</option>
                  <option value="BAJA POR SALUD">BAJA POR SALUD</option>
                  <option value="FALTA JUSTIFICADA">FALTA JUSTIFICADA</option>
                  <option value="PERMISO">PERMISO</option>
                  <option value="DESCANSO">LIBRE / DESCANSO</option>
                  <option value="EGRESO">EGRESO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Horario *</label>
                <select
                  required
                  value={turnoOtro}
                  onChange={(e) => setTurnoOtro(e.target.value as HorarioOperativo)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-blue-800 bg-blue-50/40"
                >
                  <option value="MIXTO">MIXTO</option>
                  <option value="24X24">24X24</option>
                  <option value="DIURNO">DIURNO</option>
                  <option value="NOCTURNO">NOCTURNO</option>
                </select>
              </div>
            </div>

            {(tipoOtro === 'TRASLADO ENVIADO' || tipoOtro === 'APOYO ENVIADO') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Proyecto Destino *
                </label>
                <select
                  required
                  value={proyectoDestinoOtro}
                  onChange={(e) => setProyectoDestinoOtro(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold"
                >
                  <option value="">-- Seleccione Proyecto Destino --</option>
                  {proyectosParaTraslado.map((proy) => (
                    <option key={proy} value={proy}>
                      {proy}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {['EGRESO', 'FALTA JUSTIFICADA', 'BAJA POR SALUD'].includes(tipoOtro)
                  ? 'Motivo * (Obligatorio)'
                  : 'Observación (Opcional)'}
              </label>
              <textarea
                required={['EGRESO', 'FALTA JUSTIFICADA', 'BAJA POR SALUD'].includes(tipoOtro)}
                rows={2}
                value={observacionOtro}
                onChange={(e) => setObservacionOtro(e.target.value)}
                placeholder="Detalle o motivo..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOficialOtro(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 cursor-pointer disabled:opacity-40"
              >
                {guardando ? 'Guardando...' : `Confirmar ${tipoOtro}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {oficialEditandoFecha && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={guardarFechaIngresoManual} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-800">Editar Fecha de Ingreso</h3>
            <p className="text-xs text-slate-600">
              Personal: <strong>{oficialEditandoFecha.nombres} {oficialEditandoFecha.apellidos}</strong> ({oficialEditandoFecha.cedula})
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Ingreso *</label>
              <input
                type="date"
                required
                value={nuevaFechaIngresoInput}
                onChange={(e) => setNuevaFechaIngresoInput(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOficialEditandoFecha(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                {guardando ? 'Guardando...' : 'Guardar Fecha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
