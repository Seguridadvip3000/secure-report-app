import { supabase } from '../lib/supabase'; 
import { AttendanceReport } from '../types';

export const attendanceService = {
  // 1. Obtener el último estado del usuario para saber si poner botón de Entrada o Salida
  async getLastStatus(userId: string): Promise<'entrada' | 'salida' | null> {
    const { data, error } = await supabase
      .from('attendance_reports')
      .select('status')
      .eq('user_id', userId)
      .order('fecha_hora', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error obteniendo el último estado de asistencia:', error);
      return null;
    }
    
    return data && data.length > 0 ? (data[0].status as 'entrada' | 'salida') : null;
  },

  // 2. Registrar un nuevo reporte de asistencia (Entrada/Salida) con el GPS o la contingencia de Caracas
  async registerAttendance(attendance: Omit<AttendanceReport, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('attendance_reports')
      .insert([attendance])
      .select();

    if (error) {
      console.error('Error al insertar reporte de asistencia:', error);
      throw error;
    }
    return data;
  },

  // 3. Obtener todo el historial de rutas y asistencias para el panel de la Directiva
  async getAllActiveRoutes() {
    const { data, error } = await supabase
      .from('attendance_reports')
      .select('*')
      .order('fecha_hora', { ascending: false });

    if (error) {
      console.error('Error al recuperar bitácora de rutas:', error);
      throw error;
    }
    return data;
  }
};