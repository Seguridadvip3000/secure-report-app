import { supabase } from '../lib/supabase';
import { initialUsers, initialReports } from '../data/initialData';

/**
 * Script para migrar datos iniciales a Supabase
 * Ejecutar UNA SOLA VEZ después de crear las tablas
 */
export async function migrateInitialData() {
  console.log('🚀 Iniciando migración de datos iniciales...');

  try {
    // 1. Migrar usuarios
    console.log('📝 Migrando usuarios...');
    for (const user of initialUsers) {
      const { error } = await supabase
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
        });

      if (error) {
        console.error(`❌ Error migrando usuario ${user.name}:`, error);
      } else {
        console.log(`✅ Usuario migrado: ${user.name} (${user.role})`);
      }
    }

    // 2. Migrar reportes
    console.log('📝 Migrando reportes...');
    for (const report of initialReports) {
      const { error } = await supabase
        .from('reports')
        .upsert({
          id: report.id,
          fecha_hora: report.fechaHora,
          proyecto: report.proyecto,
          titulo_novedad: report.tituloNovedad,
          desarrollo: report.desarrollo,
          evidencias: report.evidencias,
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
        });

      if (error) {
        console.error(`❌ Error migrando reporte ${report.id}:`, error);
      } else {
        console.log(`✅ Reporte migrado: ${report.tituloNovedad} (${report.proyecto})`);
      }
    }

    console.log('✅ Migración completada exitosamente!');
    return true;
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    return false;
  }
}

/**
 * Verificar si los datos iniciales ya existen en Supabase
 */
export async function checkIfDataExists() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error verificando datos:', error);
      return false;
    }

    return users && users.length > 0;
  } catch (error) {
    console.error('Error verificando datos:', error);
    return false;
  }
}

/**
 * Ejecutar migración solo si es necesario
 */
export async function migrateIfNeeded() {
  const exists = await checkIfDataExists();
  
  if (exists) {
    console.log('ℹ️ Los datos ya existen en Supabase. Migración omitida.');
    return false;
  }

  console.log('📦 No se encontraron datos. Iniciando migración...');
  return await migrateInitialData();
}
