import { Link } from 'react-router-dom';
import { Report } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStatusColor, getStatusLabel, getReportIcon } from '../utils/helpers';
import { Calendar, User, CheckCircle, Mail } from 'lucide-react';

interface ReportCardProps {
  report: Report;
  showCheckbox?: boolean;
  onToggleApproval?: () => void;
  onReject?: () => void;
}

export default function ReportCard({ report, showCheckbox, onToggleApproval, onReject }: ReportCardProps) {
  const isApproved = report.visibleForClient;

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 sm:p-5 ${
      isApproved ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Checkbox for Operaciones/Directiva */}
        {showCheckbox && (
          <div className="flex-shrink-0 pt-1">
            <label className="relative flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isApproved}
                onChange={onToggleApproval}
                className="w-6 h-6 rounded border-2 border-slate-300 text-green-600 focus:ring-green-500 focus:ring-2 cursor-pointer"
              />
              {isApproved && (
                <CheckCircle size={14} className="absolute left-1 top-1 text-green-600 pointer-events-none" />
              )}
            </label>
          </div>
        )}

        <span className="text-2xl sm:text-3xl flex-shrink-0">{getReportIcon(report.tituloNovedad)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <Link to={`/reportes/${report.id}`} className="font-semibold text-slate-800 text-lg hover:text-blue-600 transition-colors">
              {report.tituloNovedad}
            </Link>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(report.status)}`}>
              {getStatusLabel(report.status)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">
              {report.proyecto}
            </span>
            {isApproved && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-medium">
                <CheckCircle size={10} />
                Visible para Cliente
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-2 line-clamp-2">{report.desarrollo}</p>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <User size={14} />
              {report.quienReporta}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {format(parseISO(report.fechaHora), "dd MMM yyyy, HH:mm", { locale: es })}
            </span>
          </div>

          {/* Email notification info */}
          {report.emailEnviadoA && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <Mail size={12} />
              Email enviado a: {report.emailEnviadoA}
            </div>
          )}

          {/* Reject button for pending reports */}
          {showCheckbox && !isApproved && (report.status === 'pendiente' || report.status === 'en_proceso') && onReject && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={onReject}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 font-medium transition-colors"
              >
                ✗ Rechazar Reporte
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
