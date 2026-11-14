import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportContext';
import { supabase } from '../lib/supabase';
import { FilePlus, List, Radio, ShieldAlert, CheckCircle2, PhoneCall, Clock, FileText } from 'lucide-react';

interface AlertaHombreVivo {
  id: string;
  supervisor_id: string;
  nombre_supervisor: string;
  proyecto: string;
  estado: string;
  created_at: string;
}

export default function CecomHome() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { reports } = useReports();

  const [alertasActivas, setAlertasActivas] = useState<AlertaHombreVivo[]>([]);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const alarmaIntervalRef = useRef<any>(null);

  const stats = {
    total: reports.length,
    pendientes: reports.filter(r => r.status === 'pendiente' || r.status === 'en_proceso').length,
    aprobados: reports.filter(r => r.status === 'aprobado').length,
  };

  // Sirena sonora persistente en bucle mientras exista al menos 1 alerta ACTIVA
  const emitirPulsoSirena = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const tono = (freq: number, inicio: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + inicio);
        gain.gain.setValueAtTime(0.45, ctx.currentTime + inicio);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + inicio + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + inicio);
        osc.stop(ctx.currentTime + inicio + dur);
      };

      tono(950, 0.0, 0.35);
      tono(650, 0.4, 0.35);
      tono(950, 0.8, 0.45);
    } catch (e) {
      console.warn('Esperando interacción de audio:', e);
    }
  };

  const cargarAlertasActivas = async () => {
    try {
      const { data, error } = await supabase
        .from('alertas_hombre_vivo')
        .select('*')
        .eq('estado', 'ACTIVA')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlertasActivas(data || []);
    } catch (err) {
      console.error('Error cargando alertas Hombre Vivo:', err);
    }
  };

  useEffect(() => {
    cargarAlertasActivas();

    const canal = supabase
      .channel('cecom-hombre-vivo-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alertas_hombre_vivo' },
        () => {
          cargarAlertasActivas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // Activar o detener el bucle de sonido continuo según haya alertas sin atender
  useEffect(() => {
    if (alertasActivas.length > 0) {
      emitirPulsoSirena();
      if ('vibrate' in navigator) {
        navigator.vibrate();
      }
      if (!alarmaIntervalRef.current) {
        alarmaIntervalRef.current = setInterval(() => {
          emitirPulsoSirena();
          if ('vibrate' in navigator) {
            navigator.vibrate();
          }
        }, 3000);
      }
    } else {
      if (alarmaIntervalRef.current) {
        clearInterval(alarmaIntervalRef.current);
        alarmaIntervalRef.current = null;
      }
    }

    return () => {
      if (alarmaIntervalRef.current) {
        clearInterval(alarmaIntervalRef.current);
        alarmaIntervalRef.current = null;
      }
    };
  }, [alertasActivas.length]);

  const confirmarComunicacionOficial = async (alertaId: string) => {
    setConfirmandoId(alertaId);
    try {
      const { error } = await supabase
        .from('alertas_hombre_vivo')
        .update({
          estado: 'CONFIRMADA',
          atendido_por: currentUser?.nombre_completo || 'Operador CECOM',
          atendido_at: new Date().toISOString(),
        })
        .eq('id', alertaId);

      if (error) throw error;
      setAlertasActivas((prev) => prev.filter((a) => a.id !== alertaId));
    } catch (err: any) {
      alert('Error al confirmar comunicación: ' + (err?.message || 'Intente nuevamente.'));
    } finally {
      setConfirmandoId(null);
    }
  };
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-700 to-slate-900 rounded-xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-cyan-300 uppercase">Centro de Control y Monitoreo</span>
          <h1 className="text-2xl font-bold mt-1">Panel CECOM</h1>
          <p className="text-cyan-100 text-sm mt-1">Operador en guardia: {currentUser?.nombre_completo}</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold">
          <Radio size={15} className="text-emerald-400 animate-pulse" /> Monitoreo Hombre Vivo Activo
        </div>
      </div>

      {/* ALARMA PERSISTENTE DE HOMBRE VIVO (NO CESA HASTA CONFIRMAR COMUNICACIÓN) */}
      {alertasActivas.length > 0 && (
        <div className="bg-red-600 text-white rounded-2xl p-5 md:p-6 shadow-2xl border-4 border-yellow-300 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={32} className="text-yellow-300 shrink-0 animate-bounce" />
            <div>
              <h2 className="text-lg md:text-xl font-black uppercase tracking-wide">
                🚨 ¡ALERTA HOMBRE VIVO ACTIVA ({alertasActivas.length})!
              </h2>
              <p className="text-xs md:text-sm text-red-100">
                La alarma sonora continuará sonando hasta que usted se comunique vía radio/teléfono con el oficial y confirme que está sin novedad.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {alertasActivas.map((alerta) => (
              <div
                key={alerta.id}
                className="bg-red-950/70 border border-red-400 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="font-black text-base text-yellow-300">{alerta.nombre_supervisor}</div>
                  <div className="text-xs text-white">
                    Proyecto / Área: <strong>{alerta.proyecto}</strong>
                  </div>
                  <div className="text-xs text-red-200">
                    Hora de alerta: {new Date(alerta.created_at).toLocaleString('es-VE')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => confirmarComunicacionOficial(alerta.id)}
                  disabled={confirmandoId === alerta.id}
                  className="px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs md:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <PhoneCall size={18} />
                  {confirmandoId === alerta.id
                    ? 'SILENCIANDO ALARMA...'
                    : 'CONFIRMAR COMUNICACIÓN CON OFICIAL (SIN NOVEDAD)'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tarjetas de Resumen Operativo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <FileText size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500">Total Reportes</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-yellow-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.pendientes}</p>
          <p className="text-xs text-slate-500">En Revisión</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <CheckCircle2 size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.aprobados}</p>
          <p className="text-xs text-slate-500">Verificados</p>
        </div>
      </div>

      {/* Acciones Permitidas para CECOM (Sin aprobaciones ni visitas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/crear-reporte')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-cyan-600 hover:bg-cyan-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FilePlus size={28} className="text-cyan-700" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">1. Crear Reporte</h3>
          <p className="text-sm text-slate-500">Registrar novedad desde el Centro de Control</p>
        </button>

        <button
          onClick={() => navigate('/lista-reportes')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-blue-600 hover:bg-blue-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <List size={28} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">2. Lista de Reportes</h3>
          <p className="text-sm text-slate-500">Consultar novedades y generar PDFs</p>
        </button>
      </div>
    </div>
  );
}
