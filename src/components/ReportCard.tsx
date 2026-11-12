import { Link } from 'react-router-dom';
import { Report } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStatusColor, getStatusLabel, getReportIcon } from '../utils/helpers';
import { Calendar, User, CheckCircle, Mail, Eye } from 'lucide-react';

interface ReportCardProps {
  report: Report;
  showCheckbox?: boolean;
  onToggleApproval?: () => void;
  onReject?: () => void;
}

export default function ReportCard({ report, showCheckbox, onToggleApproval, onReject }: ReportCardProps) {
  const isApproved = report.visibleForClient;

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 sm:p-5 w-full ${
      isApproved ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        
        {/* Cabecera en móvil: Checkbox + Ícono + Estado */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-3">
            {showCheckbox && (
              <div className="flex-shrink-0">
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
          </div>

          <span className={`sm:hidden text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(report.status)}`}>
            {getStatusLabel(report.status)}
          </span>
        </div>

        {/* Cuerpo del Reporte */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <Link 
              to={`/lista-reportes/${report.id}`} 
              className="font-bold text-slate-800 text-base sm:text-lg hover:text-blue-600 transition-colors break-words"
            >
              {report.tituloNovedad}
            </Link>
            <span className={`hidden sm:inline-block text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${getStatusColor(report.status)}`}>
              {getStatusLabel(report.status)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-block bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded font-medium">
              {report.proyecto}
            </span>
            {isApproved && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded font-medium">
                <CheckCircle size={12} />
                Visible para Cliente
              </span>
            )}
          </div>

          <p className="text-slate-600 text-sm mt-2.5 line-clamp-3 break-words">{report.desarrollo}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs sm:text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <User size={14} className="text-slate-400" />
              {report.quienReporta}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              {format(parseISO(report.fechaHora), "dd MMM yyyy, HH:mm", { locale: es })}
            </span>
          </div>

          {report.emailEnviadoA && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
              <Mail size={12} />
              Email enviado a: {report.emailEnviadoA}
            </div>
          )}

          {/* Barra de Acciones en Móvil y Escritorio */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <Link
              to={`/lista-reportes/${report.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Eye size={14} /> Leer reporte completo
            </Link>

            {showCheckbox && !isApproved && (report.status === 'pendiente' || report.status === 'en_proceso') && onReject && (
              <button
                onClick={onReject}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 font-medium transition-colors"
              >
                ✗ Rechazar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
