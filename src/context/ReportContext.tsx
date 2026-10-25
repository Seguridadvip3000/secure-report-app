import { createContext, useContext, useState, ReactNode } from 'react';
import { Report, ReportStatus } from '../types';
import { initialReports } from '../data/initialReports';
import { v4 as uuidv4 } from 'uuid';

interface ReportContextType {
  reports: Report[];
  addReport: (report: Omit<Report, 'id' | 'createdAt'>) => void;
  updateReportStatus: (id: string, status: ReportStatus) => void;
  addNote: (id: string, note: string) => void;
  deleteReport: (id: string) => void;
  getReportById: (id: string) => Report | undefined;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(initialReports);

  const addReport = (report: Omit<Report, 'id' | 'createdAt'>) => {
    const newReport: Report = {
      ...report,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setReports(prev => [newReport, ...prev]);
  };

  const updateReportStatus = (id: string, status: ReportStatus) => {
    setReports(prev =>
      prev.map(r => (r.id === id ? { ...r, status } : r))
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
      value={{ reports, addReport, updateReportStatus, addNote, deleteReport, getReportById }}
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
