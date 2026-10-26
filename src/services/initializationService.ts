import { supabase } from '../lib/supabase';
import { initialUsers, initialReports } from '../data/initialData';

/**
 * Servicio de inicialización de datos en Supabase
 * Inserta usuarios y reportes de prueba en la base de datos
 */
export const initializationService = {
  /**
   * Verificar si la base de datos tiene usuarios
   */
  async checkIfDatabaseIsEmpty(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Error verificando base de datos:', error);
        return true; // Asumir vacío si hay error
      }

      return !data || data.length === 0;
    } catch (error) {
      console.error('Error verificando base de datos:', error);
      return true;
    }
  },

  /**
   * Insertar usuarios de prueba en Supabase
   */
  async insertInitialUsers(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      console.log('🚀 Iniciando inserción de usuarios de prueba...');

      // Limpiar usuarios existentes (excepto el directiva inicial si existe)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // No eliminar nada, solo insertar

      let insertedCount = 0;

      // Insertar cada usuario
      for (const user of initialUsers) {
        const { data, error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            proyectos: user.proyectos || [],
            created_at: user.createdAt,
            approved_at: user.approvedAt,
            approved_by: user.approvedBy,
            rejection_reason: user.rejectionReason,
          }, {
            onConflict: 'id'
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Error insertando usuario ${user.name}:`, error);
        } else {
          console.log(`✅ Usuario insertado: ${user.name} (${user.role})`);
          insertedCount++;
        }
      }

      console.log(`✅ ${insertedCount} usuarios insertados exitosamente`);
      return {
        success: true,
        message: `${insertedCount} usuarios insertados exitosamente`,
        count: insertedCount
      };
    } catch (error) {
      console.error('Error en insertInitialUsers:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        count: 0
      };
    }
  },

  /**
   * Insertar reportes de prueba en Supabase
   */
  async insertInitialReports(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      console.log('🚀 Iniciando inserción de reportes de prueba...');

      let insertedCount = 0;

      // Insertar cada reporte
      for (const report of initialReports) {
        const { data, error } = await supabase
          .from('reports')
          .upsert({
            id: report.id,
            fecha_hora: report.fechaHora,
            proyecto: report.proyecto,
            titulo_novedad: report.tituloNovedad,
            desarrollo: report.desarrollo,
            evidencias: report.evidencias || [],
            ubicacion_gps: report.ubicacionGPS,
            quien_reporta: report.quienReporta,
            created_by: report.createdBy,
            status: report.status,
            created_at: report.createdAt,
            notes: report.notes,
            approved_by_operaciones: report.approvedByOperaciones,
            approved_at_operaciones: report.approvedAtOperaciones,
            visible_for_client: report.visibleForClient,
            pdf_url: report.pdfUrl,
            email_enviado_a: report.emailEnviadoA,
            email_enviado_at: report.emailEnviadoAt,
          }, {
            onConflict: 'id'
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Error insertando reporte ${report.id}:`, error);
        } else {
          console.log(`✅ Reporte insertado: ${report.tituloNovedad} (${report.proyecto})`);
          insertedCount++;
        }
      }

      console.log(`✅ ${insertedCount} reportes insertados exitosamente`);
      return {
        success: true,
        message: `${insertedCount} reportes insertados exitosamente`,
        count: insertedCount
      };
    } catch (error) {
      console.error('Error en insertInitialReports:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        count: 0
      };
    }
  },

  /**
   * Inicializar todos los datos de prueba (usuarios + reportes)
   */
  async initializeAllData(): Promise<{ success: boolean; message: string; usersCount: number; reportsCount: number }> {
    try {
      console.log('🎯 Iniciando inicialización completa de datos...');

      // 1. Insertar usuarios
      const usersResult = await this.insertInitialUsers();
      if (!usersResult.success) {
        return {
          success: false,
          message: `Error insertando usuarios: ${usersResult.message}`,
          usersCount: 0,
          reportsCount: 0
        };
      }

      // 2. Insertar reportes
      const reportsResult = await this.insertInitialReports();
      if (!reportsResult.success) {
        return {
          success: false,
          message: `Error insertando reportes: ${reportsResult.message}`,
          usersCount: usersResult.count,
          reportsCount: 0
        };
      }

      console.log('✅ Inicialización completada exitosamente');
      return {
        success: true,
        message: 'Datos inicializados exitosamente',
        usersCount: usersResult.count,
        reportsCount: reportsResult.count
      };
    } catch (error) {
      console.error('Error en initializeAllData:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        usersCount: 0,
        reportsCount: 0
      };
    }
  },

  /**
   * Verificar si un usuario específico existe en Supabase
   */
  async checkUserExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (error) {
        return false;
      }

      return !!data;
    } catch (error) {
      return false;
    }
  },
};
