import { useState, useMemo } from 'react';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Search,
  Eye,
  FileText,
  CheckCircle,
  Shield,
  Calendar,
  MapPin,
  User,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getCategoryColor,
  getCategoryLabel,
  getPriorityColor,
  getPriorityLabel,
  getReportIcon,
} from '../utils/helpers';

export default function ClienteDashboard() {
  const { reports } = useReports();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');

  // Client only sees approved reports
  const approvedReports = useMemo(() => {
    return reports
      .filter(r => r.visibleForClient && r.status === 'aprobado')
      .filter(r => {
        if (search === '') return true;
        return (
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase()) ||
          r.location.toLowerCase().includes(search.toLowerCase())
        );
      })
      .sort((a, b) => new Date(b.approvedAtOperaciones || b.createdAt).getTime() - new Date(a.approvedAtOperaciones || a.createdAt).getTime());
  }, [reports, search]);

  const totalApproved = reports.filter(r => r.visibleForClient).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={24} />
          <h1 className="text-xl font-bold">Panel del Cliente</h1>
        </div>
        <p className="text-green-100">
          Reportes verificados y aprobados por el equipo de operaciones.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalApproved}</p>
              <p className="text-xs text-slate-500">Reportes Verificados</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {approvedReports.filter(r => {
                  const d = new Date(r.approvedAtOperaciones || r.createdAt);
                  const today = new Date();
                  return d.toDateString() === today.toDateString();
                }).length}
              </p>
              <p className="text-xs text-slate-500">Reportes de Hoy</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 w-10 h-10 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{approvedReports.length}</p>
              <p className="text-xs text-slate-500">Disponibles para usted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-blue-800 text-sm">Información verificada</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Todos los reportes mostrados han sido revisados y aprobados por el equipo de Operaciones de seguridad.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar en reportes aprobados..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        />
      </div>

      {/* Reports */}
      <div className="space-y-3">
        {approvedReports.map(report => (
          <Link
            key={report.id}
            to={`/reportes/${report.id}`}
            className="block bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getReportIcon(report)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800">{report.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getCategoryColor(report.category)}`}>
                    {getCategoryLabel(report.category)}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{report.description}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {report.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {report.guardName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {format(parseISO(report.date), "dd MMM yyyy, HH:mm", { locale: es })}
                  </span>
                </div>
                {report.approvedAtOperaciones && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle size={12} />
                    Verificado el {format(parseISO(report.approvedAtOperaciones), "dd MMM yyyy, HH:mm", { locale: es })}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}

        {approvedReports.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-medium text-slate-600">No hay reportes aprobados</h3>
            <p className="text-slate-400 mt-1 text-sm">
              Los reportes aparecerán aquí una vez sean verificados por el equipo de operaciones.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
