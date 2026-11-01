/**
 * Servicio de Notificaciones Push Nativas
 * Utiliza la Web Notification API del navegador
 */

export const notificationService = {
  /**
   * Solicitar permisos de notificación al usuario
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('⚠️ Este navegador no soporta notificaciones');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Permisos de notificación ya concedidos');
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      console.log(`🔔 Permiso de notificación: ${permission}`);
      return permission;
    }

    return Notification.permission;
  },

  /**
   * Mostrar notificación push del sistema
   */
  showPushNotification(title: string, body: string, options?: NotificationOptions): Notification | null {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notificaciones no soportadas');
      return null;
    }

    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Permisos de notificación no concedidos');
      return null;
    }

    // Configuración por defecto
    const defaultOptions: NotificationOptions = {
      body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: title, // Evita duplicados
      requireInteraction: false,
      ...options,
    };

    // Intentar usar Service Worker si está disponible
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, defaultOptions);
      });
    } else {
      // Fallback a notificación directa
      const notification = new Notification(title, defaultOptions);
      
      // Cerrar automáticamente después de 5 segundos
      setTimeout(() => notification.close(), 5000);
      
      return notification;
    }

    return null;
  },

  /**
   * NOTIFICACIÓN 1: Alerta de Registro Pendiente
   */
  notifyNewUserRegistration(username: string, nombre_completo: string, role: string): void {
    const title = '👤 Registro Pendiente';
    const body = `El usuario ${username} (${nombre_completo}) solicita aprobación como ${role}.`;
    
    this.showPushNotification(title, body, {
      tag: `new-user-${username}`,
    });

    console.log(`🔔 [NOTIFICACIÓN 1] Push enviada: ${title}`);
  },

  /**
   * NOTIFICACIÓN 2: Alerta de Reporte Creado
   */
  notifyNewReportCreated(proyecto: string, tituloNovedad: string): void {
    const title = '📄 Nuevo Reporte';
    const body = `Se registró una novedad en ${proyecto}: ${tituloNovedad}`;
    
    this.showPushNotification(title, body, {
      tag: `new-report-${proyecto}-${Date.now()}`,
    });

    console.log(`🔔 [NOTIFICACIÓN 2] Push enviada: ${title}`);
  },

  /**
   * NOTIFICACIÓN 3: Alerta de Reporte Aprobado
   */
  notifyReportApproved(tituloNovedad: string, proyecto: string): void {
    const title = '✅ Reporte Aprobado';
    const body = `${tituloNovedad} - ${proyecto}`;
    
    this.showPushNotification(title, body, {
      tag: `approved-report-${tituloNovedad}-${Date.now()}`,
    });

    console.log(`🔔 [NOTIFICACIÓN 3] Push enviada: ${title}`);
  },
};
