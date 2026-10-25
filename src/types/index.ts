export type UserRole = 'lider' | 'cliente' | 'operaciones' | 'administrador';
export type UserStatus = 'pendiente' | 'aprobado' | 'rechazado';
export type ReportStatus = 'pendiente' | 'en_proceso' | 'resuelto' | 'aprobado' | 'rechazado';
export type ReportPriority = 'baja' | 'media' | 'alta' | 'critica';
export type ReportCategory = 'incidente' | 'novedad_rutinaria' | 'alerta' | 'mantenimiento' | 'acceso_no_autorizado';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  company?: string;
  position?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  priority: ReportPriority;
  location: string;
  guardName: string;
  createdBy: string; // userId del líder que lo creó
  date: string;
  createdAt: string;
  notes?: string;
  approvedByOperaciones?: string;
  approvedAtOperaciones?: string;
  visibleForClient: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  lider: 'Líder de Seguridad',
  cliente: 'Cliente',
  operaciones: 'Operaciones',
  administrador: 'Administrador',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  lider: 'bg-blue-100 text-blue-800 border-blue-200',
  cliente: 'bg-green-100 text-green-800 border-green-200',
  operaciones: 'bg-purple-100 text-purple-800 border-purple-200',
  administrador: 'bg-red-100 text-red-800 border-red-200',
};
