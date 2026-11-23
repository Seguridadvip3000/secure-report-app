export type UserRole =
  | 'lider'
  | 'supervisor'
  | 'cecom'
  | 'cliente'
  | 'operaciones'
  | 'directiva'
  | 'analista'
  | 'reclutamiento'
  | 'rrhh'
  | 'administrador';

export type UserStatus = 'pendiente' | 'aprobado' | 'rechazado';
export type ReportStatus = 'pendiente' | 'en_proceso' | 'resuelto' | 'aprobado' | 'rechazado';
export type ReportPriority = 'baja' | 'media' | 'alta' | 'critica';
export type AttendanceStatus = 'entrada' | 'salida';

export interface User {
  id: string;
  username: string;
  nombre_completo: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  proyectos?: string[]; // Proyectos asignados (array vacío para acceso global)
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface AttendanceReport {
  id: string;
  userId: string;
  userName: string;
  userRole: 'lider' | 'operaciones';
  proyecto: string;
  status: AttendanceStatus;
  ubicacionGPS: { lat: number; lng: number; address?: string };
  fechaHora: string;
  createdAt: string;
}

export interface Report {
  id: string;
  fechaHora: string; // ISO string automático
  proyecto: string; // Proyecto seleccionado
  tituloNovedad: string; // Título de la novedad seleccionado
  desarrollo: string; // Texto libre del usuario
  evidencias: string[]; // Array de base64 de imágenes (mínimo 2)
  ubicacionGPS: { lat: number; lng: number; address?: string };
  quienReporta: string; // Nombre del usuario que crea el reporte
  createdBy: string; // userId del líder que lo creó
  status: ReportStatus;
  createdAt: string;
  notes?: string;
  approvedByOperaciones?: string;
  approvedAtOperaciones?: string;
  visibleForClient: boolean;
  pdfUrl?: string; // URL/blob del PDF generado
  emailEnviadoA?: string; // Email del cliente al que se notificó
  emailEnviadoAt?: string; // Fecha de envío del email
}

export const ROLE_LABELS: Record<UserRole, string> = {
  lider: 'Líder de Seguridad',
  supervisor: 'Supervisor Nocturno',
  cecom: 'CECOM (Centro de Control)',
  cliente: 'Cliente',
  operaciones: 'Operaciones',
  directiva: 'Directiva',
  analista: 'Analista',
  reclutamiento: 'Reclutamiento y Selección',
  rrhh: 'Gerente de Recursos Humanos (RRHH)',
  administrador: 'Administrador',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  lider: 'bg-blue-100 text-blue-800 border-blue-200',
  supervisor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  cecom: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  cliente: 'bg-green-100 text-green-800 border-green-200',
  operaciones: 'bg-purple-100 text-purple-800 border-purple-200',
  directiva: 'bg-red-100 text-red-700 border-red-200',
  analista: 'bg-teal-100 text-teal-800 border-teal-200',
  reclutamiento: 'bg-violet-100 text-violet-800 border-violet-200',
  rrhh: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  administrador: 'bg-orange-100 text-orange-800 border-orange-200',
};
