import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { AlertCircle, CheckCircle2, FilePlus, ShieldAlert, Radio, Clock } from 'lucide-react';

export default function SupervisorHome() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [canalAlerta, setCanalAlerta] = useState<any>(null);
  const [notificacion, setNotificacion] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  const [enHorarioNocturno, setEnHorarioNocturno] = useState(false);
  const [requiereConfirmacion, setRequiereConfirmacion] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(300);
  const [ultimoReporteSinNovedad, setUltimoReporteSinNovedad] = useState<string | null>(null);
  const [alertaEnviadaACecom, setAlertaEnviadaACecom] = useState(false);
  const ultimaHoraDisparadaRef = useRef<string>('');

  const nombreSupervisor = currentUser?.nombre_completo || 'Supervisor Nocturno';
  const proyectoPrincipal =
    Array.isArray(currentUser?.proyectos) && currentUser.proyectos.length > 0
      ? currentUser.proyectos
      : currentUser?.proyecto_id || 'Supervisión General';

  const verificarHorarioNocturno = (fecha: Date) => {
    const hora = fecha.getHours();
    return hora >= 20 || hora < 6;
  };

  useEffect(() => {
    const channel = supabase.channel('alertas-panico-global');
    channel.subscribe();
    setCanalAlerta(channel);

    const revisarReloj = () => {
      const ahora = new Date();
      const esNoche = verificarHorarioNocturno(ahora);
      setEnHorarioNocturno(esNoche);

      if (esNoche && ahora.getMinutes() === 0) {
        const claveHora = `${ahora.toDateString()}-${ahora.getHours()}`;
        if (ultimaHoraDisparadaRef.current !== claveHora) {
          ultimaHoraDisparadaRef.current = claveHora;
          activarChequeoHombreVivo();
        }
      }
    };

    revisarReloj();
    const intervalo = setInterval(revisarReloj, 15000);

    return () => {
      clearInterval(intervalo);
      supabase.removeChannel(channel);
    };
  }, []);
  const activarChequeoHombreVivo = () => {
    setRequiereConfirmacion(true);
    setAlertaEnviadaACecom(false);
    setSegundosRestantes(300);
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 200, 400]);
    }
    notificationService.showPushNotification(
      '⏰ Control Hombre Vivo',
      'Por favor confirme reporte "SIN NOVEDAD" en los próximos 5 minutos.',
      false
    );
  };

  useEffect(() => {
    if (!requiereConfirmacion) return;

    const timer = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          dispararAlertaHombreVivoACecom();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [requiereConfirmacion]);

  const dispararAlertaHombreVivoACecom = async () => {
    if (!currentUser || alertaEnviadaACecom) return;
    setAlertaEnviadaACecom(true);

    try {
      await supabase.from('alertas_hombre_vivo').insert([
        {
          supervisor_id: currentUser.id,
          nombre_supervisor: nombreSupervisor,
          proyecto: proyectoPrincipal,
          estado: 'ACTIVA',
        },
      ]);

      await supabase.from('notifications').insert([
        {
          title: '🚨 ¡ALERTA HOMBRE VIVO SIN RESPUESTA!',
          body: `El supervisor ${nombreSupervisor} (${proyectoPrincipal}) no respondió el control horario.`,
          target_roles: ['cecom'],
          target_project: proyectoPrincipal,
        },
      ]);
    } catch (err) {
      console.error('Error enviando alerta Hombre Vivo a CECOM:', err);
    }
  };

  const confirmarSinNovedad = () => {
    setRequiereConfirmacion(false);
    setAlertaEnviadaACecom(false);
    setSegundosRestantes(300);
    setUltimoReporteSinNovedad(new Date().toLocaleTimeString('es-VE'));
    setNotificacion({
      tipo: 'exito',
      mensaje: `✅ Reporte "Sin Novedad" confirmado a las ${new Date().toLocaleTimeString('es-VE')}.`,
    });
  };

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

  const dispararBotonPanicoWeb = async () => {
    if (!currentUser) return;
    setIsSendingSOS(true);
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
            nombre_completo: nombreSupervisor,
            proyecto_id: proyectoPrincipal,
            latitude: coords.lat,
            longitude: coords.lng,
            fecha_alerta: ahora,
          },
        });
      }

      const tituloEmergencia = `🚨 ALERTA S.O.S ACTIVADA POR SUPERVISOR ${nombreSupervisor.toUpperCase()}`;
      const { error: dbError } = await supabase.from('reports').insert([
        {
          fecha_hora: ahora,
          titulo_novedad: tituloEmergencia,
          desarrollo: `¡EMERGENCIA NOCTURNA! El supervisor ${nombreSupervisor} activó el botón S.O.S en ${proyectoPrincipal}. GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}.`,
          proyecto: proyectoPrincipal,
          quien_reporta: nombreSupervisor,
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

      await notificationService.notifyEmergencySOS(nombreSupervisor, proyectoPrincipal, coords.lat, coords.lng);

      setNotificacion({
        tipo: 'exito',
        mensaje: '¡S.O.S Emitido! Alerta enviada en tiempo real con su ubicación GPS.',
      });
    } catch (err: any) {
      setNotificacion({
        tipo: 'error',
        mensaje: 'Error al transmitir la alerta: ' + (err?.message || 'Verifique su conexión.'),
      });
    } finally {
      setIsSendingSOS(false);
    }
  };
  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-indigo-600 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 tracking-wider block">SEGURIDAD VIP 3000 C.A. — SUPERVISIÓN</span>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{nombreSupervisor}</h2>
          <p className="text-sm text-slate-500 mt-1">
            Área Asignada: <span className="font-semibold text-slate-700">{proyectoPrincipal}</span>
          </p>
        </div>
        <div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              enHorarioNocturno ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Radio size={14} className={enHorarioNocturno ? 'animate-pulse' : ''} />
            {enHorarioNocturno ? 'Guardia Nocturna Activa (8PM - 6AM)' : 'Fuera de Horario Hombre Vivo'}
          </span>
        </div>
      </div>

      {notificacion && (
        <div
          className={`max-w-xl mx-auto p-4 rounded-xl text-sm border flex items-start gap-2 ${
            notificacion.tipo === 'exito'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notificacion.tipo === 'exito' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
          <span>{notificacion.mensaje}</span>
        </div>
      )}

      <div
        className={`max-w-xl mx-auto rounded-2xl p-5 border-2 shadow-sm space-y-4 transition-all ${
          requiereConfirmacion
            ? 'bg-amber-50 border-amber-500 animate-pulse'
            : 'bg-white border-indigo-200'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-indigo-900 uppercase flex items-center gap-2">
            <Clock size={16} className="text-indigo-600" /> Control Hombre Vivo (8:00 p. m. - 6:00 a. m.)
          </h3>
          {requiereConfirmacion && (
            <span className="px-2.5 py-0.5 bg-red-600 text-white text-xs font-black rounded-full">
              {minutos}:{segundos < 10 ? `0${segundos}` : segundos}
            </span>
          )}
        </div>

        {requiereConfirmacion ? (
          <div className="space-y-3 text-center">
            <p className="text-sm font-bold text-amber-900">
              ⚠️ Verificación Horaria Requerida: Confirme que se encuentra operativo y sin novedad antes de que expire el tiempo.
            </p>
            <button
              onClick={confirmarSinNovedad}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              ✅ REPORTAR SIN NOVEDAD AHORA
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Entre las <strong>8:00 p. m. y las 6:00 a. m.</strong>, el sistema solicitará confirmación cada hora. Si no responde en 5 minutos, se activará una alarma crítica en <strong>CECOM</strong>.
            </p>
            <button
              onClick={confirmarSinNovedad}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              Reporte Preventivo: Todo Sin Novedad
            </button>
            {ultimoReporteSinNovedad && (
              <p className="text-xs text-center text-slate-500">
                Última confirmación enviada: <strong>{ultimoReporteSinNovedad}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate('/crear-reporte')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl shadow-sm flex items-center justify-center gap-3 font-bold text-base transition-all active:scale-95 cursor-pointer"
        >
          <FilePlus size={22} /> Registrar Nuevo Reporte de Novedad
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8 text-center space-y-5 max-w-xl mx-auto">
        <div>
          <h3 className="text-lg font-bold text-red-600 tracking-wide uppercase flex items-center justify-center gap-2">
            <ShieldAlert size={20} /> Botón de Emergencia Satelital
          </h3>
          <p className="text-slate-500 text-sm mt-2 px-2">
            Presione el pulsador en caso de riesgo inminente o emergencia crítica durante su guardia.
          </p>
        </div>

        <div className="py-2 flex justify-center">
          <button
            onClick={dispararBotonPanicoWeb}
            disabled={isSendingSOS}
            className={`rounded-full font-black text-3xl tracking-widest text-white shadow-xl transition-all duration-300 border-8 border-slate-100 outline-none cursor-pointer ${
              isSendingSOS
                ? 'bg-red-800 cursor-not-allowed animate-pulse'
                : 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/30 active:scale-95 shadow-red-600/20'
            }`}
            style={{ height: '192px', width: '192px' }}
          >
            {isSendingSOS ? 'SOS...' : 'S.O.S'}
          </button>
        </div>
      </div>
    </div>
  );
}
