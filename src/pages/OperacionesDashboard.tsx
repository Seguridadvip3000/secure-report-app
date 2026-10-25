import { useState, useMemo } from 'react';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ReportStatus } from '../types';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  getCategoryLabel,
  getCategoryColor,
  getReportIcon,
} from '../utils/helpers';

export default function OperacionesDashboard() {
  const { reports, approveForClient, rejectReport } = useReports();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'todos'>('todos');
  const [showFilters, setShowFilters] = useState(false);

  const filteredReports = useMemo(() => {
    return reports
      .filter(r => {
        const matchesSearch =
          search === '' ||
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.location.toLowerCase().includes(search.toLowerCase()) ||
          r.guardName.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'todos' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reports, search, statusFilter]);

  const pendingApproval = reports.filter(r => r.status === 'pendiente' || r.status === 'en_proceso');
  const approved = reports.filter(r => r.status === 'aprobado');
  const rejected = reports.filter(r => r.status === 'rechazado');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={24} />
          <h1 className="text-xl font-bold">Panel de Operaciones</h1>
        </div>
        <p className="text-purple-100">
          Acceso en tiempo real a todos los reportes. Apruebe reportes para clientes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-yellow-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{pendingApproval.length}</p>
          <p className="text-xs text-slate-500">Pendientes de Aprobación</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{approved.length}</p>
          <p className="text-xs text-slate-500">Aprobados para Cliente</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-red-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <XCircle size={20} className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{rejected.length}</p>
          <p className="text-xs text-slate-500">Rechazados</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <FileText size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{reports.length}</p>
          <p className="text-xs text-slate-500">Total Reportes</p>
        </div>
      </div>

      {/* Pending Approval Section */}
      {pendingApproval.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h2 className="font-semibold text-amber-800">Requieren su aprobación ({pendingApproval.length})</h2>
          </div>
          <div className="space-y-3">
            {pendingApproval.slice(0, 3).map(report => (
              <div key={report.id} className="bg-white rounded-lg border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getReportIcon(report)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-slate-800">{report.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{report.location} • {report.guardName}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(report.priority)}`}>
                        {getPriorityLabel(report.priority)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{report.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => approveForClient(report.id, currentUser!.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <CheckCircle size={14} />
                        Aprobar para Cliente
                      </button>
                      <button
                        onClick={() => rejectReport(report.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 transition-colors font-medium"
                      >
                        <XCircle size={14} />
                        Rechazar
                      </button>
                      <Link
                        to={`/reportes/${report.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200 transition-colors font-medium"
                      >
                        <Eye size={14} />
                        Ver Detalle
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Reports */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Todos los Reportes (Tiempo Real)</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm transition-colors ${
                showFilters ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={14} />
              Filtros
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar reportes..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {filteredReports.map(report => (
            <div key={report.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-xl">{getReportIcon(report)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/reportes/${report.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                        {report.title}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {report.location} • {report.guardName} • {format(parseISO(report.createdAt), "dd MMM HH:mm", { locale: es })}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(report.status)}`}>
                        {getStatusLabel(report.status)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(report.priority)}`}>
                        {getPriorityLabel(report.priority)}
                      </span>
                    </div>
                  </div>
                  {(report.status === 'pendiente' || report.status === 'en_proceso') && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => approveForClient(report.id, currentUser!.id)}
                        className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 font-medium"
                      >
                        ✓ Aprobar
                      </button>
                      <button
                        onClick={() => rejectReport(report.id)}
                        className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium"
                      >
                        ✗ Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredReports.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">No hay reportes</div>
          )}
        </div>
      </div>
    </div>
  );
}
