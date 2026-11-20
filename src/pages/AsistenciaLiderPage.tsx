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
  Lock,
  Mail,
  Check,
  X,
  MoreHorizontal,
  Shield,
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
  fecha_ingreso: string;
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
  | 'SERVICIO ESPECIAL PROPIO'
  | 'TRASLADO ENVIADO'
  | 'VACACIONES'
  | 'FALTA JUSTIFICADA'
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

const obtenerFechaHoraCaracas = () => {
  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
  const hora24 = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(ahora);
  const hora12 = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(ahora);
  const [hh, mm] = hora24.split(':').map(Number);
  return { fechaStr, hora24, hora12, horaNum: hh, minNum: mm };
};
export default function AsistenciaLiderPage() {
  const { currentUser } = useAuth();

  const rolActual = (currentUser?.role || '').toLowerCase();
  const esLider = rolActual === 'lider';
  const { fechaStr: hoyLocal, hora24: horaTexto } = obtenerFechaHoraCaracas();
  // Modo pruebas: bloqueo horario de las 09:00 AM desactivado temporalmente
  const bloqueadoPorHorario = false;

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
    'ASISTENCIA_GUARDIA'
  );
  const [subMenuPlantilla, setSubMenuPlantilla] = useState<'LISTA_GENERAL' | 'REGISTRAR' | 'HISTORIAL'>(
    'LISTA_GENERAL'
  );

  const [plantillaActiva, setPlantillaActiva] = useState<OficialPlantilla[]>([]);
  const [asistenciasHoyMap, setAsistenciasHoyMap] = useState<Record<string, any>>({});
  const [recibidosTemporalesHoy, setRecibidosTemporalesHoy] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoPlantilla[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [filtroPlantilla, setFiltroPlantilla] = useState<'TODOS' | 'MIXTO' | '24X24' | '12H'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFrancosParaServEsp, setMostrarFrancosParaServEsp] = useState(false);

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

  const [correosAnalistas, setCorreosAnalistas] = useState<string[]>([]);
  const [motivoCorreoPlantilla, setMotivoCorreoPlantilla] = useState('');

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

      const { data: dataAsistHoy } = await supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .eq('proyecto', proyectoSeleccionado)
        .eq('fecha', hoyLocal);

      const mapaHoy: Record<string, any> = {};
      const temporales: any[] = [];
      (dataAsistHoy || []).forEach((reg: any) => {
        mapaHoy[String(reg.cedula).toUpperCase()] = reg;
        if (reg.estatus === 'SERVICIO ESPECIAL RECIBIDO' || reg.estatus === 'APOYO RECIBIDO') {
          temporales.push(reg);
        }
      });

      setAsistenciasHoyMap(mapaHoy);
      setRecibidosTemporalesHoy(temporales);

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
    const cargarAnalistas = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('email')
          .eq('role', 'analista')
          .eq('status', 'aprobado');
        if (Array.isArray(data)) {
          setCorreosAnalistas(data.map((u: any) => u.email).filter(Boolean));
        }
      } catch {}
    };
    cargarAnalistas();
  }, []);

  useEffect(() => {
    cargarDatosProyecto();
  }, [proyectoSeleccionado]);
  const marcarAsistenciaDirecta = async (
    oficial: OficialPlantilla,
    nuevoEstatus: 'PRESENTE' | 'FALTA INJUSTIFICADA'
  ) => {
    setMensaje(null);
    const ced = oficial.cedula.toUpperCase();
    const registroPrevio = asistenciasHoyMap[ced];

    if (bloqueadoPorHorario) {
      setMensaje({
        tipo: 'error',
        texto: '⚠️ Horario cerrado (09:00 AM). Solicite la modificación por correo a la Analista.',
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
      const turnoOf = oficial.turno || 'MIXTO';
      const horaEntrada = nuevoEstatus === 'PRESENTE' ? momento.hora12 : '--:--';

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
            observacion:
              nuevoEstatus === 'PRESENTE'
                ? 'Marcado PRESENTE en Guardia Diaria'
                : 'Marcado AUSENTE en Guardia Diaria',
            registrado_por: nombreRegistrador,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'fecha,proyecto,cedula,turno' }
      );

      if (error) throw error;

      setMensaje({
        tipo: 'exito',
        texto:
          nuevoEstatus === 'PRESENTE'
            ? `✅ ${oficial.apellidos}, ${oficial.nombres} marcado PRESENTE (${horaEntrada}).`
            : `❌ ${oficial.apellidos}, ${oficial.nombres} marcado AUSENTE.`,
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

    if (bloqueadoPorHorario) {
      setMensaje({
        tipo: 'error',
        texto: '⚠️ Horario cerrado (09:00 AM). Solicite este registro por correo a la Analista.',
      });
      return;
    }

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

      if (esTemporal24h) {
        const { error: errAsistTemp } = await supabase
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
                estatus: tipoIngreso,
                observacion:
                  observacionIngreso.trim() ||
                  `${tipoIngreso} (24h) desde ${origenLimpio}`,
                registrado_por: nombreRegistrador,
                updated_at: ahora,
              },
            ],
            { onConflict: 'fecha,proyecto,cedula,turno' }
          );

        if (errAsistTemp) throw errAsistTemp;

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
            observacion:
              observacionIngreso.trim() ||
              `Registro temporal 24h desde ${origenLimpio}`,
            registrado_por: nombreRegistrador,
          },
        ]);

        setMensaje({
          tipo: 'exito',
          texto: `✅ ${nombresLimpios} ${apellidosLimpios} (${cargoAlta}) registrado por 24h como ${tipoIngreso} (desde ${origenLimpio}).`,
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
              observacion: observacionIngreso.trim() || null,
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
            observacion: observacionIngreso.trim() || null,
            registrado_por: nombreRegistrador,
          },
        ]);

        setMensaje({
          tipo: 'exito',
          texto: `✅ ${nombresLimpios} ${apellidosLimpios} (${cargoAlta} • ${turnoAlta}) anexado a la plantilla fija.`,
        });
      }

      setCedula('');
      setNombres('');
      setApellidos('');
      setCargoAlta('OFICIAL');
      setGrupo(grupoMixtoHoy);
      setTurnoAlta('MIXTO');
      setProyectoOrigen('');
      setObservacionIngreso('');
      setSubMenuPlantilla('LISTA_GENERAL');
      await cargarDatosProyecto();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error al registrar: ' + (err?.message || 'Error de red.') });
    } finally {
      setGuardando(false);
    }
  };
  const confirmarMovimientoOtro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oficialOtro) return;
    setMensaje(null);

    if (bloqueadoPorHorario) {
      setMensaje({
        tipo: 'error',
        texto: '⚠️ Horario cerrado (09:00 AM). Solicite este movimiento por correo a la Analista.',
      });
      return;
    }

    const requiereDestino = tipoOtro === 'TRASLADO ENVIADO' || tipoOtro === 'APOYO ENVIADO';

    if (tipoOtro === 'EGRESO' && !observacionOtro.trim()) {
      setMensaje({ tipo: 'error', texto: '⚠️ Debe escribir obligatoriamente el motivo del EGRESO.' });
      return;
    }

    if (tipoOtro === 'FALTA JUSTIFICADA' && !observacionOtro.trim()) {
      setMensaje({ tipo: 'error', texto: '⚠️ Debe escribir el motivo de la FALTA JUSTIFICADA.' });
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

      const esNovedadDiariaSinBajaPlantilla =
        tipoOtro === 'SERVICIO ESPECIAL PROPIO' ||
        tipoOtro === 'APOYO ENVIADO' ||
        tipoOtro === 'VACACIONES' ||
        tipoOtro === 'FALTA JUSTIFICADA';

      if (esNovedadDiariaSinBajaPlantilla) {
        const llevaHoraEntrada =
          tipoOtro === 'SERVICIO ESPECIAL PROPIO' || tipoOtro === 'APOYO ENVIADO';

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
              hora_entrada: llevaHoraEntrada ? momento.hora12 : '--:--',
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
          texto: `✅ ${tipoOtro} registrado para ${oficialOtro.apellidos}, ${oficialOtro.nombres}.`,
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
          texto: `✅ Movimiento ${tipoOtro} de ${oficialOtro.nombres} ${oficialOtro.apellidos} procesado correctamente.`,
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
  const enviarCorreoPlantillaAnalista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoCorreoPlantilla.trim()) return;

    await supabase.from('notifications').insert([
      {
        title: `📩 Solicitud de Ajuste de Asistencia/Plantilla — ${proyectoSeleccionado}`,
        body: `Líder ${nombreRegistrador} solicita ajuste (${proyectoSeleccionado}): ${motivoCorreoPlantilla.trim()}`,
        target_roles: ['analista', 'operaciones', 'administrador'],
        target_project: proyectoSeleccionado,
      },
    ]);

    const destinatarios = correosAnalistas.join(',');
    const asunto = encodeURIComponent(`Solicitud de Ajuste - ${proyectoSeleccionado} (${hoyLocal})`);
    const cuerpo = encodeURIComponent(
      `Buen día Estimada Analista,\n\nSolicito su apoyo para realizar el siguiente ajuste en ${proyectoSeleccionado} (${hoyLocal}):\n\n${motivoCorreoPlantilla.trim()}\n\nSolicitado por: ${nombreRegistrador}`
    );
    window.location.href = `mailto:${destinatarios}?subject=${asunto}&body=${cuerpo}`;
    setMotivoCorreoPlantilla('');
    setMensaje({ tipo: 'exito', texto: '✅ Correo preparado para la Analista.' });
  };

  const personalDeGuardiaHoy = plantillaActiva.filter((of) =>
    leTocaGuardiaHoy(of.grupo, of.turno, hoyLocal)
  );
  const personalFrancoHoy = plantillaActiva.filter(
    (of) => !leTocaGuardiaHoy(of.grupo, of.turno, hoyLocal)
  );

  const plantillaGeneralFiltrada = plantillaActiva.filter((item) => {
    const trn = (item.turno || 'MIXTO').toUpperCase();
    const coincideFiltro =
      filtroPlantilla === 'TODOS'
        ? true
        : filtroPlantilla === '12H'
        ? trn === 'DIURNO' || trn === 'NOCTURNO'
        : trn === filtroPlantilla;
    const texto = `${item.cedula} ${item.nombres} ${item.apellidos} ${item.cargo || ''}`.toLowerCase();
    return coincideFiltro && texto.includes(busqueda.toLowerCase().trim());
  });

  const proyectosParaTraslado = listaProyectosGlobales.filter((p) => p !== proyectoSeleccionado);

  const formatearBadgeHorario = (of: OficialPlantilla) => {
    const trn = (of.turno || 'MIXTO').toUpperCase();
    if (trn === 'DIURNO' || trn === 'NOCTURNO') return `12H • ${trn}`;
    if (trn === '24X24') return `24X24 • GRP ${of.grupo}`;
    return `MIXTO • GRP ${of.grupo}`;
  };

  const renderFilaOperativa = (oficial: OficialPlantilla, esFranco: boolean) => {
    const ced = oficial.cedula.toUpperCase();
    const marcaHoy = asistenciasHoyMap[ced];
    const yaMarcadoPorLider = esLider && !!marcaHoy;

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

          {marcaHoy && (
            <div className="mt-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  marcaHoy.estatus === 'PRESENTE' || marcaHoy.estatus === 'SERVICIO ESPECIAL PROPIO'
                    ? 'bg-emerald-100 text-emerald-800'
                    : marcaHoy.estatus === 'FALTA INJUSTIFICADA'
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

        {!bloqueadoPorHorario && (
          <div className="flex items-center gap-2 flex-wrap">
            {!esFranco && (
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
              </>
            )}

            <button
              type="button"
              disabled={guardando || yaMarcadoPorLider}
              onClick={() => {
                setMensaje(null);
                setOficialOtro(oficial);
                setTipoOtro(esFranco ? 'SERVICIO ESPECIAL PROPIO' : 'APOYO ENVIADO');
                setTurnoOtro(oficial.turno || 'MIXTO');
                setProyectoDestinoOtro('');
                setObservacionOtro('');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <MoreHorizontal size={14} /> {esFranco ? 'OTRO (Serv. Especial)' : 'OTRO'}
            </button>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-blue-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Módulo Operativo</span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <ClipboardCheck className="text-blue-600" size={26} /> Control de Asistencia y Plantilla
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Guardia Hoy ({hoyLocal}): <strong className="text-blue-700">Mixto Grp {grupoMixtoHoy}</strong> •{' '}
            <strong className="text-indigo-700">24x24 Grp {grupo24x24Hoy}</strong> •{' '}
            <strong className="text-slate-700">Personal 12h</strong> (Modo pruebas activo).
          </p>
        </div>

        <div className="w-full md:w-72">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Building2 size={14} /> Proyecto Activo
          </label>
          <select
            value={proyectoSeleccionado}
            onChange={(e) => setProyectoSeleccionado(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50"
          >
            {proyectosUsuario.map((proy) => (
              <option key={proy} value={proy}>
                {proy}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-start gap-2 ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {mensaje.tipo === 'exito' ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={() => setSeccionPrincipal('ASISTENCIA_GUARDIA')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            seccionPrincipal === 'ASISTENCIA_GUARDIA' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardCheck size={18} /> ASISTENCIA DE GUARDIA ({hoyLocal})
        </button>

        <button
          type="button"
          onClick={() => setSeccionPrincipal('PLANTILLA_GENERAL')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            seccionPrincipal === 'PLANTILLA_GENERAL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users size={18} /> PLANTILLA GENERAL ({plantillaActiva.length})
        </button>
      </div>

      {bloqueadoPorHorario && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Lock className="text-amber-700 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-amber-900 text-sm uppercase">
                Registro Cerrado (Hora actual: {horaTexto} — Límite: 09:00 AM)
              </h4>
            </div>
          </div>
          <form onSubmit={enviarCorreoPlantillaAnalista} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              value={motivoCorreoPlantilla}
              onChange={(e) => setMotivoCorreoPlantilla(e.target.value)}
              placeholder="Describa la corrección o movimiento requerido..."
              className="flex-1 border border-amber-300 rounded-xl px-3 py-2 text-xs bg-white"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Mail size={14} /> Enviar Correo a Analista
            </button>
          </form>
        </div>
      )}

      {seccionPrincipal === 'ASISTENCIA_GUARDIA' ? (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="text-blue-600" size={18} /> Personal de Guardia Hoy ({personalDeGuardiaHoy.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Mixto Grp <strong>{grupoMixtoHoy}</strong> + 24x24 Grp <strong>{grupo24x24Hoy}</strong> + Personal 12h (Diurno/Nocturno).
                </p>
              </div>
              {!bloqueadoPorHorario && (
                <button
                  type="button"
                  onClick={() => {
                    setSeccionPrincipal('PLANTILLA_GENERAL');
                    setSubMenuPlantilla('REGISTRAR');
                    setTipoIngreso('SERVICIO ESPECIAL RECIBIDO');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer self-start"
                >
                  <UserPlus size={15} /> + Serv. Especial / Apoyo Recibido (24h)
                </button>
              )}
            </div>

            {cargando ? (
              <p className="text-center text-slate-500 py-8 text-sm">Cargando guardia del día...</p>
            ) : personalDeGuardiaHoy.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">
                No hay personal asignado de guardia hoy en <strong>{proyectoSeleccionado}</strong>.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {personalDeGuardiaHoy.map((of) => renderFilaOperativa(of, false))}
              </div>
            )}

            {recibidosTemporalesHoy.length > 0 && (
              <div className="pt-3 border-t border-indigo-100 bg-indigo-50/50 p-4 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-indigo-900 uppercase">
                  Servicios Especiales / Apoyos Recibidos Hoy (Temporal 24h)
                </h4>
                {recibidosTemporalesHoy.map((tmp) => (
                  <div key={tmp.id} className="text-xs flex justify-between items-center py-1">
                    <span>
                      <span className="px-1.5 py-0.5 mr-1.5 rounded bg-teal-100 text-teal-800 font-bold">
                        {tmp.cargo || 'OFICIAL'}
                      </span>
                      <strong>{tmp.nombre_completo}</strong> ({tmp.cedula}) — Origen: <strong>{tmp.proyecto_apoyo}</strong> • Entrada: <strong>{tmp.hora_entrada}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">{tmp.estatus}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {personalFrancoHoy.length > 0 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <button
                type="button"
                onClick={() => setMostrarFrancosParaServEsp(!mostrarFrancosParaServEsp)}
                className="w-full flex items-center justify-between text-left font-bold text-sm text-slate-700 cursor-pointer"
              >
                <span>
                  🔄 Personal en Grupos Francos / Libres Hoy ({personalFrancoHoy.length}) — Pulsar para reportar Servicio Especial Propio
                </span>
                <span className="text-xs text-blue-600 underline">
                  {mostrarFrancosParaServEsp ? 'Ocultar' : 'Desplegar'}
                </span>
              </button>

              {mostrarFrancosParaServEsp && (
                <div className="divide-y divide-slate-100 pt-2 border-t border-slate-100">
                  {personalFrancoHoy.map((of) => renderFilaOperativa(of, true))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
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

            {!bloqueadoPorHorario && (
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
              </button>
            )}

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
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['TODOS', 'MIXTO', '24X24', '12H'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFiltroPlantilla(tab)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      filtroPlantilla === tab
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {tab === 'TODOS'
                      ? `Todos (${plantillaActiva.length})`
                      : tab === 'MIXTO'
                      ? 'Mixto 24x48 (A/B/C)'
                      : tab === '24X24'
                      ? '24x24 (A/B)'
                      : 'Diurno / Nocturno (12h)'}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar en plantilla general por cédula, nombre o cargo..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="divide-y divide-slate-100">
                {plantillaGeneralFiltrada.map((oficial) => (
                  <div key={oficial.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-blue-100 text-blue-800">
                        {formatearBadgeHorario(oficial)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-teal-100 text-teal-800">
                        {oficial.cargo || 'OFICIAL'}
                      </span>
                      <span className="font-bold text-sm text-slate-800">
                        {oficial.apellidos}, {oficial.nombres}
                      </span>
                      <span className="text-xs font-mono text-slate-500">C.I. {oficial.cedula}</span>
                    </div>

                    {!bloqueadoPorHorario && (
                      <button
                        type="button"
                        onClick={() => {
                          setOficialOtro(oficial);
                          setTipoOtro('TRASLADO ENVIADO');
                          setTurnoOtro(oficial.turno || 'MIXTO');
                          setProyectoDestinoOtro('');
                          setObservacionOtro('');
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 self-start cursor-pointer"
                      >
                        Traslado / Egreso
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {subMenuPlantilla === 'REGISTRAR' && !bloqueadoPorHorario && (
            <form
              onSubmit={manejarRegistrarAlta}
              className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5"
            >
              <h2 className="text-lg font-bold text-slate-800">Registrar Personal en Plantilla / Recibido 24h</h2>

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
                    <option value="MIXTO">MIXTO (24x48 • Rotación A/B/C)</option>
                    <option value="24X24">24X24 (Rotación Grupo A / B)</option>
                    <option value="DIURNO">DIURNO (12 Horas)</option>
                    <option value="NOCTURNO">NOCTURNO (12 Horas)</option>
                  </select>
                </div>

                {(turnoAlta === 'MIXTO' || turnoAlta === '24X24') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {turnoAlta === '24X24' ? 'Grupo 24x24 (A o B) *' : 'Grupo Mixto (A, B o C) *'}
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
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSubMenuPlantilla('LISTA_GENERAL')}
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
      {oficialOtro && !bloqueadoPorHorario && (
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
                  <option value="SERVICIO ESPECIAL PROPIO">SERVICIO ESPECIAL PROPIO</option>
                  <option value="TRASLADO ENVIADO">TRASLADO ENVIADO</option>
                  <option value="VACACIONES">VACACIONES</option>
                  <option value="FALTA JUSTIFICADA">FALTA JUSTIFICADA</option>
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
                {tipoOtro === 'EGRESO' || tipoOtro === 'FALTA JUSTIFICADA'
                  ? 'Motivo * (Obligatorio)'
                  : 'Observación (Opcional)'}
              </label>
              <textarea
                required={tipoOtro === 'EGRESO' || tipoOtro === 'FALTA JUSTIFICADA'}
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
    </div>
  );
}
