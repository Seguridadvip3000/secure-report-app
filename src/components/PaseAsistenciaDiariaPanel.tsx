import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  CheckCircle2,
  AlertCircle,
  Save,
  UserPlus,
  Calendar,
  Clock,
  Users,
  ArrowRightLeft,
  Lock,
  Mail,
} from 'lucide-react';

interface OficialPlantilla {
  id: string;
  proyecto: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  grupo: 'A' | 'B' | 'C';
  turno?: 'MIXTO' | 'DIURNO' | 'NOCTURNO';
}

export type EstatusAsistenciaOficial =
  | 'PRESENTE'
  | 'APOYO ENVIADO'
  | 'SERVICIO ESPECIAL PROPIO'
  | 'SERVICIO ESPECIAL ENVIADO'
  | 'FALTA INJUSTIFICADA'
  | 'REPOSO MEDICO'
  | 'PERMISO'
  | 'DESCANSO';

interface RegistroFila {
  cedula: string;
  nombre_completo: string;
  grupo: 'A' | 'B' | 'C';
  hora_entrada: string;
  estatus: EstatusAsistenciaOficial;
  proyecto_apoyo: string;
  observacion: string;
}

interface Props {
  proyectoSeleccionado: string;
  plantillaActiva: OficialPlantilla[];
  listaProyectosGlobales: string[];
  nombreRegistrador: string;
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

export default function PaseAsistenciaDiariaPanel({
  proyectoSeleccionado,
  plantillaActiva,
  listaProyectosGlobales,
  nombreRegistrador,
}: Props) {
  const { currentUser } = useAuth();
  const inicialCaracas = obtenerFechaHoraCaracas();

  const rolActual = (currentUser?.role || '').toLowerCase();
  const esLider = rolActual === 'lider';
  const puedeEditarFechaYHora = ['directiva', 'administrador', 'admin'].includes(rolActual);

  const [fecha, setFecha] = useState<string>(inicialCaracas.fechaStr);
  const [horaAutomatica, setHoraAutomatica] = useState<string>(inicialCaracas.hora12);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<'A' | 'B' | 'C'>('A');
  const [turno, setTurno] = useState<'MIXTO' | 'DIURNO' | 'NOCTURNO'>('MIXTO');

  const [filas, setFilas] = useState<Record<string, RegistroFila>>({});
  const [externosRecibidosHoy, setExternosRecibidosHoy] = useState<any[]>([]);
  const [yaGuardadoHoy, setYaGuardadoHoy] = useState(false);

  const [mostrarFormExterno, setMostrarFormExterno] = useState(false);
  const [tipoExterno, setTipoExterno] = useState<'APOYO RECIBIDO' | 'SERVICIO ESPECIAL RECIBIDO'>('APOYO RECIBIDO');
  const [cedulaExt, setCedulaExt] = useState('');
  const [nombreExt, setNombreExt] = useState('');
  const [origenExt, setOrigenExt] = useState('');
  const [horaEntradaExt, setHoraEntradaExt] = useState<string>(inicialCaracas.hora12);
  const [obsExt, setObsExt] = useState('');

  const [correosAnalistas, setCorreosAnalistas] = useState<string[]>([]);
  const [motivoSolicitudCambio, setMotivoSolicitudCambio] = useState('');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Actualizar reloj automático en vivo si el usuario no está editando manualmente
  useEffect(() => {
    const timer = setInterval(() => {
      const actual = obtenerFechaHoraCaracas();
      setHoraAutomatica(actual.hora12);
      if (!puedeEditarFechaYHora) {
        setFecha(actual.fechaStr);
        setHoraEntradaExt(actual.hora12);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [puedeEditarFechaYHora]);

  const { fechaStr: hoyLocal, horaNum: horaCaracas, hora24: horaTexto } = obtenerFechaHoraCaracas();
  const pasoHoraLimite = fecha < hoyLocal || (fecha === hoyLocal && horaCaracas >= 9);
  const bloqueadoParaLider = esLider && (pasoHoraLimite || yaGuardadoHoy);

  const oficialesDelGrupo = plantillaActiva.filter((o) => o.grupo === grupoSeleccionado);
  const otrosProyectos = listaProyectosGlobales.filter((p) => p !== proyectoSeleccionado);
  useEffect(() => {
    const cargarCorreosAnalistas = async () => {
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
    cargarCorreosAnalistas();
  }, []);

  const cargarAsistenciaExistente = async () => {
    setCargando(true);
    setMensaje(null);
    try {
      const actual = obtenerFechaHoraCaracas();
      const { data, error } = await supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .eq('proyecto', proyectoSeleccionado)
        .eq('fecha', fecha)
        .eq('turno', turno);

      if (error) throw error;

      const mapaExistente: Record<string, any> = {};
      const recibidos: any[] = [];
      let existeDelGrupo = false;

      (data || []).forEach((reg: any) => {
        if (reg.estatus === 'APOYO RECIBIDO' || reg.estatus === 'SERVICIO ESPECIAL RECIBIDO') {
          recibidos.push(reg);
        } else {
          mapaExistente[reg.cedula.toUpperCase()] = reg;
          if (reg.grupo === grupoSeleccionado) {
            existeDelGrupo = true;
          }
        }
      });

      const faltantesPost9AM: any[] = [];
      if (pasoHoraLimite && oficialesDelGrupo.length > 0) {
        oficialesDelGrupo.forEach((of) => {
          const ced = of.cedula.toUpperCase();
          const turnoOficial = of.turno || 'MIXTO';
          if (!mapaExistente[ced] && turnoOficial === turno) {
            const autoFalta = {
              fecha,
              proyecto: proyectoSeleccionado,
              proyecto_apoyo: null,
              cedula: ced,
              nombre_completo: `${of.apellidos}, ${of.nombres}`,
              grupo: of.grupo,
              turno,
              hora_entrada: '--:--',
              estatus: 'FALTA INJUSTIFICADA',
              observacion: 'Falta automática: sin registro antes de las 09:00 AM',
              registrado_por: 'SISTEMA (CIERRE 09:00 AM)',
            };
            faltantesPost9AM.push(autoFalta);
            mapaExistente[ced] = autoFalta;
          }
        });

        if (faltantesPost9AM.length > 0) {
          await supabase
            .from('asistencias_diarias_oficiales')
            .upsert(faltantesPost9AM, { onConflict: 'fecha,proyecto,cedula,turno' });
          existeDelGrupo = true;
        }
      }

      setYaGuardadoHoy(existeDelGrupo);

      const nuevasFilas: Record<string, RegistroFila> = {};
      oficialesDelGrupo.forEach((of) => {
        const ced = of.cedula.toUpperCase();
        const prev = mapaExistente[ced];
        nuevasFilas[ced] = {
          cedula: ced,
          nombre_completo: `${of.apellidos}, ${of.nombres}`,
          grupo: of.grupo,
          hora_entrada: prev?.hora_entrada || actual.hora12,
          estatus: prev?.estatus || (pasoHoraLimite ? 'FALTA INJUSTIFICADA' : 'PRESENTE'),
          proyecto_apoyo: prev?.proyecto_apoyo || '',
          observacion: prev?.observacion || '',
        };
      });

      setFilas(nuevasFilas);
      setExternosRecibidosHoy(recibidos);
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error cargando asistencia del día: ' + (err?.message || 'Verifique conexión.'),
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAsistenciaExistente();
  }, [proyectoSeleccionado, fecha, turno, grupoSeleccionado, plantillaActiva.length]);

  const actualizarFila = (cedula: string, campo: keyof RegistroFila, valor: string) => {
    if (bloqueadoParaLider) return;
    if (campo === 'hora_entrada' && !puedeEditarFechaYHora) return;
    const requiereDestino = valor === 'APOYO ENVIADO' || valor === 'SERVICIO ESPECIAL ENVIADO';
    setFilas((prev) => ({
      ...prev,
      [cedula]: {
        ...prev[cedula],
        [campo]: valor,
        ...(campo === 'estatus' && !requiereDestino ? { proyecto_apoyo: '' } : {}),
      },
    }));
  };
  const guardarPaseAsistencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (bloqueadoParaLider) {
      setMensaje({
        tipo: 'error',
        texto: '⚠️ El registro de asistencia está cerrado. Solicite la modificación por correo a la Analista.',
      });
      return;
    }

    const listaFilas = Object.values(filas);
    if (listaFilas.length === 0) {
      setMensaje({
        tipo: 'error',
        texto: `No hay oficiales activos en el Grupo ${grupoSeleccionado} para pasar asistencia.`,
      });
      return;
    }

    const sinDestino = listaFilas.find(
      (f) =>
        (f.estatus === 'APOYO ENVIADO' || f.estatus === 'SERVICIO ESPECIAL ENVIADO') &&
        !f.proyecto_apoyo.trim()
    );
    if (sinDestino) {
      setMensaje({
        tipo: 'error',
        texto: `⚠️ Seleccione el proyecto destino para ${sinDestino.nombre_completo} (${sinDestino.estatus}).`,
      });
      return;
    }

    setGuardando(true);
    try {
      const momentoExacto = obtenerFechaHoraCaracas();
      const fechaFinal = puedeEditarFechaYHora ? fecha : momentoExacto.fechaStr;

      const payload = listaFilas.map((f) => {
        const sinMarcaHorario = f.estatus === 'FALTA INJUSTIFICADA' || f.estatus === 'DESCANSO';
        const horaFinal = sinMarcaHorario
          ? '--:--'
          : puedeEditarFechaYHora
          ? f.hora_entrada || momentoExacto.hora12
          : momentoExacto.hora12;

        return {
          fecha: fechaFinal,
          proyecto: proyectoSeleccionado,
          proyecto_apoyo:
            f.estatus === 'APOYO ENVIADO' || f.estatus === 'SERVICIO ESPECIAL ENVIADO'
              ? f.proyecto_apoyo.trim()
              : null,
          cedula: f.cedula,
          nombre_completo: f.nombre_completo,
          grupo: f.grupo,
          turno,
          hora_entrada: horaFinal,
          estatus: f.estatus,
          observacion: f.observacion.trim() || null,
          registrado_por: nombreRegistrador,
          updated_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('asistencias_diarias_oficiales')
        .upsert(payload, { onConflict: 'fecha,proyecto,cedula,turno' });

      if (error) throw error;

      setYaGuardadoHoy(true);
      await cargarAsistenciaExistente();
      setMensaje({
        tipo: 'exito',
        texto: `✅ Asistencia del Grupo ${grupoSeleccionado} (Turno ${turno} • ${fechaFinal} • ${momentoExacto.hora12}) guardada y cerrada con éxito.`,
      });
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error al guardar asistencia: ' + (err?.message || 'Verifique conexión.'),
      });
    } finally {
      setGuardando(false);
    }
  };

  const enviarSolicitudCorreoAnalista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoSolicitudCambio.trim()) return;

    setEnviandoSolicitud(true);
    try {
      await supabase.from('notifications').insert([
        {
          title: `📩 Solicitud de Ajuste de Asistencia — ${proyectoSeleccionado}`,
          body: `Líder ${nombreRegistrador} solicita modificar asistencia (${fecha} • Grupo ${grupoSeleccionado} • Turno ${turno}): ${motivoSolicitudCambio.trim()}`,
          target_roles: ['analista', 'operaciones', 'administrador'],
          target_project: proyectoSeleccionado,
        },
      ]);

      const destinatarios = correosAnalistas.length > 0 ? correosAnalistas.join(',') : '';
      const asunto = encodeURIComponent(
        `Solicitud de Modificación de Asistencia - ${proyectoSeleccionado} (${fecha})`
      );
      const cuerpo = encodeURIComponent(
        `Buen día Estimada Analista,\n\n` +
          `Solicito su apoyo para modificar la asistencia diaria:\n` +
          `• Proyecto: ${proyectoSeleccionado}\n` +
          `• Fecha: ${fecha}\n` +
          `• Grupo: ${grupoSeleccionado} | Turno: ${turno}\n` +
          `• Solicitado por: ${nombreRegistrador}\n\n` +
          `Detalle de la corrección:\n${motivoSolicitudCambio.trim()}\n\n` +
          `Saludos cordiales.`
      );

      window.location.href = `mailto:${destinatarios}?subject=${asunto}&body=${cuerpo}`;

      setMensaje({
        tipo: 'exito',
        texto: '✅ Solicitud enviada y correo preparado para la Analista.',
      });
      setMotivoSolicitudCambio('');
    } finally {
      setEnviandoSolicitud(false);
    }
  };
  const registrarExternoRecibido = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (bloqueadoParaLider) return;

    const cedLimpia = cedulaExt.trim().toUpperCase();
    const nomLimpio = nombreExt.trim().toUpperCase();

    if (!cedLimpia || !nomLimpio || !origenExt.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Complete Cédula, Nombre Completo y Proyecto de Origen.',
      });
      return;
    }

    setGuardando(true);
    try {
      const momentoExacto = obtenerFechaHoraCaracas();
      const fechaFinal = puedeEditarFechaYHora ? fecha : momentoExacto.fechaStr;
      const horaFinal = puedeEditarFechaYHora ? horaEntradaExt : momentoExacto.hora12;

      const { error } = await supabase.from('asistencias_diarias_oficiales').upsert(
        [
          {
            fecha: fechaFinal,
            proyecto: proyectoSeleccionado,
            proyecto_apoyo: origenExt.trim(),
            cedula: cedLimpia,
            nombre_completo: nomLimpio,
            grupo: grupoSeleccionado,
            turno,
            hora_entrada: horaFinal,
            estatus: tipoExterno,
            observacion: obsExt.trim() || `${tipoExterno} desde ${origenExt.trim()}`,
            registrado_por: nombreRegistrador,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'fecha,proyecto,cedula,turno' }
      );

      if (error) throw error;

      setCedulaExt('');
      setNombreExt('');
      setOrigenExt('');
      setObsExt('');
      setMostrarFormExterno(false);
      setMensaje({
        tipo: 'exito',
        texto: `✅ ${tipoExterno} de ${nomLimpio} (${cedLimpia}) registrado automáticamente a las ${horaFinal}.`,
      });
      await cargarAsistenciaExistente();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error registrando personal recibido: ' + (err?.message || 'Error.'),
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
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

      {bloqueadoParaLider && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Lock className="text-amber-700 shrink-0 mt-0.5" size={22} />
            <div>
              <h4 className="font-bold text-amber-900 text-sm uppercase">
                {yaGuardadoHoy
                  ? 'Asistencia Cerrada — Ya fue guardada para este Grupo y Turno'
                  : `Horario Cerrado (Hora actual: ${horaTexto} — Límite: 09:00 AM)`}
              </h4>
              <p className="text-xs text-amber-800 mt-1">
                Después de las <strong>09:00 AM</strong> o tras guardar la asistencia, cualquier oficial sin movimiento queda marcado como falta y solo la{' '}
                <strong>Analista</strong> puede modificarla. Envíe un correo explicando el ajuste requerido:
              </p>
            </div>
          </div>

          <form onSubmit={enviarSolicitudCorreoAnalista} className="space-y-3 pt-2 border-t border-amber-200">
            <label className="block text-xs font-bold text-amber-900 uppercase">
              Detalle de la modificación requerida para la Analista *
            </label>
            <textarea
              required
              rows={2}
              value={motivoSolicitudCambio}
              onChange={(e) => setMotivoSolicitudCambio(e.target.value)}
              placeholder="Ej: Por favor corregir al oficial V-12345678..."
              className="w-full border border-amber-300 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={enviandoSolicitud || !motivoSolicitudCambio.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Mail size={15} /> Enviar Correo a la Analista
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Calendar size={14} /> Fecha Automática
          </label>
          {puedeEditarFechaYHora ? (
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800"
            />
          ) : (
            <div className="w-full border border-slate-200 bg-slate-100 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 flex items-center justify-between">
              <span>{fecha}</span>
              <span className="text-[10px] uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-600">Automática</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Users size={14} /> Grupo en Guardia
          </label>
          <select
            value={grupoSeleccionado}
            onChange={(e) => setGrupoSeleccionado(e.target.value as 'A' | 'B' | 'C')}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-blue-700 bg-blue-50/40"
          >
            <option value="A">GRUPO A ({plantillaActiva.filter((p) => p.grupo === 'A').length})</option>
            <option value="B">GRUPO B ({plantillaActiva.filter((p) => p.grupo === 'B').length})</option>
            <option value="C">GRUPO C ({plantillaActiva.filter((p) => p.grupo === 'C').length})</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Clock size={14} /> Turno Correspondiente *
          </label>
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value as 'MIXTO' | 'DIURNO' | 'NOCTURNO')}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 bg-slate-50"
          >
            <option value="MIXTO">MIXTO</option>
            <option value="DIURNO">DIURNO</option>
            <option value="NOCTURNO">NOCTURNO</option>
          </select>
        </div>
      </div>
      <form onSubmit={guardarPaseAsistencia} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Pase de Lista — Grupo {grupoSeleccionado} (Turno {turno})
            </h3>
            <p className="text-xs text-slate-500">
              Hora automática del sistema: <strong>{horaAutomatica}</strong> • Cierre obligatorio: <strong>09:00 AM</strong>.
            </p>
          </div>
          {!bloqueadoParaLider && (
            <button
              type="button"
              onClick={() => setMostrarFormExterno(!mostrarFormExterno)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer self-start"
            >
              <UserPlus size={15} /> + Apoyo / Serv. Especial Recibido
            </button>
          )}
        </div>

        {cargando ? (
          <p className="text-center text-slate-500 py-8 text-sm">Cargando lista del grupo...</p>
        ) : oficialesDelGrupo.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">
            No hay oficiales activos asignados al <strong>Grupo {grupoSeleccionado}</strong> en{' '}
            <strong>{proyectoSeleccionado}</strong>.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {oficialesDelGrupo.map((of) => {
              const ced = of.cedula.toUpperCase();
              const fila = filas[ced] || {
                cedula: ced,
                nombre_completo: `${of.apellidos}, ${of.nombres}`,
                grupo: of.grupo,
                hora_entrada: horaAutomatica,
                estatus: 'PRESENTE',
                proyecto_apoyo: '',
                observacion: '',
              };

              const requiereDestino =
                fila.estatus === 'APOYO ENVIADO' || fila.estatus === 'SERVICIO ESPECIAL ENVIADO';
              const sinMarcaHorario = fila.estatus === 'FALTA INJUSTIFICADA' || fila.estatus === 'DESCANSO';

              return (
                <div key={of.id} className="py-3.5 space-y-2.5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-sm text-slate-800">
                        {of.apellidos}, {of.nombres}
                      </span>
                      <span className="ml-2 text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        C.I. {ced}
                      </span>
                      {of.turno && (
                        <span className="ml-2 text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {of.turno}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {puedeEditarFechaYHora ? (
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5">
                          <span className="text-[11px] font-bold text-slate-500">Entrada:</span>
                          <input
                            type="text"
                            disabled={sinMarcaHorario}
                            value={sinMarcaHorario ? '--:--' : fila.hora_entrada}
                            onChange={(e) => actualizarFila(ced, 'hora_entrada', e.target.value)}
                            className="w-20 text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 select-none">
                          <span className="text-[11px] font-bold text-slate-500">Entrada Auto:</span>
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {sinMarcaHorario ? '--:--' : yaGuardadoHoy ? fila.hora_entrada : horaAutomatica}
                          </span>
                        </div>
                      )}

                      <select
                        disabled={bloqueadoParaLider}
                        value={fila.estatus}
                        onChange={(e) => actualizarFila(ced, 'estatus', e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-70 ${
                          fila.estatus === 'PRESENTE' || fila.estatus === 'SERVICIO ESPECIAL PROPIO'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : requiereDestino
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : fila.estatus === 'FALTA INJUSTIFICADA'
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        <option value="PRESENTE">✅ PRESENTE</option>
                        <option value="SERVICIO ESPECIAL PROPIO">⭐ SERVICIO ESPECIAL PROPIO</option>
                        <option value="APOYO ENVIADO">🔄 APOYO ENVIADO</option>
                        <option value="SERVICIO ESPECIAL ENVIADO">🚀 SERVICIO ESPECIAL ENVIADO</option>
                        <option value="FALTA INJUSTIFICADA">❌ FALTA INJUSTIFICADA</option>
                        <option value="REPOSO MEDICO">🏥 REPOSO MÉDICO</option>
                        <option value="PERMISO">📋 PERMISO AUTORIZADO</option>
                        <option value="DESCANSO">🛌 LIBRE / DESCANSO</option>
                      </select>
                    </div>
                  </div>
                  {requiereDestino && (
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                      <label className="block text-xs font-bold text-amber-900 uppercase mb-1 flex items-center gap-1">
                        <ArrowRightLeft size={13} /> Proyecto Destino ({fila.estatus}) *
                      </label>
                      <select
                        required
                        disabled={bloqueadoParaLider}
                        value={fila.proyecto_apoyo}
                        onChange={(e) => actualizarFila(ced, 'proyecto_apoyo', e.target.value)}
                        className="w-full border border-amber-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white disabled:opacity-70"
                      >
                        <option value="">-- Seleccione el Proyecto Destino --</option>
                        {otrosProyectos.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <input
                    type="text"
                    disabled={bloqueadoParaLider}
                    value={fila.observacion}
                    onChange={(e) => actualizarFila(ced, 'observacion', e.target.value)}
                    placeholder="Observación opcional..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 disabled:bg-slate-50"
                  />
                </div>
              );
            })}
          </div>
        )}

        {oficialesDelGrupo.length > 0 && !bloqueadoParaLider && (
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={guardando}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={18} />
              {guardando ? 'Guardando...' : `Guardar y Cerrar Asistencia Grupo ${grupoSeleccionado}`}
            </button>
          </div>
        )}
      </form>

      {mostrarFormExterno && !bloqueadoParaLider && (
        <form
          onSubmit={registrarExternoRecibido}
          className="bg-indigo-50/70 p-5 rounded-2xl border border-indigo-200 space-y-4"
        >
          <h4 className="text-sm font-bold text-indigo-900 uppercase">
            Registrar Apoyo Recibido o Servicio Especial Recibido (Turno {turno})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              value={tipoExterno}
              onChange={(e) => setTipoExterno(e.target.value as 'APOYO RECIBIDO' | 'SERVICIO ESPECIAL RECIBIDO')}
              className="border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-900 bg-white"
            >
              <option value="APOYO RECIBIDO">APOYO RECIBIDO</option>
              <option value="SERVICIO ESPECIAL RECIBIDO">SERVICIO ESPECIAL RECIBIDO</option>
            </select>
            <input
              type="text"
              required
              value={cedulaExt}
              onChange={(e) => setCedulaExt(e.target.value)}
              placeholder="Cédula (Ej: V-18123456)"
              className="border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
            />
            <input
              type="text"
              required
              value={nombreExt}
              onChange={(e) => setNombreExt(e.target.value)}
              placeholder="Apellidos y Nombres"
              className="border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
            />
            <select
              required
              value={origenExt}
              onChange={(e) => setOrigenExt(e.target.value)}
              className="border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white font-semibold"
            >
              <option value="">-- Proyecto de Origen --</option>
              {otrosProyectos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {puedeEditarFechaYHora ? (
              <input
                type="text"
                required
                value={horaEntradaExt}
                onChange={(e) => setHoraEntradaExt(e.target.value)}
                className="border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white font-bold"
              />
            ) : (
              <div className="border border-indigo-200 rounded-xl px-3 py-2 text-xs bg-indigo-100/60 font-bold text-indigo-900 flex items-center justify-center">
                Hora Auto: {horaAutomatica}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMostrarFormExterno(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
            >
              Guardar Registro Recibido
            </button>
          </div>
        </form>
      )}

      {externosRecibidosHoy.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-2">
          <h4 className="text-xs font-bold text-indigo-800 uppercase">
            Personal Recibido en Apoyo / Servicio Especial ({fecha} • Turno {turno})
          </h4>
          <div className="divide-y divide-slate-100">
            {externosRecibidosHoy.map((ap) => (
              <div key={ap.id} className="py-2 text-xs flex justify-between items-center">
                <span>
                  <strong>{ap.nombre_completo}</strong> (C.I. {ap.cedula}) • Entrada: <strong>{ap.hora_entrada}</strong> — Origen:{' '}
                  <strong>{ap.proyecto_apoyo}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                  {ap.estatus} ({ap.turno})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
