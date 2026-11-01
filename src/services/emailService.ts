import emailjs from '@emailjs/browser';

/**
 * Servicio de Email usando EmailJS
 * 
 * SISTEMA DE 3 NOTIFICACIONES AUTOMATIZADAS:
 * 
 * 1. Alerta de Registro Pendiente → Directiva
 * 2. Alerta de Reporte Creado → Operaciones y Directiva
 * 3. Alerta de Reporte Aprobado → Cliente + Directiva (CC)
 * 
 * CONFIGURACIÓN REQUERIDA EN EMAILJS:
 * 
 * Template 1: template_new_user_registration
 * Variables: {{to_email}}, {{to_name}}, {{username}}, {{nombre_completo}}, {{user_email}}, {{user_role}}
 * 
 * Template 2: template_new_report_created
 * Variables: {{to_email}}, {{to_name}}, {{report_title}}, {{report_project}}, {{report_description}}, {{supervisor_name}}
 * 
 * Template 3: template_report_approved
 * Variables: {{to_email}}, {{to_name}}, {{report_title}}, {{report_project}}, {{report_date}}, {{report_description}}, {{report_url}}
 */

// Configuración de EmailJS
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';

// Templates adicionales para las 3 notificaciones
const TEMPLATE_NEW_USER_REGISTRATION = import.meta.env.VITE_TEMPLATE_NEW_USER_REGISTRATION || 'template_new_user_registration';
const TEMPLATE_NEW_REPORT_CREATED = import.meta.env.VITE_TEMPLATE_NEW_REPORT_CREATED || 'template_new_report_created';
const TEMPLATE_REPORT_APPROVED = import.meta.env.VITE_TEMPLATE_REPORT_APPROVED || 'template_report_approved';

// Emails de destinatarios configurables
const DIRECTIVA_EMAIL = import.meta.env.VITE_DIRECTIVA_EMAIL || 'directiva@seguridad.com';
const OPERACIONES_EMAIL = import.meta.env.VITE_OPERACIONES_EMAIL || 'operaciones@seguridad.com';

