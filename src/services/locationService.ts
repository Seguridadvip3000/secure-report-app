import { supabase } from '../lib/supabase';

let watchId: number | null = null;
let intervalId: any = null;

const enviarPosicionASupabase = async (lat: number, lng: number) => {
  try {
    const rawUser = localStorage.getItem('securereport_user') || localStorage.getItem('currentUser');
    if (!rawUser) return;
    const user = JSON.parse(rawUser);
    if (!user?.id) return;

    let nivelBateria = 100;
    try {
      if ('getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        nivelBateria = Math.round(battery.level * 100);
      }
    } catch {}

    const proyectoUsuario =
      Array.isArray(user.proyectos) && user.proyectos.length > 0
        ? user.proyectos.join(', ')
        : 'Zona Operativa Asignada';

    await supabase.from('user_locations').insert([
      {
        user_id: user.id,
        nombre_completo: user.nombre_completo || user.username,
        role: user.role || 'lider',
        proyecto: proyectoUsuario,
        latitude: lat,
        longitude: lng,
        bateria: nivelBateria,
        updated_at: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.error('Error enviando posición GPS:', error);
  }
};

export const startElementoTracking = async () => {
  try {
    if (!('geolocation' in navigator)) {
      return { success: false, message: 'Geolocalización no disponible en este dispositivo' };
    }

    // 1. Envío inmediato al iniciar sesión
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        enviarPosicionASupabase(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.warn('Aviso GPS inicial:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // 2. Envío periódico estable cada 30 segundos
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          enviarPosicionASupabase(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
      );
    }, 30000);

    // 3. Seguimiento continuo de desplazamiento
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        enviarPosicionASupabase(pos.coords.latitude, pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 20000, timeout: 10000 }
    );

    return { success: true, message: 'Rastreo GPS activo correctamente' };
  } catch (err) {
    return { success: false, error: 'Error activando GPS' };
  }
};

export const stopElementoTracking = () => {
  if (watchId !== null && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};
