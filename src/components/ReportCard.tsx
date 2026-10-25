import { Link } from 'react-router-dom';
import { Report } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStatusColor, getStatusLabel, getReportIcon } from '../utils/helpers';
import { MapPin, Calendar, User } from 'lucide-react';

interface ReportCardProps {
  report: Report;
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function ReportCard({ report, showActions, onApprove, onReject }: ReportCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-4 sm:p-5">
      <div className="flex items-start gap-3">
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
          <div className="mt-1">
            <span className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">
              {report.proyecto}
            </span>
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

          {showActions && (report.status === 'pendiente' || report.status === 'en_proceso') && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={onApprove}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs rounded-lg hover:bg-green-200 font-medium transition-colors"
              >
                ✓ Aprobar
              </button>
              <button
                onClick={onReject}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 font-medium transition-colors"
              >
                ✗ Rechazar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
