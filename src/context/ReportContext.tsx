import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Report, ReportStatus } from '../types';
import { initialReports } from '../data/initialData';
import { v4 as uuidv4 } from 'uuid';
import { getStorageMode } from '../config/appConfig';
import { reportService } from '../services/reportService';

interface ReportContextType {
  reports: Report[];
  addReport: (report: Omit<Report, 'id' | 'createdAt' | 'visibleForClient'>) => Promise<void>;
  updateReportStatus: (id: string, status: ReportStatus) => Promise<void>;
  approveForClient: (id: string, userId: string) => Promise<void>;
  rejectReport: (id: string) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  getReportById: (id: string) => Report | undefined;
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
      const supabaseReports = await reportService.getAllReports();
      // Map database fields to frontend fields
      const mappedReports = supabaseReports.map((r: any) => ({
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
      }));
      setReports(mappedReports);
    } catch (error) {
      console.error('Error loading reports from Supabase:', error);
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
    if (storageMode === 'supabase') {
      try {
        await reportService.createReport({
          fechaHora: report.fechaHora,
          proyecto: report.proyecto,
          tituloNovedad: report.tituloNovedad,
          desarrollo: report.desarrollo,
          evidencias: report.evidencias,
          ubicacionGPS: report.ubicacionGPS,
          quienReporta: report.quienReporta,
          createdBy: report.createdBy,
        });
        await refreshReports();
      } catch (error) {
        console.error('Error creating report:', error);
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
        // Find client user for this project
        const report = reports.find(r => r.id === id);
        if (!report) return;

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

        await reportService.approveReport(id, userId, clientEmail);
        await refreshReports();

        if (clientEmail) {
          console.log(`📧 Email enviado a ${clientEmail}: Nuevo reporte aprobado para ${report.proyecto}`);
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
