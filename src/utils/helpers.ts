import { Report, ReportCategory, ReportPriority, ReportStatus } from '../types';

export function getCategoryLabel(category: ReportCategory): string {
  const labels: Record<ReportCategory, string> = {
    incidente: 'Incidente',
    novedad_rutinaria: 'Novedad Rutinaria',
    alerta: 'Alerta',
    mantenimiento: 'Mantenimiento',
    acceso_no_autorizado: 'Acceso No Autorizado',
  };
  return labels[category];
}

export function getCategoryColor(category: ReportCategory): string {
  const colors: Record<ReportCategory, string> = {
    incidente: 'bg-red-100 text-red-800 border-red-200',
    novedad_rutinaria: 'bg-blue-100 text-blue-800 border-blue-200',
    alerta: 'bg-amber-100 text-amber-800 border-amber-200',
    mantenimiento: 'bg-purple-100 text-purple-800 border-purple-200',
    acceso_no_autorizado: 'bg-rose-100 text-rose-800 border-rose-200',
  };
  return colors[category];
}

export function getStatusLabel(status: ReportStatus): string {
  const labels: Record<ReportStatus, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En Proceso',
    resuelto: 'Resuelto',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
  };
  return labels[status];
}

export function getStatusColor(status: ReportStatus): string {
  const colors: Record<ReportStatus, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    en_proceso: 'bg-blue-100 text-blue-800',
    resuelto: 'bg-green-100 text-green-800',
    aprobado: 'bg-emerald-100 text-emerald-800',
    rechazado: 'bg-red-100 text-red-800',
  };
  return colors[status];
}

export function getPriorityLabel(priority: ReportPriority): string {
  const labels: Record<ReportPriority, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    critica: 'Crítica',
  };
  return labels[priority];
}

export function getPriorityColor(priority: ReportPriority): string {
  const colors: Record<ReportPriority, string> = {
    baja: 'bg-slate-100 text-slate-700',
    media: 'bg-blue-100 text-blue-700',
    alta: 'bg-orange-100 text-orange-700',
    critica: 'bg-red-100 text-red-700',
  };
  return colors[priority];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getReportIcon(report: Report): string {
  const icons: Record<ReportCategory, string> = {
    incidente: '🚨',
    novedad_rutinaria: '📋',
    alerta: '⚠️',
    mantenimiento: '🔧',
    acceso_no_autorizado: '🚫',
  };
  return icons[report.category];
}
