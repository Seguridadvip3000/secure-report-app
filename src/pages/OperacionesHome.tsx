import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportContext';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { FilePlus, List, UserCheck, CheckCircle, Clock, FileText, ShieldCheck, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';

// Fórmula Haversine para calcular distancia en kilómetros entre Operaciones y cada Líder
const calcularDistanciaKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function OperacionesHome() {
  const navigate = useNavigate();
  const { currentUser, pendingUsers } = useAuth();
  const { reports } = useReports();

  const [supervisionActiva, setSupervisionActiva] = useState<{ proyecto: string; lider: string } | null>(null);
  const [procesandoSup, setProcesandoSup] = useState(false);
  const [alertaSup, setAlertaSup] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  const stats = {
    total: reports.length,
    pendientes: reports.filter(r => r.status === 'pendiente' || r.status === 'en_proceso').length,
    aprobados: reports.filter(r => r.status === 'aprobado').length,
    usuariosPendientes: pendingUsers.filter(u => u.role === 'lider').length,
  };

  // Verificar si el usuario de Operaciones ya tiene una supervisión iniciada sin finalizar
  useEffect(() => {
    const verificarSupervisionActual = async () => {
      if (!currentUser?.id) return;
      try {
        const { data } = await supabase
          .from('supervisiones_operaciones')
          .select('tipo, proyecto_detectado, lider_asociado')
          .eq('operaciones_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && data.tipo === 'INICIO') {
          setSupervisionActiva({
            proyecto: data.proyecto_detectado,
            lider: data.lider_asociado || '',
          });
        } else {
          setSupervisionActiva(null);
        }
      } catch (err) {
        console.error('Error verificando supervisión:', err);
      }
    };

    verificarSupervisionActual();
  }, [currentUser]);

  const obtenerGpsOperaciones = (): Promise<{ lat: number; lng: number }> => {
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

  const manejarSupervision = async (tipo: 'INICIO' | 'FIN') => {
    if (!currentUser) return;
    if (tipo === 'FIN' && !supervisionActiva) return;

    setProcesandoSup(true);
    setAlertaSup(null);

    try {
      const coords = await obtenerGpsOperaciones();
      let proyectoDetectado = supervisionActiva?.proyecto || 'Proyecto en Ruta (GPS)';
      let liderAsociado = supervisionActiva?.lider || '';

      if (tipo === 'INICIO') {
        // Buscar ubicaciones recientes de líderes en user_locations para asociar el proyecto por cercanía GPS
        const { data: ubicacionesLideres } = await supabase
          .from('user_locations')
          .select('nombre_completo, proyecto, latitude, longitude, role')
          .eq('role', 'lider');

        if (ubicacionesLideres && ubicacionesLideres.length > 0) {
          let distanciaMinima = Infinity;
          ubicacionesLideres.forEach((loc: any) => {
            if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
              const dist = calcularDistanciaKm(coords.lat, coords.lng, loc.latitude, loc.longitude);
              if (dist < distanciaMinima) {
                distanciaMinima = dist;
                proyectoDetectado = loc.proyecto || 'Proyecto Asignado al Líder';
                liderAsociado = loc.nombre_completo || '';
              }
            }
          });
        } else {
          // Respaldo: buscar última asistencia de entrada de algún líder hoy
          const { data: ultimaAsistencia } = await supabase
            .from('asistencias_lideres')
            .select('nombre_lider, proyecto')
            .eq('tipo', 'ENTRADA')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (ultimaAsistencia) {
            proyectoDetectado = ultimaAsistencia.proyecto;
            liderAsociado = ultimaAsistencia.nombre_lider;
          }
        }
      }

      // 1. Guardar exclusivamente en supervisiones_operaciones (NO en reports)
      const { error: dbError } = await supabase.from('supervisiones_operaciones').insert([
        {
          operaciones_id: currentUser.id,
          nombre_operaciones: currentUser.nombre_completo,
          proyecto_detectado: proyectoDetectado,
          lider_asociado: liderAsociado,
          tipo,
          latitude: coords.lat,
          longitude: coords.lng,
        },
      ]);

      if (dbError) throw dbError;

      // 2. Actualizar ubicación de Operaciones en user_locations
      await supabase.from('user_locations').upsert(
        {
          user_id: currentUser.id,
          nombre_completo: currentUser.nombre_completo,
          role: 'operaciones',
          proyecto: proyectoDetectado,
          latitude: coords.lat,
          longitude: coords.lng,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      // 3. Notificar a Directiva y Administrador
      await notificationService.notifyOperacionesSupervision(
        currentUser.nombre_completo,
        proyectoDetectado,
        liderAsociado,
        tipo
      );

      if (tipo === 'INICIO') {
        setSupervisionActiva({ proyecto: proyectoDetectado, lider: liderAsociado });
        setAlertaSup({
          tipo: 'exito',
          mensaje: `✅ Supervisión iniciada en: ${proyectoDetectado}${liderAsociado ? ` (Líder: ${liderAsociado})` : ''}. Directiva ha sido notificada.`,
        });
      } else {
        setSupervisionActiva(null);
        setAlertaSup({
          tipo: 'exito',
          mensaje: `✅ Supervisión finalizada en: ${proyectoDetectado}. Directiva ha sido notificada.`,
        });
      }
    } catch (err: any) {
      setAlertaSup({
        tipo: 'error',
        mensaje: 'Error al registrar supervisión: ' + (err?.message || 'Verifique su conexión.'),
      });
    } finally {
      setProcesandoSup(false);
    }
  };
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Panel de Operaciones</h1>
        <p className="text-purple-100 mt-1">Bienvenido, {currentUser?.nombre_completo}</p>
      </div>

      {/* Control de Visitas y Supervisión de Proyectos */}
      <div className="bg-white rounded-xl border-2 border-purple-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-purple-800 uppercase flex items-center gap-2">
            <ShieldCheck size={18} className="text-purple-600" /> Control de Visitas y Supervisión GPS
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              supervisionActiva ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {supervisionActiva ? `Supervisando: ${supervisionActiva.proyecto}` : 'Sin supervisión activa'}
          </span>
        </div>

        {alertaSup && (
          <div
            className={`p-3.5 rounded-xl text-xs border flex items-start gap-2 ${
              alertaSup.tipo === 'exito'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {alertaSup.tipo === 'exito' ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{alertaSup.mensaje}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => manejarSupervision('INICIO')}
            disabled={procesandoSup || !!supervisionActiva}
            className={`py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              supervisionActiva || procesandoSup
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm active:scale-95 cursor-pointer'
            }`}
          >
            <ShieldCheck size={18} /> INICIAR SUPERVISION
          </button>

          <button
            onClick={() => manejarSupervision('FIN')}
            disabled={procesandoSup || !supervisionActiva}
            className={`py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              !supervisionActiva || procesandoSup
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm active:scale-95 cursor-pointer'
            }`}
          >
            <LogOut size={18} /> FINALIZAR SUPERVISION
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <p className="text-xs text-slate-500">Pendientes</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.aprobados}</p>
          <p className="text-xs text-slate-500">Aprobados</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-amber-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <UserCheck size={20} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.usuariosPendientes}</p>
          <p className="text-xs text-slate-500">Líderes Pendientes</p>
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/crear-reporte')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FilePlus size={28} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">1. Crear Reporte</h3>
          <p className="text-sm text-slate-500">Registrar una nueva novedad</p>
        </button>

        <button
          onClick={() => navigate('/lista-reportes')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <List size={28} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">2. Lista de Reportes</h3>
          <p className="text-sm text-slate-500">Ver, aprobar y enviar reportes al cliente</p>
        </button>

        <button
          onClick={() => navigate('/aprobaciones')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-amber-500 hover:bg-amber-50 transition-all group text-left relative"
        >
          {stats.usuariosPendientes > 0 && (
            <div className="absolute top-4 right-4 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
              {stats.usuariosPendientes}
            </div>
          )}
          <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UserCheck size={28} className="text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">3. Aprobaciones</h3>
          <p className="text-sm text-slate-500">Aprobar registros de nuevos líderes</p>
        </button>
      </div>
    </div>
  );
}
