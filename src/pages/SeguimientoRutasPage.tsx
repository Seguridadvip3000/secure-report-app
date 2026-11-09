import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { createClient } from '@supabase/supabase-js';

const LOCATION_TASK_NAME = 'background-location-task';

// Conexión directa con las variables de entorno de tu Supabase
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

// 1. DEFINICIÓN DE LA TAREA EN SEGUNDO PLANO
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Error en la tarea de localización móvil:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const { latitude, longitude, heading } = locations[0].coords;
      
      try {
        // Obtenemos de forma segura el ID del elemento autenticado en el dispositivo móvil
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (userId) {
          // Inserción limpia en tu tabla histórica de ubicaciones
          await supabase.from('user_locations').insert([
            {
              user_id: userId,
              latitude: latitude,
              longitude: longitude,
              estado: 'En Ruta',
              updated_at: new Date().toISOString()
            }
          ]);
        }
      } catch (err) {
        console.error('Error transmitiendo coordenadas a Supabase:', err);
      }
    }
  }
});
/**
 * Solicita los permisos requeridos por Android e iOS para rastreo perimetral
 */
export const requestGpsPermissions = async (): Promise<boolean> => {
  try {
    // Permiso en primer plano (mientras la aplicación está abierta)
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.warn('Permiso de GPS en primer plano denegado');
      return false;
    }

    // Permiso en segundo plano (crucial para transmitir con la pantalla bloqueada)
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('Permiso de GPS en segundo plano denegado');
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error solicitando permisos de GPS nativos:', err);
    return false;
  }
};

 /**
 * Inicia el monitoreo constante del teléfono cada 30 segundos exactos
 */
export const startElementoTracking = async () => {
  try {
    const permisosConcedidos = await requestGpsPermissions();
    if (!permisosConcedidos) {
      return { success: false, message: 'Permisos de GPS nativos insuficientes' };
    }

    // Registramos la tarea con intervalos de tiempo estables para optimizar la batería
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,    // Transmisión estable cada 30 segundos exactos
      distanceInterval: 15,   // Transmisión al desplazarse más de 15 metros en ruta
      deferredUpdatesInterval: 30000,
      foregroundService: {
        notificationTitle: "Monitoreo de Ruta Activo",
        notificationBody: "Seguridad Vip 3000 C.A. — Coordinando posición en vivo.",
        notificationColor: "#0070f3"
      }
    });

    return { success: true, message: 'Rastreo perimetral iniciado correctamente' };
  } catch (err) {
    const mensajeError = err instanceof Error ? err.message : 'Error desconocido de Expo Location';
    console.error('No se pudo activar el servicio de localización:', mensajeError);
    return { success: false, error: mensajeError };
  }
};

