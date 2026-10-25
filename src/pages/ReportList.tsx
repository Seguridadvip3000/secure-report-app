import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import { ReportStatus, ReportPriority, ReportCategory } from '../types';
import {
  Search,
  Filter,
  MapPin,
  User,
  Calendar,
  CheckCircle,
  XCircle,
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
} from '../utils/helpers';

export default function ReportList() {
  const { reports, approveForClient, rejectReport } = useReports();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'todos'>('todos');
  const [priorityFilter, setPriorityFilter] = useState<ReportPriority | 'todos'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'todos'>('todos');
  const [showFilters, setShowFilters] = useState(false);

  // Filter reports based on role
  const visibleReports = useMemo(() => {
    if (!currentUser) return [];

    let filtered = [...reports];

    // Client only sees approved reports
    if (currentUser.role === 'cliente') {
      filtered = filtered.filter(r => r.visibleForClient);
    }

    // Lider only sees their own reports
    if (currentUser.role === 'lider') {
      filtered = filtered.filter(r => r.createdBy === currentUser.id);
    }

    return filtered;
  }, [reports, currentUser]);

  const filteredReports = useMemo(() => {
    return visibleReports.filter(r => {
      const matchesSearch =
        search === '' ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.location.toLowerCase().includes(search.toLowerCase()) ||
        r.guardName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'todos' || r.status === statusFilter;
      const matchesPriority = priorityFilter === 'todos' || r.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'todos' || r.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [visibleReports, search, statusFilter, priorityFilter, categoryFilter]);

  const sortedReports = [...filteredReports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const activeFilters = [statusFilter, priorityFilter, categoryFilter].filter(f => f !== 'todos').length;
  const canApprove = currentUser?.role === 'operaciones' || currentUser?.role === 'directiva';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {currentUser?.role === 'cliente' ? 'Reportes Verificados' :
           currentUser?.role === 'lider' ? 'Mis Reportes' :
           'Todos los Reportes'}
        </h1>
        <p className="text-slate-500">
          {filteredReports.length} de {visibleReports.length} reportes
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar reportes..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors font-medium ${
              showFilters || activeFilters > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilters > 0 && (
              <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Estado</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Prioridad</label>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="todos">Todas</option>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Categoría</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="todos">Todas</option>
                <option value="incidente">Incidente</option>
                <option value="novedad_rutinaria">Novedad Rutinaria</option>
                <option value="alerta">Alerta</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="acceso_no_autorizado">Acceso No Autorizado</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Report Cards */}
      <div className="space-y-3">
        {sortedReports.map(report => (
          <div
            key={report.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-4 sm:p-5"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="text-2xl sm:text-3xl flex-shrink-0">{getReportIcon(report)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <Link to={`/reportes/${report.id}`} className="font-semibold text-slate-800 text-lg hover:text-blue-600 transition-colors">
                    {report.title}
                  </Link>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
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
                <p className="text-slate-500 text-sm mt-1 line-clamp-2">{report.description}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {report.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <User size={14} />
                    {report.guardName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {format(parseISO(report.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                  </span>
                </div>

                {/* Quick approve/reject for operaciones */}
                {canApprove && (report.status === 'pendiente' || report.status === 'en_proceso') && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => approveForClient(report.id, currentUser!.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs rounded-lg hover:bg-green-200 font-medium transition-colors"
                    >
                      <CheckCircle size={14} />
                      Aprobar
                    </button>
                    <button
                      onClick={() => rejectReport(report.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 font-medium transition-colors"
                    >
                      <XCircle size={14} />
                      Rechazar
                    </button>
                  </div>
                )}

                {/* Approved badge for client */}
                {currentUser?.role === 'cliente' && report.approvedAtOperaciones && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle size={12} />
                    Verificado el {format(parseISO(report.approvedAtOperaciones), "dd MMM yyyy", { locale: es })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {sortedReports.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-medium text-slate-600">No se encontraron reportes</h3>
            <p className="text-slate-400 mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>
    </div>
  );
}
