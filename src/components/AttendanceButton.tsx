import React, { useState, useEffect } from 'react';
import { attendanceService } from '../services/attendanceService';
import { notificationService } from '../services/notificationService';

interface AttendanceButtonProps {
  user: { id: string; name: string; role: string };
  proyectoActual: string;
}

export const AttendanceButton: React.FC<AttendanceButtonProps> = ({ user, proyectoActual }) => {
  const [currentStatus, setCurrentStatus] = useState<'entrada' | 'salida' | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsWarning, setGpsWarning] = useState(false);

  // Buscar el último estatus registrado en Supabase al cargar el componente
  useEffect(() => {
    const fetchStatus = async () => {
      if (user?.id) {
        const status = await attendanceService.getLastStatus(user.id);
        setCurrentStatus(status);
      }
    };
    fetchStatus();
  }, [user?.id]);

  const handleToggleAttendance = () => {
    if (!proyectoActual) {
      alert('Por favor, asegúrese de que el proyecto esté seleccionado antes de marcar asistencia.');
      return;
    }

    setLoading(true);
    setGpsWarning(false);

    const nextStatus = currentStatus === 'entrada' ? 'salida' : 'entrada';

    // Capturar ubicación con plan de contingencia inteligente
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await guardarReporte(position.coords.latitude, position.coords.longitude, false, nextStatus);
      },
      async (error) => {
        console.warn('GPS bloqueado o no disponible, aplicando contingencia Caracas:', error);
        setGpsWarning(true);
        // Coordenadas fijas de contingencia (Caracas)
        await guardarReporte(10.4806, -66.9036, true, nextStatus);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const guardarReporte = async (lat: number, lng: number, isContingency: boolean, nextStatus: 'entrada' | 'salida') => {
    try {
      await attendanceService.registerAttendance({
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
        proyecto: proyectoActual,
        status: nextStatus,
        ubicacion_gps: { latitude: lat, longitude: lng, error: isContingency },
        fecha_hora: new Date().toISOString()
      });

      // Disparar la alerta push nativa con emojis
      await notificationService.notifyAttendance(user.name, nextStatus, proyectoActual);

      setCurrentStatus(nextStatus);
      alert(`¡${nextStatus === 'entrada' ? 'Entrada registrada' : 'Salida registrada'} exitosamente!`);
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar la asistencia en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-md border border-gray-100 max-w-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Asistencia de Guardia</h3>
      
      {gpsWarning && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
          ⚠️ Ubicación aproximada por contingencia de señal. Asegúrese de activar el GPS.
        </div>
      )}

      <button
        onClick={handleToggleAttendance}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-colors shadow ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : currentStatus === 'entrada' 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        {loading ? 'Procesando...' : currentStatus === 'entrada' ? '🔴 Marcar Salida de Guardia' : '🟢 Marcar Entrada de Guardia'}
      </button>
      
      <p className="mt-2 text-center text-xs text-gray-400">
        Proyecto Activo: <span className="font-medium text-gray-600">{proyectoActual || 'Ninguno'}</span>
      </p>
    </div>
  );
};
