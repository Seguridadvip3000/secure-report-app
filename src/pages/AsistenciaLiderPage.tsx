import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import PaseAsistenciaDiariaPanel from '../components/PaseAsistenciaDiariaPanel';
import {
  Users,
  UserPlus,
  UserMinus,
  History,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Building2,
  ClipboardCheck,
  Lock,
  Mail,
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

interface OficialPlantilla {
  id: string;
  proyecto: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  cargo: CargoOperativo;
  grupo: 'A' | 'B' | 'C';
  turno: 'MIXTO' | 'DIURNO' | 'NOCTURNO';
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
  | 'SERVICIO ESPECIAL PROPIO';

type TipoBajaPlantilla =
  | 'EGRESO'
  | 'TRASLADO ENVIADO'
  | 'SERVICIO ESPECIAL ENVIADO';

interface MovimientoPlantilla {
  id: string;
  proyecto: string;
  cedula: string;
  nombre_completo: string;
  cargo?: string;
  grupo: string;
  turno?: string;
  tipo_movimiento: TipoAltaPlantilla | TipoBajaPlantilla;
  proyecto_relacionado?: string | null;
  observacion?: string | null;
  registrado_por?: string | null;
  created_at: string;
}

const obtenerHoraCaracas = () => {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  const [hh, mm] = partes.split(':').map(Number);
  return { hora: hh, minuto: mm, texto: partes };
};
export default function AsistenciaLiderPage() {
  const { currentUser } = useAuth();

  const rolActual = (currentUser?.role || '').toLowerCase();
  const esLider = rolActual === 'lider';
  const { hora: horaCaracas, texto: horaTexto } = obtenerHoraCaracas();
  const plantillaBloqueadaPorHorario = esLider && horaCaracas >= 9;

  const proyectosUsuario: string[] =
    Array.isArray(currentUser?.proyectos) && currentUser.proyectos.length > 0
      ? currentUser.proyectos
      : currentUser?.proyecto_id
      ? [currentUser.proyecto_id]
      : ['SIN PROYECTO ASIGNADO'];

  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>(proyectosUsuario.at(0) || 'SIN PROYECTO ASIGNADO');
  const [listaProyectosGlobales, setListaProyectosGlobales] = useState<string[]>([]);
  const [seccionPrincipal, setSeccionPrincipal] = useState<'PLANTILLA' | 'PASE_ASISTENCIA'>('PLANTILLA');
  const [subMenuPlantilla, setSubMenuPlantilla] = useState<'ACTIVA' | 'REGISTRAR' | 'HISTORIAL'>('ACTIVA');

  const [plantillaActiva, setPlantillaActiva] = useState<OficialPlantilla[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoPlantilla[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [filtroGrupo, setFiltroGrupo] = useState<'TODOS' | 'A' | 'B' | 'C'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const [cedula, setCedula] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [cargoAlta, setCargoAlta] = useState<CargoOperativo>('OFICIAL');
  const [grupo, setGrupo] = useState<'A' | 'B' | 'C'>('A');
  const [turnoAlta, setTurnoAlta] = useState<'MIXTO' | 'DIURNO' | 'NOCTURNO'>('MIXTO');
  const [tipoIngreso, setTipoIngreso] = useState<TipoAltaPlantilla>('NUEVO INGRESO');
  const [proyectoOrigen, setProyectoOrigen] = useState('');
  const [observacionIngreso, setObservacionIngreso] = useState('');

  const [oficialParaBaja, setOficialParaBaja] = useState<OficialPlantilla | null>(null);
  const [tipoBaja, setTipoBaja] = useState<TipoBajaPlantilla>('EGRESO');
  const [turnoBaja, setTurnoBaja] = useState<'MIXTO' | 'DIURNO' | 'NOCTURNO'>('MIXTO');
  const [proyectoDestino, setProyectoDestino] = useState('');
  const [observacionBaja, setObservacionBaja] = useState('');

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

      const { data: usersTabla } = await supabase.from('users').select('proyectos');
      if (Array.isArray(usersTabla)) {
        usersTabla.forEach((u: any) => {
          if (Array.isArray(u?.proyectos)) {
            u.proyectos.forEach((pr: string) => {
              if (pr && pr !== '*') nombresProyectos.add(pr.trim());
            });
          }
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
        .order('grupo', { ascending: true })
        .order('apellidos', { ascending: true });

      if (errActivos) throw errActivos;
      setPlantillaActiva((dataActivos as OficialPlantilla[]) || []);

      const { data: dataMovs, error: errMovs } = await supabase
        .from('movimientos_plantilla')
        .select('*')
        .eq('proyecto', proyectoSeleccionado)
        .order('created_at', { ascending: false })
        .limit(100);

      if (errMovs) throw errMovs;
      setMovimientos((dataMovs as MovimientoPlantilla[]) || []);
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error cargando plantilla: ' + (err?.message || 'Verifique conexión.'),
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
  const manejarRegistrarAlta = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (plantillaBloqueadaPorHorario) {
      setMensaje({
        tipo: 'error',
        texto: '⚠️ Horario cerrado (09:00 AM). Solicite este movimiento por correo a la Analista.',
      });
      return;
    }

    const cedulaLimpia = cedula.trim().toUpperCase();
    const nombresLimpios = nombres.trim().toUpperCase();
    const apellidosLimpios = apellidos.trim().toUpperCase();
    const requiereOrigen =
      tipoIngreso === 'TRASLADO RECIBIDO' || tipoIngreso === 'SERVICIO ESPECIAL RECIBIDO';

    if (!cedulaLimpia || !nombresLimpios || !apellidosLimpios) {
      setMensaje({ tipo: 'error', texto: 'Debe completar Cédula, Nombres y Apellidos.' });
      return;
    }

    if (requiereOrigen && !proyectoOrigen.trim()) {
      setMensaje({ tipo: 'error', texto: `Debe seleccionar el Proyecto de Origen para ${tipoIngreso}.` });
      return;
    }

    const yaExisteActivo = plantillaActiva.some(
      (p) => p.cedula.trim().toUpperCase() === cedulaLimpia && p.estado === 'ACTIVO'
    );
    if (yaExisteActivo) {
      setMensaje({
        tipo: 'error',
        texto: `La cédula ${cedulaLimpia} ya está ACTIVA en ${proyectoSeleccionado}.`,
      });
      return;
    }

    setGuardando(true);
    try {
      const ahora = new Date().toISOString();
      const origenLimpio = requiereOrigen ? proyectoOrigen.trim() : null;

      const { data: insertado, error: errInsert } = await supabase
        .from('plantilla_proyectos')
        .insert([
          {
            proyecto: proyectoSeleccionado,
            cedula: cedulaLimpia,
            nombres: nombresLimpios,
            apellidos: apellidosLimpios,
            cargo: cargoAlta,
            grupo,
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
          grupo,
          turno: turnoAlta,
          tipo_movimiento: tipoIngreso,
          proyecto_relacionado: origenLimpio,
          observacion: observacionIngreso.trim() || null,
          registrado_por: nombreRegistrador,
        },
      ]);

      setCedula('');
      setNombres('');
      setApellidos('');
      setCargoAlta('OFICIAL');
      setGrupo('A');
      setTurnoAlta('MIXTO');
      setProyectoOrigen('');
      setObservacionIngreso('');
      setSubMenuPlantilla('ACTIVA');
      setMensaje({
        tipo: 'exito',
        texto: `✅ ${nombresLimpios} ${apellidosLimpios} (${cargoAlta}) anexado (${tipoIngreso} • Grupo ${grupo} • Turno ${turnoAlta}).`,
      });
      await cargarDatosProyecto();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error al registrar: ' + (err?.message || 'Error de red.') });
    } finally {
      setGuardando(false);
    }
  };
  const confirmarBajaPlantilla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oficialParaBaja) return;
    setMensaje(null);

    if (plantillaBloqueadaPorHorario) {
      setMensaje({
        tipo: 'error',
        texto: '⚠️ Horario cerrado (09:00 AM). Solicite este movimiento por correo a la Analista.',
      });
      return;
    }

    const requiereDestino =
      tipoBaja === 'TRASLADO ENVIADO' || tipoBaja === 'SERVICIO ESPECIAL ENVIADO';

    if (tipoBaja === 'EGRESO' && !observacionBaja.trim()) {
      setMensaje({ tipo: 'error', texto: '⚠️ Debe escribir obligatoriamente el motivo del EGRESO para continuar.' });
      return;
    }

    if (requiereDestino && !proyectoDestino.trim()) {
      setMensaje({ tipo: 'error', texto: `⚠️ Debe seleccionar obligatoriamente el Proyecto Destino para ${tipoBaja}.` });
      return;
    }

    setGuardando(true);
    try {
      const ahora = new Date().toISOString();
      const destinoLimpio = requiereDestino ? proyectoDestino.trim() : null;
      const motivoLimpio = observacionBaja.trim() || null;
      const cargoOficial = oficialParaBaja.cargo || 'OFICIAL';

      const { error: errUpdate } = await supabase
        .from('plantilla_proyectos')
        .update({
          estado: 'INACTIVO',
          turno: turnoBaja,
          tipo_ultimo_movimiento: tipoBaja,
          proyecto_origen_destino: destinoLimpio,
          observacion: motivoLimpio,
          fecha_egreso: ahora,
          updated_at: ahora,
        })
        .eq('id', oficialParaBaja.id);

      if (errUpdate) throw errUpdate;

      await supabase.from('movimientos_plantilla').insert([
        {
          plantilla_id: oficialParaBaja.id,
          proyecto: proyectoSeleccionado,
          cedula: oficialParaBaja.cedula,
          nombre_completo: `${oficialParaBaja.nombres} ${oficialParaBaja.apellidos}`,
          cargo: cargoOficial,
          grupo: oficialParaBaja.grupo,
          turno: turnoBaja,
          tipo_movimiento: tipoBaja,
          proyecto_relacionado: destinoLimpio,
          observacion: motivoLimpio,
          registrado_por: nombreRegistrador,
        },
      ]);

      if (requiereDestino && destinoLimpio) {
        const tipoContraparte =
          tipoBaja === 'TRASLADO ENVIADO' ? 'TRASLADO RECIBIDO' : 'SERVICIO ESPECIAL RECIBIDO';

        const { data: nuevoDestino } = await supabase
          .from('plantilla_proyectos')
          .insert([
            {
              proyecto: destinoLimpio,
              cedula: oficialParaBaja.cedula,
              nombres: oficialParaBaja.nombres,
              apellidos: oficialParaBaja.apellidos,
              cargo: cargoOficial,
              grupo: oficialParaBaja.grupo,
              turno: turnoBaja,
              estado: 'ACTIVO',
              tipo_ultimo_movimiento: tipoContraparte,
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
              cedula: oficialParaBaja.cedula,
              nombre_completo: `${oficialParaBaja.nombres} ${oficialParaBaja.apellidos}`,
              cargo: cargoOficial,
              grupo: oficialParaBaja.grupo,
              turno: turnoBaja,
              tipo_movimiento: tipoContraparte,
              proyecto_relacionado: proyectoSeleccionado,
              observacion: motivoLimpio,
              registrado_por: nombreRegistrador,
            },
          ]);
        }
      }

      setMensaje({
        tipo: 'exito',
        texto: `✅ Movimiento ${tipoBaja} de ${oficialParaBaja.nombres} ${oficialParaBaja.apellidos} (${cargoOficial} • Turno ${turnoBaja}) procesado.`,
      });
      setOficialParaBaja(null);
      setTipoBaja('EGRESO');
      setProyectoDestino('');
      setObservacionBaja('');
      await cargarDatosProyecto();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error al procesar salida: ' + (err?.message || 'Error.') });
    } finally {
      setGuardando(false);
    }
  };
  const enviarCorreoPlantillaAnalista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoCorreoPlantilla.trim()) return;

    await supabase.from('notifications').insert([
      {
        title: `📩 Solicitud de Movimiento en Plantilla — ${proyectoSeleccionado}`,
        body: `Líder ${nombreRegistrador} solicita movimiento en plantilla (${proyectoSeleccionado}): ${motivoCorreoPlantilla.trim()}`,
        target_roles: ['analista', 'operaciones', 'administrador'],
        target_project: proyectoSeleccionado,
      },
    ]);

    const destinatarios = correosAnalistas.join(',');
    const asunto = encodeURIComponent(`Solicitud de Movimiento en Plantilla - ${proyectoSeleccionado}`);
    const cuerpo = encodeURIComponent(
      `Buen día Estimada Analista,\n\nSolicito registrar el siguiente movimiento en la plantilla del proyecto ${proyectoSeleccionado}:\n\n${motivoCorreoPlantilla.trim()}\n\nSolicitado por: ${nombreRegistrador}`
    );
    window.location.href = `mailto:${destinatarios}?subject=${asunto}&body=${cuerpo}`;
    setMotivoCorreoPlantilla('');
    setMensaje({ tipo: 'exito', texto: '✅ Correo preparado para la Analista.' });
  };

  const plantillaFiltrada = plantillaActiva.filter((item) => {
    const coincideGrupo = filtroGrupo === 'TODOS' || item.grupo === filtroGrupo;
    const texto = `${item.cedula} ${item.nombres} ${item.apellidos} ${item.cargo || ''}`.toLowerCase();
    return coincideGrupo && texto.includes(busqueda.toLowerCase().trim());
  });

  const totalGrupoA = plantillaActiva.filter((p) => p.grupo === 'A').length;
  const totalGrupoB = plantillaActiva.filter((p) => p.grupo === 'B').length;
  const totalGrupoC = plantillaActiva.filter((p) => p.grupo === 'C').length;
  const proyectosParaTraslado = listaProyectosGlobales.filter((p) => p !== proyectoSeleccionado);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-blue-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Módulo Operativo</span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <ClipboardCheck className="text-blue-600" size={26} /> Control de Asistencia y Plantilla
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro permitido para Líderes hasta las <strong>09:00 AM</strong>.
          </p>
        </div>

        <div className="w-full md:w-72">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
            <Building2 size={14} /> Proyecto Activo
          </label>
          <select
            value={proyectoSeleccionado}
            onChange={(e) => setProyectoSeleccionado(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          onClick={() => setSeccionPrincipal('PLANTILLA')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            seccionPrincipal === 'PLANTILLA' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users size={18} /> PLANTILLA DEL PROYECTO
        </button>

        <button
          type="button"
          onClick={() => setSeccionPrincipal('PASE_ASISTENCIA')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            seccionPrincipal === 'PASE_ASISTENCIA' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardCheck size={18} /> PASE DE ASISTENCIA DIARIA
        </button>
      </div>
      {seccionPrincipal === 'PLANTILLA' ? (
        <div className="space-y-5">
          {plantillaBloqueadaPorHorario && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Lock className="text-amber-700 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm uppercase">
                    Movimientos de Plantilla Cerrados (Hora actual: {horaTexto} — Límite: 09:00 AM)
                  </h4>
                  <p className="text-xs text-amber-800 mt-1">
                    Después de las 09:00 AM no puede registrar altas, traslados ni egresos. Envíe correo a la Analista:
                  </p>
                </div>
              </div>
              <form onSubmit={enviarCorreoPlantillaAnalista} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={motivoCorreoPlantilla}
                  onChange={(e) => setMotivoCorreoPlantilla(e.target.value)}
                  placeholder="Describa el ingreso, traslado o egreso requerido..."
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubMenuPlantilla('ACTIVA')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer ${
                subMenuPlantilla === 'ACTIVA'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Users size={16} /> Plantilla Activa ({plantillaActiva.length})
            </button>

            {!plantillaBloqueadaPorHorario && (
              <button
                type="button"
                onClick={() => setSubMenuPlantilla('REGISTRAR')}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer ${
                  subMenuPlantilla === 'REGISTRAR'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <UserPlus size={16} /> Registrar Plantilla
              </button>
            )}

            <button
              type="button"
              onClick={() => setSubMenuPlantilla('HISTORIAL')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer ${
                subMenuPlantilla === 'HISTORIAL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <History size={16} /> Historial ({movimientos.length})
            </button>
          </div>
          {subMenuPlantilla === 'ACTIVA' && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setFiltroGrupo('TODOS')}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    filtroGrupo === 'TODOS' ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-500 uppercase">Total</div>
                  <div className="text-2xl font-black text-slate-800">{plantillaActiva.length}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroGrupo('A')}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    filtroGrupo === 'A' ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold text-blue-600 uppercase">Grupo A</div>
                  <div className="text-2xl font-black text-slate-800">{totalGrupoA}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroGrupo('B')}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    filtroGrupo === 'B' ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold text-indigo-600 uppercase">Grupo B</div>
                  <div className="text-2xl font-black text-slate-800">{totalGrupoB}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroGrupo('C')}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    filtroGrupo === 'C' ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold text-purple-600 uppercase">Grupo C</div>
                  <div className="text-2xl font-black text-slate-800">{totalGrupoC}</div>
                </button>
              </div>

              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por cédula, nombres, apellidos o cargo..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {cargando ? (
                <p className="text-center text-slate-500 py-8 text-sm">Cargando plantilla...</p>
              ) : plantillaFiltrada.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <p className="text-slate-500 text-sm">
                    No hay personal activo registrado para <strong>{proyectoSeleccionado}</strong>.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {plantillaFiltrada.map((oficial) => (
                    <div
                      key={oficial.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-100 text-blue-800">
                            GRUPO {oficial.grupo}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-teal-100 text-teal-800">
                            {oficial.cargo || 'OFICIAL'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-slate-800 text-white">
                            {oficial.turno || 'MIXTO'}
                          </span>
                          <span className="font-bold text-slate-800 text-sm">
                            {oficial.apellidos}, {oficial.nombres}
                          </span>
                          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            C.I. {oficial.cedula}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Alta: <strong>{oficial.tipo_ultimo_movimiento}</strong>
                          {oficial.proyecto_origen_destino ? ` (Desde: ${oficial.proyecto_origen_destino})` : ''} •{' '}
                          {new Date(oficial.fecha_ingreso).toLocaleDateString('es-VE')}
                        </p>
                      </div>

                      {!plantillaBloqueadaPorHorario && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMensaje(null);
                              setOficialParaBaja(oficial);
                              setTipoBaja('EGRESO');
                              setTurnoBaja(oficial.turno || 'MIXTO');
                              setProyectoDestino('');
                              setObservacionBaja('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 flex items-center gap-1 cursor-pointer"
                          >
                            <UserMinus size={14} /> Egreso
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMensaje(null);
                              setOficialParaBaja(oficial);
                              setTipoBaja('TRASLADO ENVIADO');
                              setTurnoBaja(oficial.turno || 'MIXTO');
                              setProyectoDestino('');
                              setObservacionBaja('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowRightLeft size={14} /> Traslado / Serv. Esp. Enviado
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {subMenuPlantilla === 'REGISTRAR' && !plantillaBloqueadaPorHorario && (
            <form
              onSubmit={manejarRegistrarAlta}
              className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5"
            >
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="text-emerald-600" size={20} /> Registrar Personal en Plantilla
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Se anexará automáticamente a la plantilla activa de <strong>{proyectoSeleccionado}</strong>.
                </p>
              </div>

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
                    placeholder="Ej: JUAN CARLOS"
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
                    placeholder="Ej: PÉREZ GÓMEZ"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Grupo *</label>
                    <select
                      value={grupo}
                      onChange={(e) => setGrupo(e.target.value as 'A' | 'B' | 'C')}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800"
                    >
                      <option value="A">GRUPO A</option>
                      <option value="B">GRUPO B</option>
                      <option value="C">GRUPO C</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Turno *</label>
                    <select
                      required
                      value={turnoAlta}
                      onChange={(e) => setTurnoAlta(e.target.value as 'MIXTO' | 'DIURNO' | 'NOCTURNO')}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-blue-800 bg-blue-50/40"
                    >
                      <option value="MIXTO">MIXTO</option>
                      <option value="DIURNO">DIURNO</option>
                      <option value="NOCTURNO">NOCTURNO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Alta *</label>
                  <select
                    value={tipoIngreso}
                    onChange={(e) => {
                      setTipoIngreso(e.target.value as TipoAltaPlantilla);
                      setProyectoOrigen('');
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50/50"
                  >
                    <option value="NUEVO INGRESO">NUEVO INGRESO</option>
                    <option value="TRASLADO RECIBIDO">TRASLADO RECIBIDO</option>
                    <option value="SERVICIO ESPECIAL RECIBIDO">SERVICIO ESPECIAL RECIBIDO</option>
                    <option value="SERVICIO ESPECIAL PROPIO">SERVICIO ESPECIAL PROPIO</option>
                  </select>
                </div>

                {(tipoIngreso === 'TRASLADO RECIBIDO' || tipoIngreso === 'SERVICIO ESPECIAL RECIBIDO') && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">
                      Proyecto de Origen * (Obligatorio)
                    </label>
                    <select
                      required
                      value={proyectoOrigen}
                      onChange={(e) => setProyectoOrigen(e.target.value)}
                      className="w-full border border-emerald-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Seleccione el Proyecto de Origen --</option>
                      {proyectosParaTraslado.map((proy) => (
                        <option key={proy} value={proy}>
                          {proy}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observación (Opcional)</label>
                <input
                  type="text"
                  value={observacionIngreso}
                  onChange={(e) => setObservacionIngreso(e.target.value)}
                  placeholder="Detalle adicional..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubMenuPlantilla('ACTIVA')}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    guardando ||
                    ((tipoIngreso === 'TRASLADO RECIBIDO' || tipoIngreso === 'SERVICIO ESPECIAL RECIBIDO') &&
                      !proyectoOrigen.trim())
                  }
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {guardando ? 'Guardando...' : 'Anexar a Plantilla'}
                </button>
              </div>
            </form>
          )}
          {subMenuPlantilla === 'HISTORIAL' && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                <History size={18} className="text-blue-600" /> Historial de Movimientos
              </h2>
              {movimientos.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">Aún no hay movimientos registrados.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {movimientos.map((mov) => {
                    const esAlta =
                      mov.tipo_movimiento === 'NUEVO INGRESO' ||
                      mov.tipo_movimiento === 'TRASLADO RECIBIDO' ||
                      mov.tipo_movimiento === 'SERVICIO ESPECIAL RECIBIDO' ||
                      mov.tipo_movimiento === 'SERVICIO ESPECIAL PROPIO';
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
                            {mov.cargo && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800">
                                {mov.cargo}
                              </span>
                            )}
                            {mov.turno && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-white">
                                {mov.turno}
                              </span>
                            )}
                            <span className="font-bold text-sm text-slate-800">{mov.nombre_completo}</span>
                            <span className="text-xs text-slate-500">
                              (C.I. {mov.cedula} • Grupo {mov.grupo})
                            </span>
                          </div>
                          {mov.proyecto_relacionado && (
                            <p className="text-xs text-slate-600 mt-0.5">
                              {esAlta ? 'Proyecto de Origen:' : 'Proyecto Destino:'}{' '}
                              <strong>{mov.proyecto_relacionado}</strong>
                            </p>
                          )}
                          {mov.observacion && (
                            <p className="text-xs text-slate-600 mt-0.5">
                              Motivo / Detalle: <strong>{mov.observacion}</strong>
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 text-right">
                          <div>{new Date(mov.created_at).toLocaleString('es-VE')}</div>
                          <div>Por: {mov.registrado_por}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <PaseAsistenciaDiariaPanel
          proyectoSeleccionado={proyectoSeleccionado}
          plantillaActiva={plantillaActiva}
          listaProyectosGlobales={listaProyectosGlobales}
          nombreRegistrador={nombreRegistrador}
        />
      )}
      {oficialParaBaja && !plantillaBloqueadaPorHorario && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={confirmarBajaPlantilla} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">Registrar Salida / Traslado de Plantilla</h3>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Oficial: <strong>{oficialParaBaja.nombres} {oficialParaBaja.apellidos}</strong> ({oficialParaBaja.cargo || 'OFICIAL'})
              <br />
              Cédula: <strong>{oficialParaBaja.cedula}</strong> • Grupo: <strong>{oficialParaBaja.grupo}</strong>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Movimiento *</label>
                <select
                  value={tipoBaja}
                  onChange={(e) => {
                    setTipoBaja(e.target.value as TipoBajaPlantilla);
                    setProyectoDestino('');
                    setObservacionBaja('');
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-red-700 bg-red-50/40"
                >
                  <option value="EGRESO">EGRESO</option>
                  <option value="TRASLADO ENVIADO">TRASLADO ENVIADO</option>
                  <option value="SERVICIO ESPECIAL ENVIADO">SERVICIO ESPECIAL ENVIADO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Turno *</label>
                <select
                  required
                  value={turnoBaja}
                  onChange={(e) => setTurnoBaja(e.target.value as 'MIXTO' | 'DIURNO' | 'NOCTURNO')}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-blue-800 bg-blue-50/40"
                >
                  <option value="MIXTO">MIXTO</option>
                  <option value="DIURNO">DIURNO</option>
                  <option value="NOCTURNO">NOCTURNO</option>
                </select>
              </div>
            </div>

            {tipoBaja !== 'EGRESO' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Proyecto Destino * (Obligatorio)
                  </label>
                  <select
                    required
                    value={proyectoDestino}
                    onChange={(e) => setProyectoDestino(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Seleccione el Proyecto Destino --</option>
                    {proyectosParaTraslado.map((proy) => (
                      <option key={proy} value={proy}>
                        {proy}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Observación (Opcional)
                  </label>
                  <input
                    type="text"
                    value={observacionBaja}
                    onChange={(e) => setObservacionBaja(e.target.value)}
                    placeholder="Detalle adicional..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-bold text-red-700 uppercase mb-1">
                  Motivo del Egreso * (Obligatorio)
                </label>
                <textarea
                  required
                  rows={3}
                  value={observacionBaja}
                  onChange={(e) => setObservacionBaja(e.target.value)}
                  placeholder="Escriba obligatoriamente el motivo del egreso..."
                  className="w-full border border-red-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOficialParaBaja(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  guardando ||
                  (tipoBaja === 'EGRESO' && !observacionBaja.trim()) ||
                  (tipoBaja !== 'EGRESO' && !proyectoDestino.trim())
                }
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guardando ? 'Procesando...' : `Confirmar ${tipoBaja}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
