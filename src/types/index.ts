export type ReportStatus = 'pendiente' | 'en_proceso' | 'resuelto';
export type ReportPriority = 'baja' | 'media' | 'alta' | 'critica';
export type ReportCategory = 'incidente' | 'novedad_rutinaria' | 'alerta' | 'mantenimiento' | 'acceso_no_autorizado';

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  priority: ReportPriority;
  location: string;
  guardName: string;
  date: string;
  createdAt: string;
  notes?: string;
}
