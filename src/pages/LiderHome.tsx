import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import QRScannerModal from '../components/QRScannerModal';
import { AlertCircle, CheckCircle2, FilePlus, LogIn, LogOut, Clock, QrCode } from 'lucide-react';

export default function LiderHome() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [procesandoAsistencia, setProcesandoAsistencia] = useState(false);
  const [enTurnoActivo, setEnTurnoActivo] = useState(false);
  const [ultimaMarcacion, setUltimaMarcacion] = useState<string | null>(null);
  const [accionQRActiva, setAccionQRActiva] = useState<'ENTRADA' | 'SALIDA' | null>(null);
  const [canalAlerta, setCanalAlerta] = useState<any>(null);
  const [notificacion, setNotificacion] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  const nombreLider = currentUser?.nombre_completo || 'Líder en Ruta';
  const proyectoAsignado =
    Array.isArray(currentUser?.proyectos) && currentUser.proyectos.length > 0
      ? currentUser.proyectos.join(', ')
      : currentUser?.proyecto_id || 'Ruta Vip No Asignada';

  const proyectoPrincipal =
    Array.isArray(currentUser?.proyectos) && currentUser.proyectos.length > 0
      ? currentUser.proyectos[0]
      : currentUser?.proyecto_id || 'Asignación General';

  const verificarEstadoAsistencia = async () => {
    if (!currentUser?.id) return;
    try {
      const { data } = await supabase
        .from('asistencias_lideres')
        .select('tipo, created_at')
        .eq('lider_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setEnTurnoActivo(data.tipo === 'ENTRADA');
        setUltimaMarcacion(
          `${data.tipo} registrada el ${new Date(data.created_at).toLocaleString('es-VE')}`
        );
      } else {
        setEnTurnoActivo(false);
        setUltimaMarcacion(null);
      }
    } catch (err) {
      console.error('Error verificando asistencia:', err);
    }
  };

  useEffect(() => {
    verificarEstadoAsistencia();

    const channel = supabase.channel('alertas-panico-global');
    channel.subscribe();
    setCanalAlerta(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const obtenerGpsActual = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve({ lat: 10.4806, lng: -66.9036 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 10.4806, lng: -66.9036 }),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };
  const confirmarAsistenciaTrasQR = async (tipo: 'ENTRADA' | 'SALIDA', proyectoVerificado: string) => {
    if (!currentUser) return;
    setAccionQRActiva(null);
    setProcesandoAsistencia(true);
    setNotificacion(null);

    try {
      const coords = await obtenerGpsActual();

      const { error: dbError } = await supabase.from('asistencias_lideres').insert([
        {
          lider_id: currentUser.id,
          nombre_lider: nombreLider,
          proyecto: proyectoVerificado,
          tipo,
          latitude: coords.lat,
          longitude: coords.lng,
        },
      ]);

      if (dbError) throw dbError;

      await supabase.from('user_locations').insert([
        {
          user_id: currentUser.id,
          nombre_completo: nombreLider,
          role: 'lider',
          proyecto: proyectoVerificado,
          latitude: coords.lat,
          longitude: coords.lng,
          updated_at: new Date().toISOString(),
        },
      ]);

      await notificationService.notifyLiderAttendance(nombreLider, proyectoVerificado, tipo);

      setEnTurnoActivo(tipo === 'ENTRADA');
      setUltimaMarcacion(`${tipo} verificada por QR hoy a las ${new Date().toLocaleTimeString('es-VE')}`);
      setNotificacion({
        tipo: 'exito',
        mensaje:
          tipo === 'ENTRADA'
            ? `✅ QR Verificado: Entrada reportada en ${proyectoVerificado}. Se habilitó el botón de Salida.`
            : `✅ QR Verificado: Salida reportada en ${proyectoVerificado}. Turno finalizado correctamente.`,
      });
    } catch (err: any) {
      setNotificacion({
        tipo: 'error',
        mensaje: 'Error al registrar asistencia: ' + (err?.message || 'Verifique su conexión.'),
      });
    } finally {
      setProcesandoAsistencia(false);
    }
  };

  const dispararBotonPanicoWeb = async () => {
    if (!currentUser) return;
    setIsSending(true);
    setNotificacion(null);

    try {
      const coords = await obtenerGpsActual();
      const ahora = new Date().toISOString();

      if (canalAlerta) {
        await canalAlerta.send({
          type: 'broadcast',
          event: 'SOS_EMERGENCIA',
          payload: {
            lider_id: currentUser.id,
            nombre_completo: nombreLider,
            proyecto_id: proyectoPrincipal,
            latitude: coords.lat,
            longitude: coords.lng,
            fecha_alerta: ahora,
          },
        });
      }

      const tituloEmergencia = `🚨 ALERTA S.O.S ACTIVADA POR ${nombreLider.toUpperCase()}`;
      const { error: dbError } = await supabase.from('reports').insert([
        {
          fecha_hora: ahora,
          titulo_novedad: tituloEmergencia,
          desarrollo: `¡EMERGENCIA EN RUTA! El líder ${nombreLider} ha activado el botón de pánico S.O.S en el proyecto ${proyectoPrincipal}. Coordenadas GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}.`,
          proyecto: proyectoPrincipal,
          quien_reporta: nombreLider,
          created_by: currentUser.id,
          ubicacion_gps: {
            lat: coords.lat,
            lng: coords.lng,
            address: `Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}`,
          },
          evidencias: [],
          status: 'pendiente',
          visible_for_client: false,
        },
      ]);

      if (dbError) throw dbError;

      await notificationService.notifyEmergencySOS(nombreLider, proyectoPrincipal, coords.lat, coords.lng);

      setNotificacion({
        tipo: 'exito',
        mensaje: '¡S.O.S Emitido! Alerta enviada en tiempo real con su ubicación GPS a Operaciones, Directiva y Administrador.',
      });
    } catch (err: any) {
      setNotificacion({
        tipo: 'error',
        mensaje: 'Error al transmitir la alerta: ' + (err?.message || 'Verifique su conexión a internet.'),
      });
    } finally {
      setIsSending(false);
    }
  };
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Modal de Escaneo QR en Vivo (Obligatorio para Entrada y Salida) */}
      {accionQRActiva && (
        <QRScannerModal
          titulo={`Escanear QR para ${accionQRActiva}`}
          subtitulo={`Proyecto asignado: ${proyectoPrincipal}`}
          proyectoEsperado={proyectoPrincipal}
          onScanSuccess={(proyectoLeido) => confirmarAsistenciaTrasQR(accionQRActiva, proyectoLeido)}
          onClose={() => setAccionQRActiva(null)}
        />
      )}

      {/* Tarjeta de Identificación Operativa */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-600 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 tracking-wider block">SEGURIDAD VIP 3000 C.A.</span>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{nombreLider}</h2>
          <p className="text-sm text-slate-500 mt-1">
            Proyecto Asignado: <span className="font-semibold text-slate-700">{proyectoAsignado}</span>
          </p>
        </div>
        <div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              enTurnoActivo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            ● {enTurnoActivo ? 'En Turno Activo' : 'Fuera de Turno'}
          </span>
        </div>
      </div>

      {/* Notificaciones de estado */}
      {notificacion && (
        <div
          className={`max-w-xl mx-auto p-4 rounded-xl text-sm border flex items-start gap-2 text-left ${
            notificacion.tipo === 'exito'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notificacion.tipo === 'exito' ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span>{notificacion.mensaje}</span>
        </div>
      )}

      {/* Control de Asistencia por QR en Vivo (Entrada y Salida) */}
      <div className="max-w-xl mx-auto bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
            <Clock size={16} className="text-blue-600" /> Control de Asistencia por QR en Vivo
          </h3>
          <QrCode size={16} className="text-slate-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setAccionQRActiva('ENTRADA')}
            disabled={procesandoAsistencia || enTurnoActivo}
            className={`py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              enTurnoActivo || procesandoAsistencia
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95 cursor-pointer'
            }`}
          >
            <LogIn size={18} /> REPORTAR ENTRADA
          </button>

          <button
            onClick={() => setAccionQRActiva('SALIDA')}
            disabled={procesandoAsistencia || !enTurnoActivo}
            className={`py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              !enTurnoActivo || procesandoAsistencia
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm active:scale-95 cursor-pointer'
            }`}
          >
            <LogOut size={18} /> REPORTAR SALIDA
          </button>
        </div>

        {ultimaMarcacion && (
          <p className="text-xs text-center text-slate-500 bg-slate-50 py-2 rounded-lg">
            Último registro: <strong>{ultimaMarcacion}</strong>
          </p>
        )}
      </div>

      {/* Acceso Rápido a Crear Reporte */}
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate('/crear-reporte')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl shadow-sm flex items-center justify-center gap-3 font-bold text-base transition-all active:scale-95 cursor-pointer"
        >
          <FilePlus size={22} /> Registrar Nuevo Reporte de Novedad
        </button>
      </div>

      {/* Panel del Botón de Emergencia Táctico */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8 text-center space-y-5 max-w-xl mx-auto">
        <div>
          <h3 className="text-lg font-bold text-red-600 tracking-wide uppercase flex items-center justify-center gap-2">
            <AlertCircle size={20} /> Botón de Emergencia Satelital
          </h3>
          <p className="text-slate-500 text-sm mt-2 px-2">
            Presione el pulsador en caso de riesgo inminente, agresión física o emergencia crítica en el perímetro de su ruta.
          </p>
        </div>

        <div className="py-2 flex justify-center">
          <button
            onClick={dispararBotonPanicoWeb}
            disabled={isSending}
            className={`rounded-full font-black text-3xl tracking-widest text-white shadow-xl transition-all duration-300 border-8 border-slate-100 outline-none cursor-pointer ${
              isSending
                ? 'bg-red-800 cursor-not-allowed animate-pulse'
                : 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/30 active:scale-95 shadow-red-600/20'
            }`}
            style={{ height: '192px', width: '192px' }}
          >
            {isSending ? 'SOS...' : 'S.O.S'}
          </button>
        </div>
      </div>
    </div>
  );
}
