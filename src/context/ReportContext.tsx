import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Report, ReportStatus } from '../types';
import { initialReports } from '../data/initialData';
import { v4 as uuidv4 } from 'uuid';

interface ReportContextType {
  reports: Report[];
  addReport: (report: Omit<Report, 'id' | 'createdAt' | 'visibleForClient'>) => void;
  updateReportStatus: (id: string, status: ReportStatus) => void;
  approveForClient: (id: string, userId: string) => void;
  rejectReport: (id: string) => void;
  addNote: (id: string, note: string) => void;
  deleteReport: (id: string) => void;
  getReportById: (id: string) => Report | undefined;
}

const STORAGE_KEY = 'securereport_reports';

function loadReports(): Report[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return initialReports;
}

function saveReports(reports: Report[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(loadReports);

  useEffect(() => {
    saveReports(reports);
  }, [reports]);

  const addReport = (report: Omit<Report, 'id' | 'createdAt' | 'visibleForClient'>) => {
    const newReport: Report = {
      ...report,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      visibleForClient: false,
    };
    setReports(prev => [newReport, ...prev]);
  };

  const updateReportStatus = (id: string, status: ReportStatus) => {
    setReports(prev =>
      prev.map(r => (r.id === id ? { ...r, status } : r))
    );
  };

  const approveForClient = (id: string, userId: string) => {
    setReports(prev => {
      const report = prev.find(r => r.id === id);
      if (!report) return prev;

      // Find client user for this project (simulated email)
      // In production, this would send an actual email via backend
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

      // Simulate email notification (console log for demo)
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
  };

  const rejectReport = (id: string) => {
    setReports(prev =>
      prev.map(r =>
        r.id === id ? { ...r, status: 'rechazado' as ReportStatus, visibleForClient: false } : r
      )
    );
  };

  const addNote = (id: string, note: string) => {
    setReports(prev =>
      prev.map(r =>
        r.id === id ? { ...r, notes: r.notes ? `${r.notes}\n${note}` : note } : r
      )
    );
  };

  const deleteReport = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
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
