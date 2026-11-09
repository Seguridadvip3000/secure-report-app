import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LiderHome() {
  const { currentUser } = useAuth();
  const [isSending, setIsLoading] = useState(false);
  const [canalAlerta, setCanalAlerta] = useState<any>(null);
  const [notificacion, setNotificacion] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  const nombreLider = currentUser?.nombre_completo || 'Líder en Ruta';
  const proyectoAsignado = currentUser?.proyecto_id || 'Ruta Vip No Asignada';

  useEffect(() => {
    // Inicialización del canal de transmisión inmediata nativo del navegador web
    const channel = supabase.channel('alertas-panico-global');
    channel.subscribe();
    setCanalAlerta(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const dispararBotonPanicoWeb = async () => {
    setIsLoading(true);
    setNotificacion(null);

    try {
      // 1. Extraemos la última posición disponible en la base de datos remota
      const { data: locData } = await supabase
        .from('user_locations')
        .select('latitude, longitude, bateria')
        .eq('user_id', currentUser?.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2. Transmisión instantánea por canal Broadcast Web
      if (canalAlerta) {
        await canalAlerta.send({
          type: 'broadcast',
          event: 'SOS_EMERGENCIA',
          payload: {
            lider_id: currentUser?.id,
            nombre_completo: nombreLider,
            proyecto_id: proyectoAsignado,
            latitude: locData?.latitude || 10.4914,
            longitude: locData?.longitude || -66.8486,
            bateria: locData?.bateria || 100,
            fecha_alerta: new Date().toISOString()
          }
        });
      }

      // 3. Registro persistente en el catálogo global de reports
      await supabase.from('reports').insert([
        {
          titulo_novedad: `🚨 ¡BOTÓN DE PÁNICO ACTIVADO DESDE DASHBOARD POR EL LÍDER! Se requiere verificación perimetral inmediata de la ruta.`,
          proyecto: proyectoAsignado,
          status: 'pendiente',
          visibleForClient: true,
          created_at: new Date().toISOString()
        }
      ]);

      setNotificacion({
        tipo: 'exito',
        mensaje: '¡S.O.S Emitido! La alerta ha sido enviada en tiempo real a Operaciones, Directiva y Administrador.'
      });
    } catch (err: any) {
      console.error('Fallo al emitir pánico web:', err);
      setNotificacion({
        tipo: 'error',
        value: 'Fallo de conexión. No se pudo transmitir la señal de pánico satelital.'
      } as any);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Tarjeta de Identificación Operativa */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-600 flex flex-col md:flex-row justify-between justify-center md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 tracking-wider block">SEGURIDAD VIP 3000 C.A.</span>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{nombreLider}</h2>
          <p className="text-sm text-slate-500 mt-1">Proyecto Asignado: <span className="font-semibold text-slate-700">{proyectoAsignado}</span></p>
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium uppercase tracking-wider">
            ● Estatus: Activo en Ruta
          </span>
        </div>
      </div>

      {/* Panel del Botón de Emergencia Táctico Web */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 text-center space-y-6 max-w-xl mx-auto">
        <div>
          <h3 className="text-lg font-bold text-red-600 tracking-wide uppercase flex items-center justify-center gap-2">
            <AlertCircle size={20} /> Botón de Emergencia Satelital
          </h3>
          <p className="text-slate-500 text-sm mt-2 px-4">
            Presione el pulsador en caso de riesgo inminente, agresión física o compromisos de seguridad críticos en el perímetro de su ruta.
          </p>
        </div>

        {notificacion && (
          <div className={`p-4 rounded-xl text-sm border flex items-center gap-2 text-left ${notificacion.tipo === 'exito' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {notificacion.tipo === 'exito' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span>{notificacion.mensaje}</span>
          </div>
        )}

        <div className="py-4 flex justify-center">
          <button
            onClick={dispararBotonPanicoWeb}
            disabled={isSending}
            className={`w-48 h-180 rounded-full font-black text-3xl tracking-widest text-white shadow-xl transition-all duration-300 border-8 border-slate-100 outline-none
              ${isSending 
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
