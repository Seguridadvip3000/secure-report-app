export type UserRole = 'lider' | 'cliente' | 'operaciones' | 'directiva';
export type UserStatus = 'pendiente' | 'aprobado' | 'rechazado';
export type ReportStatus = 'pendiente' | 'en_proceso' | 'resuelto' | 'aprobado' | 'rechazado';
export type ReportPriority = 'baja' | 'media' | 'alta' | 'critica';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  company?: string;
  position?: string;
  proyectos?: string[]; // Proyectos asignados al usuario (para clientes)
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
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
  cliente: 'Cliente',
  operaciones: 'Operaciones',
  directiva: 'Directiva',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  lider: 'bg-blue-100 text-blue-800 border-blue-200',
  cliente: 'bg-green-100 text-green-800 border-green-200',
  operaciones: 'bg-purple-100 text-purple-800 border-purple-200',
  directiva: 'bg-red-100 text-red-800 border-red-200',
};
