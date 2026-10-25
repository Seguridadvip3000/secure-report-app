import { Report, ReportStatus } from '../types';

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

export function getReportIcon(tituloNovedad: string): string {
  const icons: Record<string, string> = {
    "Hurto": "🚨",
    "Robo": "🚨",
    "Sospechoso": "⚠️",
    "Procedimiento Policial": "👮",
    "Procedimiento de otras autoridades": "👮",
    "Daño a las instalaciones": "🔧",
    "Daños a terceros": "💥",
    "Presencia de pedigüeños / Venta ambulante": "🚫",
    "Colisión / Choque vehicular": "🚗",
    "Atropello": "🚑",
    "Emergencia médica de empleados": "🏥",
    "Emergencia médica de terceros (visitantes/clientes)": "🏥",
    "Falla del sistema de seguridad (CCTV/Alarmas)": "📹",
    "Fuga de fluidos (Agua/Gas)": "💧",
    "Fallo de energía": "⚡",
    "Conato de incendio": "🔥",
    "OTRA:": "📋",
  };
  return icons[tituloNovedad] || "📋";
}
