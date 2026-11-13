import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Report, ReportStatus } from '../types';
import { initialReports } from '../data/initialData';
import { v4 as uuidv4 } from 'uuid';
import { getStorageMode } from '../config/appConfig';
import { reportService } from '../services/reportService';
import { storageService } from '../services/storageService';
import { notificationService } from '../services/notificationService';
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

// Comprime imágenes pesadas del teléfono para garantizar subida rápida y respaldo seguro
const comprimirImagenBase64 = (base64Str: string, maxWidth = 900, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const storageMode = getStorageMode();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(storageMode === 'supabase');

  useEffect(() => {
    if (storageMode === 'supabase') {
      loadReportsFromSupabase();
    } else {
      setReports(loadLocalReports());
    }
  }, [storageMode]);

  const loadReportsFromSupabase = async () => {
    try {
      const supabaseReports = await reportService.getAllReports();
      const mappedReports = supabaseReports.map((r: any) => ({
        id: r.id,
        fechaHora: r.fecha_hora,
        proyecto: r.proyecto,
        tituloNovedad: r.titulo_novedad,
        desarrollo: r.desarrollo,
        evidencias: Array.isArray(r.evidencias) ? r.evidencias : [],
        ubicacionGPS: r.ubicacion_gps,
        quienReporta: r.quien_reporta,
        createdBy: r.created_by,
        status: r.status,
        createdAt: r.created_at,
        notes: r.notes,
        approvedByOperaciones: r.approved_by_operaciones,
        approvedAtOperaciones: r.approved_at_operaciones,
        visibleForClient: r.visible_for_client ?? r.visibleForClient,
        pdfUrl: r.pdf_url,
        emailEnviadoA: r.email_enviado_a,
        emailEnviadoAt: r.email_enviado_at,
      }));
      setReports(mappedReports);
    } catch (error) {
      console.error('Error cargando reportes desde Supabase:', error);
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

  useEffect(() => {
    if (storageMode === 'local' && reports.length > 0) {
      saveLocalReports(reports);
    }
  }, [reports, storageMode]);

  const addReport = async (report: Omit<Report, 'id' | 'createdAt' | 'visibleForClient'>) => {
    if (storageMode === 'supabase') {
      try {
        if (!report.createdBy || report.createdBy === 'system' || !report.createdBy.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          throw new Error(`createdBy debe ser un UUID válido de Supabase.`);
        }

        const newReportId = uuidv4();
        let finalEvidenceUrls: string[] = [];

        if (report.evidencias && report.evidencias.length > 0) {
          // 1. Comprimir las fotos tomadas por el teléfono
          const fotosComprimidas = await Promise.all(
            report.evidencias.map((img) => comprimirImagenBase64(img))
          );

          try {
            // 2. Intentar subir al bucket Storage de Supabase
            const uploaded = await storageService.uploadImagesFromBase64(fotosComprimidas, newReportId);
            // Si el storage devolvió URLs válidas usarlas; si falló o devolvió vacío, usar respaldo directo
            if (uploaded && uploaded.length > 0) {
              finalEvidenceUrls = uploaded;
            } else {
              finalEvidenceUrls = fotosComprimidas;
            }
          } catch (uploadError) {
            console.warn('Fallo subida a Storage, guardando evidencia comprimida directamente:', uploadError);
            finalEvidenceUrls = fotosComprimidas;
          }
        }

        await reportService.createReport({
          fechaHora: report.fechaHora,
          proyecto: report.proyecto,
          tituloNovedad: report.tituloNovedad,
          desarrollo: report.desarrollo,
          evidencias: finalEvidenceUrls,
          ubicacionGPS: report.ubicacionGPS,
          quienReporta: report.quienReporta,
          createdBy: report.createdBy,
        });

        await refreshReports();
      } catch (error) {
        console.error('Error creating report:', error);
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
      setReports(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
    }
  };

  const approveForClient = async (id: string, userId: string) => {
    if (storageMode === 'supabase') {
      try {
        const report = reports.find(r => r.id === id);
        if (!report) return;

        let clientEmail: string | undefined;
        try {
          const { data: clientUsers } = await supabase
            .from('users')
            .select('email, nombre_completo, proyectos')
            .eq('role', 'cliente')
            .eq('status', 'aprobado');
          
          if (clientUsers && clientUsers.length > 0) {
            const clientUser = clientUsers.find(
              (u: any) => u.proyectos?.includes(report.proyecto) || u.proyectos?.includes('*')
            );
            if (clientUser) clientEmail = clientUser.email;
          }
        } catch (error) {
          console.error('Error en búsqueda de cliente:', error);
        }

        let pdfUrl: string | undefined;
        try {
          const pdfData = await generateReportPDF(report);
          pdfUrl = await storageService.uploadPDF(pdfData, report.id, report.proyecto);
        } catch (error) {
          console.error('Error generando/subiendo PDF:', error);
        }

        await reportService.approveReport(id, userId, clientEmail, pdfUrl);
        await refreshReports();

        try {
          await notificationService.notifyReportApproved(report.tituloNovedad, report.proyecto);
        } catch (notificationError) {
          console.error('Error enviando notificación:', notificationError);
        }
      } catch (error) {
        console.error('Error approving report:', error);
      }
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
    }
  };

  const getReportById = (id: string) => reports.find(r => r.id === id);

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
  if (!context) throw new Error('useReports must be used within a ReportProvider');
  return context;
}
