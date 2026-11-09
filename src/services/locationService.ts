/**
 * Dispara el monitoreo en segundo plano integrando las notificaciones persistentes
 */
export const startElementoTracking = async () => {
  try {
    const permisosConcedidos = await requestGpsPermissions();
    if (!permisosConcedidos) {
      return { success: false, message: 'Permisos de GPS nativos insuficientes' };
    }

    // Activamos las actualizaciones con intervalos eficientes cada 30 segundos
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,    // Envío periódico estable cada 30 segundos exactos
      distanceInterval: 15,   // O al desplazarse más de 15 metros en su ruta
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
