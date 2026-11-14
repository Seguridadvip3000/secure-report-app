import { supabase } from '../lib/supabase';

export const notificationService = {
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission !== 'denied') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  },

  showPushNotification(title: string, body: string, options?: NotificationOptions): void {
    // 1. Si está abierto dentro de la APK de Android, enviar al sistema nativo de notificaciones
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
        })
      );
      return;
    }

    // 2. Si está en navegador web (PC / Safari)
    if ('Notification' in window && Notification.permission === 'granted') {
      const defaultOptions: NotificationOptions = {
        body,
        icon: '/logo-vip3000.jpg',
        badge: '/logo-vip3000.jpg',
        tag: `${title}-${Date.now()}`,
        ...options,
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, defaultOptions);
        });
      } else {
        const notification = new Notification(title, defaultOptions);
        setTimeout(() => notification.close(), 6000);
      }
    }
  },
  // ESCUCHA EN TIEMPO REAL PARA EL USUARIO CONECTADO SEGÚN SU ROL Y PROYECTOS
  subscribeToUserNotifications(userRole: string, userProjects: string[]) {
    const rol = (userRole || '').toLowerCase().trim();
    const proyectos = Array.isArray(userProjects) ? userProjects : [];

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new as {
            title: string;
            body: string;
            target_roles: string[];
            target_project?: string | null;
          };

          const rolesDestino = (notif.target_roles || []).map((r) => r.toLowerCase());
          const coincideRol =
            rolesDestino.includes(rol) ||
            (rol === 'administrador' && rolesDestino.includes('admin')) ||
            (rol === 'admin' && rolesDestino.includes('administrador'));

          if (!coincideRol) return;

          // Si es cliente, verificar que el reporte pertenezca estrictamente a su proyecto
          if (rol === 'cliente' && notif.target_project) {
            const tieneAcceso = proyectos.includes('*') || proyectos.includes(notif.target_project);
            if (!tieneAcceso) return;
          }

          this.showPushNotification(notif.title, notif.body);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // 1. NUEVO REPORTE: Notifica a Operaciones, Directiva y Administrador
  async notifyNewReportCreated(proyecto: string, tituloNovedad: string): Promise<void> {
    await supabase.from('notifications').insert([
      {
        title: '📄 Nuevo Reporte Registrado',
        body: `Proyecto ${proyecto}: ${tituloNovedad}`,
        target_roles: ['operaciones', 'directiva', 'admin', 'administrador'],
        target_project: proyecto,
      },
    ]);
  },

  // 2. NUEVO REGISTRO: Si es Líder notifica a Operaciones, Directiva y Admin; otros roles solo a Directiva y Admin
  async notifyNewUserRegistration(username: string, nombre_completo: string, role: string): Promise<void> {
    const rolNuevo = (role || '').toLowerCase().trim();
    const rolesDestino =
      rolNuevo === 'lider'
        ? ['operaciones', 'directiva', 'admin', 'administrador']
        : ['directiva', 'admin', 'administrador'];

    await supabase.from('notifications').insert([
      {
        title: '👤 Nueva Solicitud de Registro',
        body: `${nombre_completo} (@${username}) solicita acceso como ${role.toUpperCase()}.`,
        target_roles: rolesDestino,
        target_project: null,
      },
    ]);
  },

  // 3. REPORTE APROBADO / ENVIADO: Notifica exclusivamente al Cliente asignado a ese proyecto
  async notifyReportApproved(tituloNovedad: string, proyecto: string): Promise<void> {
    await supabase.from('notifications').insert([
      {
        title: '✅ Nuevo Reporte Verificado',
        body: `${proyecto}: ${tituloNovedad}`,
        target_roles: ['cliente'],
        target_project: proyecto,
      },
    ]);
  },
};
