import { useState, useMemo } from 'react';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import { ReportStatus } from '../types';
import { Search, Filter } from 'lucide-react';
import ReportCard from '../components/ReportCard';

export default function ReportList() {
  const { reports, approveForClient, rejectReport } = useReports();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'todos'>('todos');
  const [showFilters, setShowFilters] = useState(false);

  // Filter reports based on role
  const visibleReports = useMemo(() => {
    if (!currentUser) return [];
    let filtered = [...reports];
    if (currentUser.role === 'cliente') {
      filtered = filtered.filter(r => r.visibleForClient);
    }
    if (currentUser.role === 'lider') {
      filtered = filtered.filter(r => r.createdBy === currentUser.id);
    }
    return filtered;
  }, [reports, currentUser]);

  const filteredReports = useMemo(() => {
    return visibleReports.filter(r => {
      const matchesSearch =
        search === '' ||
        r.tituloNovedad.toLowerCase().includes(search.toLowerCase()) ||
        r.desarrollo.toLowerCase().includes(search.toLowerCase()) ||
        r.proyecto.toLowerCase().includes(search.toLowerCase()) ||
        r.quienReporta.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'todos' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [visibleReports, search, statusFilter]);

  const sortedReports = [...filteredReports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const activeFilters = statusFilter !== 'todos' ? 1 : 0;
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
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
          </button>
        </div>

        {showFilters && (
          <div className="pt-3 border-t border-slate-100">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
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

      {/* Report Cards */}
      <div className="space-y-3">
        {sortedReports.map(report => (
          <ReportCard
            key={report.id}
            report={report}
            showActions={canApprove && (report.status === 'pendiente' || report.status === 'en_proceso')}
            onApprove={() => approveForClient(report.id, currentUser!.id)}
            onReject={() => rejectReport(report.id)}
          />
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
