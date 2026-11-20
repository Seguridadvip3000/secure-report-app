import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import {
  ShieldAlert,
  ShieldCheck,
  Camera,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';

const ESTATUS_SERVICIOS_ESPECIALES = [
  'SERVICIO ESPECIAL MIXTO',
  'SERVICIO ESPECIAL DIURNO/NOCTURNO',
  'SERVICIO ESPECIAL PROPIO',
  'SERVICIO ESPECIAL RECIBIDO',
];

const obtenerFechaHoraCaracas = () => {
  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
  const hora12 = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(ahora);
  return { fechaStr, hora12 };
};

export default function VerificacionServiciosEspecialesPage() {
  const { currentUser } = useAuth();
  const { fechaStr: hoyLocal } = obtenerFechaHoraCaracas();

  const rolActual = (currentUser?.role || '').toLowerCase();
  const esAnalistaSoloLectura = rolActual === 'analista';
  const puedeVerificar = ['operaciones', 'directiva', 'administrador', 'admin'].includes(rolActual);
  const nombreVerificador = currentUser?.nombre_completo || currentUser?.username || 'Operaciones';

  const [listaProyectos, setListaProyectos] = useState<string[]>([]);
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('TODOS');
  const [fechaFiltro, setFechaFiltro] = useState<string>(hoyLocal);
  const [filtroEstadoVerif, setFiltroEstadoVerif] = useState<'TODOS' | 'PENDIENTES' | 'VERIFICADOS'>('TODOS');

  const [serviciosList, setServiciosList] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);

  // Modal de Verificación
  const [registroVerificando, setRegistroVerificando] = useState<any | null>(null);
  const [fechaAutoVerif, setFechaAutoVerif] = useState<string>('');
  const [horaAutoVerif, setHoraAutoVerif] = useState<string>('');
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const [obsVerificacion, setObsVerificacion] = useState<string>('');
  const [guardandoVerif, setGuardandoVerif] = useState<boolean>(false);

  // Modal para ver foto ampliada de un servicio ya verificado
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);

  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
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

  const consultarServiciosEspeciales = async () => {
    setCargando(true);
    try {
      let query = supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .eq('fecha', fechaFiltro)
        .in('estatus', ESTATUS_SERVICIOS_ESPECIALES)
        .order('created_at', { ascending: true });

      if (proyectoFiltro !== 'TODOS') {
        query = query.eq('proyecto', proyectoFiltro);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      setServiciosList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error cargando servicios especiales: ' + (err?.message || 'Verifique conexión.'),
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    consultarServiciosEspeciales();
  }, [fechaFiltro, proyectoFiltro]);

  const abrirModalVerificar = (reg: any) => {
    if (!puedeVerificar || esAnalistaSoloLectura) return;
    setMensaje(null);
    const momento = obtenerFechaHoraCaracas();
    setRegistroVerificando(reg);
    setFechaAutoVerif(momento.fechaStr);
    setHoraAutoVerif(momento.hora12);
    setFotoArchivo(null);
    setFotoPreviewUrl(null);
    setObsVerificacion('');
  };

  const manejarSeleccionFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFotoArchivo(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setFotoPreviewUrl(url);
    } else {
      setFotoPreviewUrl(null);
    }
  };

  const confirmarVerificacionEnPuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registroVerificando || !puedeVerificar || esAnalistaSoloLectura) return;

    if (!fotoArchivo) {
      setMensaje({
        tipo: 'error',
        texto: '⚠️ Debe tomar o subir obligatoriamente la FOTO del oficial en el puesto de servicio para guardar.',
      });
      return;
    }

    setGuardandoVerif(true);
    try {
      const momentoExacto = obtenerFechaHoraCaracas();
      const extension = fotoArchivo.name.split('.').pop() || 'jpg';
      const rutaArchivo = `${momentoExacto.fechaStr}/${registroVerificando.cedula}_${Date.now()}.${extension}`;

      const { error: errUpload } = await supabase.storage
        .from('verificaciones-servicios')
        .upload(rutaArchivo, fotoArchivo, { upsert: true });

      if (errUpload) throw errUpload;

      const { data: urlData } = supabase.storage
        .from('verificaciones-servicios')
        .getPublicUrl(rutaArchivo);

      const fotoUrlPublica = urlData?.publicUrl || '';

      const { error: errUpd } = await supabase
        .from('asistencias_diarias_oficiales')
        .update({
          verificado_se: true,
          verificado_se_por: nombreVerificador,
          verificado_se_fecha: momentoExacto.fechaStr,
          verificado_se_hora: momentoExacto.hora12,
          verificado_se_foto_url: fotoUrlPublica,
          verificado_se_observacion: obsVerificacion.trim() || 'Verificado en puesto de servicio',
          updated_at: new Date().toISOString(),
        })
        .eq('id', registroVerificando.id);

      if (errUpd) throw errUpd;

      setMensaje({
        tipo: 'exito',
        texto: `✅ Servicio Especial de ${registroVerificando.nombre_completo} VERIFICADO en puesto (${momentoExacto.hora12}).`,
      });
      setRegistroVerificando(null);
      setFotoArchivo(null);
      setFotoPreviewUrl(null);
      await consultarServiciosEspeciales();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error al guardar verificación: ' + (err?.message || 'Verifique permisos de Storage en Supabase.'),
      });
    } finally {
      setGuardandoVerif(false);
    }
  };
  const formatearHorarioLimpio = (turnoRaw: string) => {
    const trn = String(turnoRaw || 'MIXTO').toUpperCase();
    if (trn === 'DIURNO') return 'DIURNO';
    if (trn === 'NOCTURNO') return 'NOCTURNO';
    return 'MIXTO';
  };

  const obtenerProyectoOrigen = (reg: any) => {
    if (reg.proyecto_origen_se) return reg.proyecto_origen_se;
    if (String(reg.estatus || '').toUpperCase() === 'SERVICIO ESPECIAL RECIBIDO' && reg.proyecto_apoyo) {
      return reg.proyecto_apoyo;
    }
    return reg.proyecto;
  };

  const listaFiltrada = serviciosList.filter((item) => {
    const estaVerif = Boolean(item.verificado_se);
    if (filtroEstadoVerif === 'PENDIENTES') return !estaVerif;
    if (filtroEstadoVerif === 'VERIFICADOS') return estaVerif;
    return true;
  });

  const totalPendientes = serviciosList.filter((i) => !i.verificado_se).length;
  const totalVerificados = serviciosList.filter((i) => Boolean(i.verificado_se)).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-indigo-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Control de Campo y Auditoría
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" size={26} /> Verificación de Servicios Especiales
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {esAnalistaSoloLectura
              ? 'Vista de consulta y auditoría (Solo lectura para Analista).'
              : 'Verifique en campo cada Servicio Especial reportado adjuntando fotografía obligatoria en el puesto.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-red-50 border border-red-200 px-3.5 py-2 rounded-xl text-center">
            <div className="text-[10px] font-bold text-red-700 uppercase">Pendientes</div>
            <div className="text-lg font-black text-red-700">{totalPendientes}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-center">
            <div className="text-[10px] font-bold text-emerald-700 uppercase">Verificados</div>
            <div className="text-lg font-black text-emerald-700">{totalVerificados}</div>
          </div>
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

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-64">
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Building2 size={14} /> Proyecto Efectivo
          </label>
          <select
            value={proyectoFiltro}
            onChange={(e) => setProyectoFiltro(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
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
            <Calendar size={14} /> Fecha
          </label>
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
          />
        </div>

        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['TODOS', 'PENDIENTES', 'VERIFICADOS'] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setFiltroEstadoVerif(est)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                filtroEstadoVerif === est ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {est}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={consultarServiciosEspeciales}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>
      {cargando ? (
        <p className="text-center text-slate-500 py-10 text-sm">Cargando servicios especiales...</p>
      ) : listaFiltrada.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
          No hay Servicios Especiales reportados para los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-3">
          {listaFiltrada.map((reg) => {
            const verificado = Boolean(reg.verificado_se);
            const horarioLimpio = formatearHorarioLimpio(reg.turno);
            const proyOrigen = obtenerProyectoOrigen(reg);
            const proyEfectivo = reg.proyecto;

            return (
              <div
                key={reg.id}
                className={`p-5 rounded-2xl border-2 shadow-sm transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  verificado
                    ? 'bg-emerald-50/80 border-emerald-500'
                    : 'bg-red-50/90 border-red-500'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase flex items-center gap-1 ${
                        verificado ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {verificado ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                      {verificado ? 'VERIFICADO' : 'PENDIENTE POR VERIFICAR'}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-100 text-blue-900">
                      HORARIO: {horarioLimpio}
                    </span>

                    <span className="font-bold text-base text-slate-900">{reg.nombre_completo}</span>
                    <span className="text-xs font-mono bg-white/80 text-slate-800 px-2 py-0.5 rounded border border-slate-300 font-bold">
                      C.I. {reg.cedula}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                    <div>
                      <span className="font-bold text-slate-500 uppercase">Proyecto de Origen:</span>{' '}
                      <strong className="text-slate-900">{proyOrigen}</strong>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase">Proyecto Efectivo (Servicio):</span>{' '}
                      <strong className="text-indigo-900">{proyEfectivo}</strong>
                    </div>
                  </div>

                  {verificado && (
                    <div className="text-xs text-emerald-900 bg-emerald-100/80 px-3 py-2 rounded-xl border border-emerald-300 mt-1 space-y-0.5">
                      <div>
                        ✅ Verificado por <strong>{reg.verificado_se_por}</strong> el{' '}
                        <strong>{reg.verificado_se_fecha}</strong> a las <strong>{reg.verificado_se_hora}</strong>
                      </div>
                      {reg.verificado_se_observacion && (
                        <div>Observación: {reg.verificado_se_observacion}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                  {verificado && reg.verificado_se_foto_url && (
                    <button
                      type="button"
                      onClick={() => setFotoModalUrl(reg.verificado_se_foto_url)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <ImageIcon size={15} /> Ver Foto en Puesto
                    </button>
                  )}

                  {!verificado && puedeVerificar && !esAnalistaSoloLectura && (
                    <button
                      type="button"
                      onClick={() => abrirModalVerificar(reg)}
                      className="px-5 py-2.5 rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Camera size={16} /> VERIFICAR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {registroVerificando && (
        <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={confirmarVerificacionEnPuesto}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Camera className="text-indigo-600" size={20} /> Verificar Servicio Especial en Puesto
            </h3>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>
                Oficial: <strong>{registroVerificando.nombre_completo}</strong> ({registroVerificando.cedula})
              </div>
              <div>
                Horario: <strong>{formatearHorarioLimpio(registroVerificando.turno)}</strong> • Proyecto:{' '}
                <strong>{registroVerificando.proyecto}</strong>
              </div>
              <div className="pt-1 border-t border-slate-200 flex items-center gap-3 text-indigo-800 font-bold">
                <span className="flex items-center gap-1">
                  <Calendar size={13} /> Fecha Auto: {fechaAutoVerif}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={13} /> Hora Auto: {horaAutoVerif}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-red-700 uppercase mb-1.5">
                FOTO del Oficial en el Puesto de Servicio * (Obligatoria)
              </label>
              <label className="w-full border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
                <Camera size={24} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-900">
                  {fotoArchivo ? fotoArchivo.name : 'Pulsar aquí para tomar o subir FOTO'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  required
                  onChange={manejarSeleccionFoto}
                  className="hidden"
                />
              </label>

              {fotoPreviewUrl && (
                <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-300 max-h-48 flex justify-center bg-slate-900">
                  <img src={fotoPreviewUrl} alt="Vista previa puesto" className="object-contain max-h-48" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Observación en Puesto (Opcional)
              </label>
              <input
                type="text"
                value={obsVerificacion}
                onChange={(e) => setObsVerificacion(e.target.value)}
                placeholder="Ej: Oficial uniformado y operativo en puesto..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRegistroVerificando(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoVerif || !fotoArchivo}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guardandoVerif ? 'Subiendo Foto y Verificando...' : 'Guardar Verificación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {fotoModalUrl && (
        <div
          onClick={() => setFotoModalUrl(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-sm font-bold text-slate-800">Evidencia Fotográfica en Puesto</span>
              <button
                type="button"
                onClick={() => setFotoModalUrl(null)}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            <img
              src={fotoModalUrl}
              alt="Evidencia en puesto"
              className="w-full max-h-[70vh] object-contain rounded-xl bg-slate-950"
            />
          </div>
        </div>
      )}
    </div>
  );
}
