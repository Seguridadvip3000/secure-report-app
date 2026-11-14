import { supabase } from '../lib/supabase';

// Generador de sonido integrado (funciona en Android, iPhone y PC sin archivos MP3 externos)
const reproducirSonidoAlerta = (esEmergencia = false) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const tocarTono = (frecuencia: number, inicio: number, duracion: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = esEmergencia ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(frecuencia, ctx.currentTime + inicio);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + inicio + duracion);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracion);
    };

    if (esEmergencia) {
      // Sirena de emergencia S.O.S (6 pulsos agudos/graves)
      tocarTono(880, 0.0, 0.25);
      tocarTono(620, 0.28, 0.25);
      tocarTono(880, 0.56, 0.25);
      tocarTono(620, 0.84, 0.25);
      tocarTono(980, 1.12, 0.45);
    } else {
      // Doble timbre claro de notificación operativa
      tocarTono(780, 0.0, 0.18);
      tocarTono(1046, 0.2, 0.3);
    }
  } catch (e) {
    console.warn('Audio bloqueado por interacción previa:', e);
  }
};

// Banner visual flotante en pantalla para garantizar que el usuario vea la alerta
const mostrarBannerEnPantalla = (title: string, body: string, esEmergencia = false) => {
  const existente = document.getElementById('vip3000-alert-banner');
  if (existente) existente.remove();

  const banner = document.createElement('div');
  banner.id = 'vip3000-alert-banner';
  banner.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    width: 92%;
    max-width: 480px;
    background: ${esEmergencia ? '#dc2626' : '#0f172a'};
    color: #ffffff;
    padding: 16px;
    border-radius: 14px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.4);
    border: 2px solid ${esEmergencia ? '#fef08a' : '#3b82f6'};
    font-family: Arial, sans-serif;
    cursor: pointer;
  `;

  banner.innerHTML = `
    <div style="font-weight: 900; font-size: 15px; margin-bottom: 4px;">${title}</div>
    <div style="font-size: 13px; opacity: 0.95; line-height: 1.4;">${body}</div>
    <div style="font-size: 11px; margin-top: 8px; opacity: 0.75; text-align: right;">Toca para cerrar</div>
  `;

  banner.onclick = () => banner.remove();
  document.body.appendChild(banner);

  if (!esEmergencia) {
    setTimeout(() => {
      if (document.getElementById('vip3000-alert-banner')) banner.remove();
    }, 8000);
  }
};

export const notificationService = {
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission !== 'denied') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  },

  showPushNotification(title: string, body: string, esEmergencia = false): void {
    // 1. Reproducir sonido inmediato y mostrar banner visual en pantalla
    reproducirSonidoAlerta(esEmergencia);
    mostrarBannerEnPantalla(title, body, esEmergencia);

    // 2. Si está abierto dentro de la APK de Android, enviar notificación nativa con sonido
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
          emergency: esEmergencia,
        })
      );
      return;
    }

    // 3. Notificación del navegador web (PC / Safari)
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/logo-vip3000.jpg',
        tag: `${title}-${Date.now()}`,
      });
      setTimeout(() => notification.close(), 7000);
    }
  },
  subscribeToUserNotifications(userRole: string, userProjects: string[]) {
    const rol = (userRole || '').toLowerCase().trim();
    const proyectos = Array.isArray(userProjects) ? userProjects : [];

    const channel = supabase
      .channel(`notificaciones-rol-${rol}-${Date.now()}`)
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

          if (rol === 'cliente' && notif.target_project) {
            const tieneAcceso = proyectos.includes('*') || proyectos.includes(notif.target_project);
            if (!tieneAcceso) return;
          }

          const esEmergencia = (notif.title || '').includes('S.O.S') || (notif.title || '').includes('EMERGENCIA');
          this.showPushNotification(notif.title, notif.body, esEmergencia);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // 1. NUEVO REPORTE
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

  // 2. BOTÓN DE PÁNICO S.O.S (EMERGENCIA)
  async notifyEmergencySOS(nombreLider: string, proyecto: string, lat: number, lng: number): Promise<void> {
    await supabase.from('notifications').insert([
      {
        title: '🚨 ¡ALERTA S.O.S DE EMERGENCIA!',
        body: `El líder ${nombreLider} activó el botón de pánico en ${proyecto}. GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        target_roles: ['operaciones', 'directiva', 'admin', 'administrador'],
        target_project: proyecto,
      },
    ]);
  },

  // 3. NUEVO REGISTRO DE USUARIO
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

  // 4. REPORTE ENVIADO AL CLIENTE
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