export const emailService = {
  /**
   * Verificar si EmailJS está configurado
   */
  isConfigured(): boolean {
    return !!(EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID);
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
   * NOTIFICACIÓN 1: Alerta de Registro Pendiente
   * Se envía a Directiva cuando un nuevo usuario se registra
   */
  async sendNewUserRegistrationAlert(params: {
    username: string;
    nombre_completo: string;
    email: string;
    role: string;
  }): Promise<boolean> {
    console.log('📧 [NOTIFICACIÓN 1] Enviando alerta de registro pendiente a Directiva...');
    
    if (!this.isConfigured()) {
      console.log('📧 [SIMULADO] Email enviado a:', DIRECTIVA_EMAIL);
      console.log('📧 Asunto: Nuevo Usuario Registrado - ' + params.username);
      console.log('📧 Contenido:', params);
      return true;
    }

    try {
      const templateParams = {
        to_email: DIRECTIVA_EMAIL,
        to_name: 'Directiva',
        username: params.username,
        nombre_completo: params.nombre_completo,
        user_email: params.email,
        user_role: params.role,
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        TEMPLATE_NEW_USER_REGISTRATION,
        templateParams
      );

      console.log('✅ [NOTIFICACIÓN 1] Email enviado exitosamente a Directiva:', response);
      return true;
    } catch (error) {
      console.error('❌ [NOTIFICACIÓN 1] Error enviando email:', error);
      return false;
    }
  },

  /**
   * NOTIFICACIÓN 2: Alerta de Reporte Creado por Líder
   * Se envía a Operaciones y Directiva cuando se crea un nuevo reporte
   */
  async sendNewReportAlert(params: {
    tituloNovedad: string;
    proyecto: string;
    desarrollo: string;
    supervisorName: string;
  }): Promise<{ operaciones: boolean; directiva: boolean }> {
    console.log('📧 [NOTIFICACIÓN 2] Enviando alerta de reporte creado a Operaciones y Directiva...');
    
    const results = { operaciones: false, directiva: false };

    if (!this.isConfigured()) {
      console.log('📧 [SIMULADO] Email enviado a:', OPERACIONES_EMAIL);
      console.log('📧 [SIMULADO] Email enviado a:', DIRECTIVA_EMAIL);
      console.log('📧 Asunto: Nuevo Reporte Creado - ' + params.proyecto);
      console.log('📧 Contenido:', params);
      return { operaciones: true, directiva: true };
    }

    const templateParams = {
      report_title: params.tituloNovedad,
      report_project: params.proyecto,
      report_description: params.desarrollo,
      supervisor_name: params.supervisorName,
    };

    // Enviar a Operaciones
    try {
      const paramsOperaciones = {
        ...templateParams,
        to_email: OPERACIONES_EMAIL,
        to_name: 'Operaciones',
      };

      const responseOperaciones = await emailjs.send(
        EMAILJS_SERVICE_ID,
        TEMPLATE_NEW_REPORT_CREATED,
        paramsOperaciones
      );

      console.log('✅ [NOTIFICACIÓN 2] Email enviado a Operaciones:', responseOperaciones);
      results.operaciones = true;
    } catch (error) {
      console.error('❌ [NOTIFICACIÓN 2] Error enviando email a Operaciones:', error);
    }

    // Enviar a Directiva
    try {
      const paramsDirectiva = {
        ...templateParams,
        to_email: DIRECTIVA_EMAIL,
        to_name: 'Directiva',
      };

      const responseDirectiva = await emailjs.send(
        EMAILJS_SERVICE_ID,
        TEMPLATE_NEW_REPORT_CREATED,
        paramsDirectiva
      );

      console.log('✅ [NOTIFICACIÓN 2] Email enviado a Directiva:', responseDirectiva);
      results.directiva = true;
    } catch (error) {
      console.error('❌ [NOTIFICACIÓN 2] Error enviando email a Directiva:', error);
    }

    return results;
  },

  /**
   * NOTIFICACIÓN 3: Alerta de Reporte Aprobado
   * Se envía al Cliente Y a Directiva (CC) cuando se aprueba un reporte
   */
  async sendReportApprovalEmail(params: {
    clientEmail: string;
    clientName: string;
    reportTitle: string;
    reportProject: string;
    reportDate: string;
    reportDescription: string;
    reportUrl?: string;
  }): Promise<{ client: boolean; directiva: boolean }> {
    console.log('📧 [NOTIFICACIÓN 3] Enviando alerta de reporte aprobado al Cliente y Directiva...');
    
    const results = { client: false, directiva: false };

    if (!this.isConfigured()) {
      console.log('📧 [SIMULADO] Email enviado al Cliente:', params.clientEmail);
      console.log('📧 [SIMULADO] Email enviado a Directiva:', DIRECTIVA_EMAIL);
      console.log('📧 Asunto: Reporte Aprobado - ' + params.reportProject);
      console.log('📧 Contenido:', params);
      return { client: true, directiva: true };
    }

    const templateParams = {
      report_title: params.reportTitle,
      report_project: params.reportProject,
      report_date: params.reportDate,
      report_description: params.reportDescription,
      report_url: params.reportUrl || 'No disponible',
    };

    // Enviar al Cliente
    try {
      const paramsClient = {
        ...templateParams,
        to_email: params.clientEmail,
        to_name: params.clientName,
      };

      const responseClient = await emailjs.send(
        EMAILJS_SERVICE_ID,
        TEMPLATE_REPORT_APPROVED,
        paramsClient
      );

      console.log('✅ [NOTIFICACIÓN 3] Email enviado al Cliente:', responseClient);
      results.client = true;
    } catch (error) {
      console.error('❌ [NOTIFICACIÓN 3] Error enviando email al Cliente:', error);
    }

    // Enviar a Directiva (CC)
    try {
      const paramsDirectiva = {
        ...templateParams,
        to_email: DIRECTIVA_EMAIL,
        to_name: 'Directiva',
      };

      const responseDirectiva = await emailjs.send(
        EMAILJS_SERVICE_ID,
        TEMPLATE_REPORT_APPROVED,
        paramsDirectiva
      );

      console.log('✅ [NOTIFICACIÓN 3] Email enviado a Directiva (CC):', responseDirectiva);
      results.directiva = true;
    } catch (error) {
      console.error('❌ [NOTIFICACIÓN 3] Error enviando email a Directiva:', error);
    }

    return results;
  },
};
