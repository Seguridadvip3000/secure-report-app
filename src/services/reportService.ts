import { supabase } from '../lib/supabase';
import type { Report, ReportStatus } from '../types';

export const reportService = {
  // Obtener todos los reportes
  async getAllReports(): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener reporte por ID
  async getReportById(id: string): Promise<Report | null> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Crear nuevo reporte
  async createReport(reportData: {
    fechaHora: string;
    proyecto: string;
    tituloNovedad: string;
    desarrollo: string;
    evidencias: string[];
    ubicacionGPS: { lat: number; lng: number; address?: string };
    quienReporta: string;
    createdBy: string;
  }): Promise<Report> {
    console.log('📝 Intentando crear reporte en Supabase...');
    console.log('📋 Datos del reporte:', {
      fechaHora: reportData.fechaHora,
      proyecto: reportData.proyecto,
      tituloNovedad: reportData.tituloNovedad,
      quienReporta: reportData.quienReporta,
      createdBy: reportData.createdBy,
      evidenciasCount: reportData.evidencias?.length || 0,
      ubicacionGPS: reportData.ubicacionGPS
    });

    try {
      // Validar que createdBy sea un UUID válido
      if (!reportData.createdBy || reportData.createdBy === 'system') {
        throw new Error('createdBy debe ser un UUID válido de usuario, no "system"');
      }

      // Preparar datos para insertar
      const insertData = {
        fecha_hora: reportData.fechaHora,
        proyecto: reportData.proyecto,
        titulo_novedad: reportData.tituloNovedad,
        desarrollo: reportData.desarrollo,
        evidencias: reportData.evidencias || [],
        ubicacion_gps: reportData.ubicacionGPS || { lat: 0, lng: 0 },
        quien_reporta: reportData.quienReporta,
        created_by: reportData.createdBy,
        status: 'pendiente',
        visible_for_client: false,
      };

      console.log('📤 Datos a insertar:', insertData);

      const { data, error } = await supabase
        .from('reports')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error de Supabase al crear reporte:', error);
        console.error('❌ Detalles del error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Reporte creado exitosamente:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Excepción al crear reporte:', error);
      if (error instanceof Error) {
        console.error('❌ Mensaje de error:', error.message);
        console.error('❌ Stack trace:', error.stack);
      }
      throw error;
    }
  },

  // Aprobar reporte para cliente
  async approveReport(reportId: string, approvedBy: string, clientEmail?: string, pdfUrl?: string): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .update({
        status: 'aprobado',
        visible_for_client: true,
        approved_by_operaciones: approvedBy,
        approved_at_operaciones: new Date().toISOString(),
        email_enviado_a: clientEmail,
        email_enviado_at: clientEmail ? new Date().toISOString() : null,
        pdf_url: pdfUrl,
      })
      .eq('id', reportId);

    if (error) throw error;
  },

  // Rechazar reporte
  async rejectReport(reportId: string): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .update({
        status: 'rechazado',
        visible_for_client: false,
      })
      .eq('id', reportId);

    if (error) throw error;
  },

  // Actualizar estado del reporte
  async updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', reportId);

    if (error) throw error;
  },

  // Agregar nota al reporte
  async addNote(reportId: string, note: string): Promise<void> {
    const { data: report } = await supabase
      .from('reports')
      .select('notes')
      .eq('id', reportId)
      .single();

    const newNotes = report?.notes ? `${report.notes}\n${note}` : note;

    const { error } = await supabase
      .from('reports')
      .update({ notes: newNotes })
      .eq('id', reportId);

    if (error) throw error;
  },

  // Eliminar reporte
  async deleteReport(reportId: string): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;
  },

  // Subir evidencia a Supabase Storage
  async uploadEvidence(file: File, reportId: string, index: number): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${reportId}/${index}.${fileExt}`;
    const filePath = `evidencias/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('reports')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Obtener reportes visibles para cliente
  async getVisibleReportsForClient(): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('visible_for_client', true)
      .eq('status', 'aprobado')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener reportes pendientes de aprobación
  async getPendingReports(): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .in('status', ['pendiente', 'en_proceso'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
