import emailjs from '@emailjs/browser';

/**
 * Servicio de Email usando EmailJS
 * 
 * CONFIGURACIÓN REQUERIDA:
 * 1. Crear cuenta en https://www.emailjs.com/
 * 2. Crear un "Email Service" (Gmail, Outlook, etc.)
 * 3. Crear un "Email Template" con las variables:
 *    - to_email
 *    - to_name
 *    - report_title
 *    - report_project
 *    - report_date
 *    - report_description
 *    - report_url
 * 4. Copiar las credenciales y actualizar las variables de entorno
 */

// Configuración de EmailJS
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';

export const emailService = {
  /**
   * Verificar si EmailJS está configurado
   */
  isConfigured(): boolean {
    return !!(EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID);
  },

  /**
   * Inicializar EmailJS
   */
  initialize() {
    if (this.isConfigured()) {
      emailjs.init(EMAILJS_PUBLIC_KEY);
      console.log('✅ EmailJS inicializado');
    } else {
      console.warn('⚠️ EmailJS no configurado. Las notificaciones por email serán simuladas.');
    }
  },

  /**
   * Enviar notificación de reporte aprobado al cliente
   */
  async sendReportApprovalEmail(params: {
    clientEmail: string;
    clientName: string;
    reportTitle: string;
    reportProject: string;
    reportDate: string;
    reportDescription: string;
    reportUrl?: string;
  }): Promise<boolean> {
    if (!this.isConfigured()) {
      // Simular envío de email
      console.log('📧 [SIMULADO] Email enviado a:', params.clientEmail);
      console.log('📧 Asunto: Nuevo Reporte Aprobado - ' + params.reportProject);
      console.log('📧 Contenido:', params);
      return true;
    }

    try {
      const templateParams = {
        to_email: params.clientEmail,
        to_name: params.clientName,
        report_title: params.reportTitle,
        report_project: params.reportProject,
        report_date: params.reportDate,
        report_description: params.reportDescription,
        report_url: params.reportUrl || 'No disponible',
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );

      console.log('✅ Email enviado exitosamente:', response);
      return true;
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return false;
    }
  },

  /**
   * Enviar notificación de nuevo usuario pendiente a Directiva
   */
  async sendUserPendingApprovalEmail(params: {
    directivaEmail: string;
    userName: string;
    userEmail: string;
    userRole: string;
    userPhone: string;
  }): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('📧 [SIMULADO] Email de aprobación de usuario enviado a:', params.directivaEmail);
      return true;
    }

    try {
      const templateParams = {
        to_email: params.directivaEmail,
        user_name: params.userName,
        user_email: params.userEmail,
        user_role: params.userRole,
        user_phone: params.userPhone,
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        'template_user_pending', // ID del template para usuarios pendientes
        templateParams
      );

      console.log('✅ Email de aprobación enviado:', response);
      return true;
    } catch (error) {
      console.error('❌ Error enviando email de aprobación:', error);
      return false;
    }
  },

  /**
   * Enviar notificación de usuario aprobado
   */
  async sendUserApprovedEmail(params: {
    userEmail: string;
    userName: string;
    userRole: string;
  }): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('📧 [SIMULADO] Email de aprobación enviado a:', params.userEmail);
      return true;
    }

    try {
      const templateParams = {
        to_email: params.userEmail,
        to_name: params.userName,
        user_role: params.userRole,
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        'template_user_approved', // ID del template para usuarios aprobados
        templateParams
      );

      console.log('✅ Email de usuario aprobado enviado:', response);
      return true;
    } catch (error) {
      console.error('❌ Error enviando email de usuario aprobado:', error);
      return false;
    }
  },
};

// Inicializar EmailJS al cargar
emailService.initialize();
