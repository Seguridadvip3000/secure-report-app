import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { ReportStatus } from '../types';
import {
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  Edit3,
  Trash2,
  MessageSquare,
  Send,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  getCategoryColor,
  getCategoryLabel,
  getReportIcon,
  formatDate,
} from '../utils/helpers';

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReportById, updateReportStatus, addNote, deleteReport } = useReports();
  const [note, setNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const report = getReportById(id || '');

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-5xl">🔍</div>
          <h2 className="text-xl font-bold text-slate-800">Reporte no encontrado</h2>
          <p className="text-slate-500">El reporte que buscas no existe o fue eliminado.</p>
          <Link
            to="/reportes"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver a Reportes
          </Link>
        </div>
      </div>
    );
  }

  const handleAddNote = () => {
    if (note.trim()) {
      addNote(report.id, note.trim());
      setNote('');
    }
  };

  const handleStatusChange = (status: ReportStatus) => {
    updateReportStatus(report.id, status);
  };

  const handleDelete = () => {
    deleteReport(report.id);
    navigate('/reportes');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Detalle del Reporte</h1>
            <p className="text-slate-500 text-sm">ID: {report.id.slice(0, 8)}...</p>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar reporte"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-600" />
            <p className="text-red-800 font-medium">¿Estás seguro de eliminar este reporte?</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Description Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{getReportIcon(report)}</span>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{report.title}</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getCategoryColor(report.category)}`}>
                    {getCategoryLabel(report.category)}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(report.status)}`}>
                    {getStatusLabel(report.status)}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPriorityColor(report.priority)}`}>
                    {getPriorityLabel(report.priority)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
                <FileText size={16} />
                Descripción
              </h3>
              <p className="text-slate-700 leading-relaxed">{report.description}</p>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare size={20} />
              Notas y Observaciones
            </h3>

            {report.notes && (
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <p className="text-slate-700 whitespace-pre-line text-sm">{report.notes}</p>
              </div>
            )}

            {!report.notes && (
              <p className="text-slate-400 text-sm mb-4">No hay notas registradas</p>
            )}

            {/* Add Note */}
            <div className="flex gap-2">
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                placeholder="Agregar una nota..."
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
              <button
                onClick={handleAddNote}
                disabled={!note.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Info & Actions */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">Información</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Ubicación</p>
                  <p className="text-sm font-medium text-slate-700">{report.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Guardia</p>
                  <p className="text-sm font-medium text-slate-700">{report.guardName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Fecha del suceso</p>
                  <p className="text-sm font-medium text-slate-700">
                    {format(parseISO(report.date), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Registrado</p>
                  <p className="text-sm font-medium text-slate-700">
                    {format(parseISO(report.createdAt), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Change */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">Cambiar Estado</h3>
            <div className="space-y-2">
              {(['pendiente', 'en_proceso', 'resuelto'] as ReportStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={report.status === status}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    report.status === status
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{getStatusLabel(status)}</span>
                    {report.status === status && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        Actual
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
