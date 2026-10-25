import { useState, useMemo } from 'react';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import { ReportStatus } from '../types';
import { Search, Filter, Clock, CheckCircle, XCircle, FileText, ShieldCheck, AlertTriangle } from 'lucide-react';
import ReportCard from '../components/ReportCard';

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
          r.tituloNovedad.toLowerCase().includes(search.toLowerCase()) ||
          r.proyecto.toLowerCase().includes(search.toLowerCase()) ||
          r.quienReporta.toLowerCase().includes(search.toLowerCase());
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
          <p className="text-xs text-slate-500">Pendientes</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{approved.length}</p>
          <p className="text-xs text-slate-500">Aprobados</p>
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
          <p className="text-xs text-slate-500">Total</p>
        </div>
      </div>

      {/* Pending Approval */}
      {pendingApproval.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h2 className="font-semibold text-amber-800">Requieren aprobación ({pendingApproval.length})</h2>
          </div>
          <div className="space-y-3">
            {pendingApproval.slice(0, 3).map(report => (
              <ReportCard
                key={report.id}
                report={report}
                showCheckbox
                onToggleApproval={() => approveForClient(report.id, currentUser!.id)}
                onReject={() => rejectReport(report.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Reports */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Todos los Reportes</h2>
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
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar reportes..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
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
        <div className="p-4 space-y-3">
          {filteredReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              showCheckbox={report.status === 'pendiente' || report.status === 'en_proceso'}
              onToggleApproval={() => approveForClient(report.id, currentUser!.id)}
              onReject={() => rejectReport(report.id)}
            />
          ))}
          {filteredReports.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">No hay reportes</div>
          )}
        </div>
      </div>
    </div>
  );
}
