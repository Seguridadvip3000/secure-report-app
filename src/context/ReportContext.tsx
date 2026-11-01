import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Report, ReportStatus } from '../types';
import { initialReports } from '../data/initialData';
import { v4 as uuidv4 } from 'uuid';
import { getStorageMode } from '../config/appConfig';
import { reportService } from '../services/reportService';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { generateReportPDF } from '../utils/pdfGenerator';
import { supabase } from '../lib/supabase';

interface ReportContextType {
  reports: Report[];
  addReport: (report: Omit<Report, 'id' | 'createdAt' | 'visibleForClient'>) => Promise<void>;
  updateReportStatus: (id: string, status: ReportStatus) => Promise<void>;
  approveForClient: (id: string, userId: string) => Promise<void>;
  rejectReport: (id: string) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  getReportById: (id: string) => Report | undefined;
  refreshReports: () => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = 'securereport_reports';

function loadLocalReports(): Report[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return initialReports;
}

function saveLocalReports(reports: Report[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const storageMode = getStorageMode();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(storageMode === 'supabase');

  // Load reports based on storage mode
  useEffect(() => {
    if (storageMode === 'supabase') {
      loadReportsFromSupabase();
    } else {
      setReports(loadLocalReports());
    }
  }, [storageMode]);

  const loadReportsFromSupabase = async () => {
    try {
      console.log('🔄 [ReportContext] Cargando reportes desde Supabase...');
      const supabaseReports = await reportService.getAllReports();
      console.log('📊 [ReportContext] Reportes recibidos de Supabase:', supabaseReports.length);
      
      // Map database fields to frontend fields
      const mappedReports = supabaseReports.map((r: any) => {
        const mapped = {
          id: r.id,
          fechaHora: r.fecha_hora,
          proyecto: r.proyecto,
          tituloNovedad: r.titulo_novedad,
          desarrollo: r.desarrollo,
          evidencias: r.evidencias || [],
          ubicacionGPS: r.ubicacion_gps,
          quienReporta: r.quien_reporta,
          createdBy: r.created_by,
          status: r.status,
          createdAt: r.created_at,
          notes: r.notes,
          approvedByOperaciones: r.approved_by_operaciones,
          approvedAtOperaciones: r.approved_at_operaciones,
          visibleForClient: r.visible_for_client,
          pdfUrl: r.pdf_url,
          emailEnviadoA: r.email_enviado_a,
          emailEnviadoAt: r.email_enviado_at,
        };
        
        // Log solo para reportes aprobados
        if (r.status === 'aprobado' || r.visible_for_client) {
          console.log(`📄 [ReportContext] Reporte mapeado: "${r.titulo_novedad}" - status: ${r.status}, visibleForClient: ${r.visible_for_client}, proyecto: ${r.proyecto}`);
        }
        
        return mapped;
      });
      
      console.log('✅ [ReportContext] Total de reportes mapeados:', mappedReports.length);
      setReports(mappedReports);
    } catch (error) {
      console.error('❌ [ReportContext] Error cargando reportes desde Supabase:', error);
      // Fallback to local data
      setReports(initialReports);
    } finally {
      setLoading(false);
    }
  };

  const refreshReports = async () => {
    if (storageMode === 'supabase') {
      await loadReportsFromSupabase();
    }
  };

  // Save local reports when they change (only in local mode)
  useEffect(() => {
    if (storageMode === 'local' && reports.length > 0) {
      saveLocalReports(reports);
    }
  }, [reports, storageMode]);

  const addReport = async (report: Omit<Report, 'id' | 'createdAt' | 'visibleForClient'>) => {
    console.log('📝 addReport llamado con:', report);
    
    if (storageMode === 'supabase') {
      try {
        // Validar que createdBy sea un UUID válido
        console.log('🔍 Validando createdBy:', report.createdBy);
        if (!report.createdBy || report.createdBy === 'system' || !report.createdBy.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.error('❌ createdBy no es un UUID válido:', report.createdBy);
          throw new Error(`createdBy debe ser un UUID válido de Supabase. Valor recibido: ${report.createdBy}`);
        }

        // 1. Crear el reporte primero para obtener el ID
        const newReportId = uuidv4();
        console.log('🆔 Nuevo ID de reporte generado:', newReportId);
        
        // 2. Subir imágenes a Supabase Storage
        let uploadedEvidenceUrls: string[] = [];
        if (report.evidencias && report.evidencias.length > 0) {
          console.log('📸 Subiendo evidencias a Supabase Storage...');
          console.log(`📸 Cantidad de evidencias: ${report.evidencias.length}`);
          
          try {
            uploadedEvidenceUrls = await storageService.uploadImagesFromBase64(
              report.evidencias,
              newReportId
            );
            console.log(`✅ ${uploadedEvidenceUrls.length} evidencias subidas exitosamente`);
            console.log('📸 URLs de evidencias:', uploadedEvidenceUrls);
          } catch (uploadError) {
            console.error('❌ Error subiendo evidencias:', uploadError);
            console.error('❌ Detalles:', uploadError instanceof Error ? uploadError.message : uploadError);
            // Continuar sin evidencias si falla la subida
            uploadedEvidenceUrls = [];
          }
        }

        // 3. Crear el reporte con las URLs de las evidencias
        console.log('📤 Llamando a reportService.createReport...');
        await reportService.createReport({
          fechaHora: report.fechaHora,
          proyecto: report.proyecto,
          tituloNovedad: report.tituloNovedad,
          desarrollo: report.desarrollo,
          evidencias: uploadedEvidenceUrls,
          ubicacionGPS: report.ubicacionGPS,
          quienReporta: report.quienReporta,
          createdBy: report.createdBy,
        });

        console.log('✅ Reporte creado exitosamente en Supabase');
        await refreshReports();
      } catch (error) {
        console.error('❌ Error creating report:', error);
        if (error instanceof Error) {
          console.error('❌ Mensaje:', error.message);
          console.error('❌ Stack:', error.stack);
        }
        throw error;
      }
    } else {
      const newReport: Report = {
        ...report,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        visibleForClient: false,
      };
      setReports(prev => [newReport, ...prev]);
    }
  };

  const updateReportStatus = async (id: string, status: ReportStatus) => {
    if (storageMode === 'supabase') {
      try {
        await reportService.updateReportStatus(id, status);
        await refreshReports();
      } catch (error) {
        console.error('Error updating report status:', error);
      }
    } else {
      setReports(prev =>
        prev.map(r => (r.id === id ? { ...r, status } : r))
      );
    }
  };

  const approveForClient = async (id: string, userId: string) => {
    if (storageMode === 'supabase') {
      try {
        const report = reports.find(r => r.id === id);
        if (!report) return;

      // 1. Buscar cliente para este proyecto en Supabase
      let clientEmail: string | undefined;
      let clientName: string = 'Cliente';
      try {
        console.log('🔍 Buscando cliente para el proyecto:', report.proyecto);
        const { data: clientUsers, error } = await supabase
          .from('users')
          .select('email, nombre_completo, proyectos')
          .eq('role', 'cliente')
          .eq('status', 'aprobado');
        
        if (error) {
          console.error('❌ Error buscando clientes:', error);
        } else if (clientUsers && clientUsers.length > 0) {
          console.log('✅ Clientes encontrados:', clientUsers.length);
          
          // Buscar cliente con acceso al proyecto específico o acceso global
          const clientUser = clientUsers.find(
            (u: any) => 
              u.proyectos?.includes(report.proyecto) || 
              u.proyectos?.includes('*')
          );
          
          if (clientUser) {
            clientEmail = clientUser.email;
            clientName = clientUser.nombre_completo;
            console.log('✅ Cliente encontrado:', clientEmail, clientName);
          } else {
            console.warn('⚠️ No se encontró cliente para el proyecto:', report.proyecto);
          }
        } else {
          console.warn('⚠️ No hay clientes aprobados en el sistema');
        }
      } catch (error) {
        console.error('❌ Error en búsqueda de cliente:', error);
      }
        // 2. Generar PDF del reporte
        let pdfUrl: string | undefined;
        try {
          console.log('📄 Generando PDF del reporte...');
          const pdfData = await generateReportPDF(report);
          
          // 3. Subir PDF a Supabase Storage
          console.log('📤 Subiendo PDF a Supabase Storage...');
          pdfUrl = await storageService.uploadPDF(pdfData, report.id, report.proyecto);
          console.log('✅ PDF subido:', pdfUrl);
        } catch (error) {
          console.error('Error generando/subiendo PDF:', error);
        }

        // 4. Aprobar el reporte en la base de datos
        await reportService.approveReport(id, userId, clientEmail, pdfUrl);
        await refreshReports();

        // 5. NOTIFICACIÓN 3: Enviar email al cliente Y a Directiva (CC)
        if (clientEmail) {
          console.log(`📧 [NOTIFICACIÓN 3] Enviando email al Cliente (${clientEmail}) y Directiva...`);
          const emailResults = await emailService.sendReportApprovalEmail({
            clientEmail,
            clientName,
            reportTitle: report.tituloNovedad,
            reportProject: report.proyecto,
            reportDate: new Date(report.fechaHora).toLocaleString('es-ES'),
            reportDescription: report.desarrollo.substring(0, 200) + '...',
            reportUrl: pdfUrl,
          });

          console.log('✅ [NOTIFICACIÓN 3] Resultados de envío:', emailResults);
          if (emailResults.client) {
            console.log(`✅ Email enviado al Cliente: ${clientEmail}`);
          }
          if (emailResults.directiva) {
            console.log(`✅ Email enviado a Directiva (CC)`);
          }
        } else {
          console.warn('⚠️ No se pudo enviar email: cliente no encontrado');
        }
      } catch (error) {
        console.error('Error approving report:', error);
      }
    } else {
      setReports(prev => {
        const report = prev.find(r => r.id === id);
        if (!report) return prev;

        let clientEmail: string | undefined;
        try {
          const usersData = localStorage.getItem('securereport_users');
          if (usersData) {
            const users = JSON.parse(usersData);
            const clientUser = users.find(
              (u: any) => u.role === 'cliente' && u.proyectos?.includes(report.proyecto)
            );
            clientEmail = clientUser?.email;
          }
        } catch {}

        if (clientEmail) {
          console.log(`📧 Email enviado a ${clientEmail}: Nuevo reporte aprobado para ${report.proyecto}`);
        }

        return prev.map(r =>
          r.id === id
            ? {
                ...r,
                visibleForClient: true,
                approvedByOperaciones: userId,
                approvedAtOperaciones: new Date().toISOString(),
                status: 'aprobado' as ReportStatus,
                emailEnviadoA: clientEmail,
                emailEnviadoAt: new Date().toISOString(),
              }
            : r
        );
      });
    }
  };

  const rejectReport = async (id: string) => {
    if (storageMode === 'supabase') {
      try {
        await reportService.rejectReport(id);
        await refreshReports();
      } catch (error) {
        console.error('Error rejecting report:', error);
      }
    } else {
      setReports(prev =>
        prev.map(r =>
          r.id === id ? { ...r, status: 'rechazado' as ReportStatus, visibleForClient: false } : r
        )
      );
    }
  };

  const addNote = async (id: string, note: string) => {
    if (storageMode === 'supabase') {
      try {
        await reportService.addNote(id, note);
        await refreshReports();
      } catch (error) {
        console.error('Error adding note:', error);
      }
    } else {
      setReports(prev =>
        prev.map(r =>
          r.id === id ? { ...r, notes: r.notes ? `${r.notes}\n${note}` : note } : r
        )
      );
    }
  };

  const deleteReport = async (id: string) => {
    if (storageMode === 'supabase') {
      try {
        await reportService.deleteReport(id);
        await refreshReports();
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    } else {
      setReports(prev => prev.filter(r => r.id !== id));
    }
  };

  const getReportById = (id: string) => {
    return reports.find(r => r.id === id);
  };

  return (
    <ReportContext.Provider
      value={{
        reports,
        addReport,
        updateReportStatus,
        approveForClient,
        rejectReport,
        addNote,
        deleteReport,
        getReportById,
        refreshReports,
        loading,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReports must be used within a ReportProvider');
  }
  return context;
}
