import { useReports } from '../context/ReportContext';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStatusColor, getPriorityColor, getCategoryLabel, formatDate, getReportIcon } from '../utils/helpers';
import { Link } from 'react-router-dom';
import { ReportStatus, ReportPriority } from '../types';

export default function Dashboard() {
  const { reports } = useReports();

  const stats = {
    total: reports.length,
    pendientes: reports.filter(r => r.status === 'pendiente').length,
    enProceso: reports.filter(r => r.status === 'en_proceso').length,
    resueltos: reports.filter(r => r.status === 'resuelto').length,
    criticos: reports.filter(r => r.priority === 'critica').length,
  };

  const recentReports = [...reports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const priorityDistribution = {
    critica: reports.filter(r => r.priority === 'critica').length,
    alta: reports.filter(r => r.priority === 'alta').length,
    media: reports.filter(r => r.priority === 'media').length,
    baja: reports.filter(r => r.priority === 'baja').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500">Resumen de novedades de seguridad</p>
        </div>
        <Link
          to="/nuevo"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <FileText size={18} />
          Nuevo Reporte
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reportes"
          value={stats.total}
          icon={<FileText size={24} />}
          color="bg-blue-500"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Pendientes"
          value={stats.pendientes}
          icon={<Clock size={24} />}
          color="bg-yellow-500"
          bgColor="bg-yellow-50"
        />
        <StatCard
          title="En Proceso"
          value={stats.enProceso}
          icon={<TrendingUp size={24} />}
          color="bg-indigo-500"
          bgColor="bg-indigo-50"
        />
        <StatCard
          title="Resueltos"
          value={stats.resueltos}
          icon={<CheckCircle size={24} />}
          color="bg-green-500"
          bgColor="bg-green-50"
        />
      </div>

      {/* Critical alerts */}
      {stats.criticos > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <ShieldAlert size={24} className="text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">
              {stats.criticos} reporte(s) de prioridad crítica
            </p>
            <p className="text-sm text-red-600">Requieren atención inmediata</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Reportes Recientes</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentReports.map(report => (
              <Link
                key={report.id}
                to={`/reportes/${report.id}`}
                className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">{getReportIcon(report)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{report.title}</p>
                  <p className="text-sm text-slate-500 truncate">{report.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(report.status)}`}>
                      {report.status === 'pendiente' ? 'Pendiente' : report.status === 'en_proceso' ? 'En Proceso' : 'Resuelto'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(report.priority)}`}>
                      {report.priority === 'critica' ? 'Crítica' : report.priority === 'alta' ? 'Alta' : report.priority === 'media' ? 'Media' : 'Baja'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {format(parseISO(report.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {recentReports.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                No hay reportes registrados
              </div>
            )}
          </div>
          <div className="p-3 border-t border-slate-100">
            <Link
              to="/reportes"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 justify-center"
            >
              Ver todos los reportes →
            </Link>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Por Prioridad</h2>
          </div>
          <div className="p-5 space-y-4">
            <PriorityBar label="Crítica" count={priorityDistribution.critica} total={stats.total} color="bg-red-500" />
            <PriorityBar label="Alta" count={priorityDistribution.alta} total={stats.total} color="bg-orange-500" />
            <PriorityBar label="Media" count={priorityDistribution.media} total={stats.total} color="bg-blue-500" />
            <PriorityBar label="Baja" count={priorityDistribution.baja} total={stats.total} color="bg-slate-400" />
          </div>

          <div className="p-5 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Por Categoría</h3>
            <div className="space-y-2">
              {getCategoryDistribution(reports).map(cat => (
                <div key={cat.name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{cat.name}</span>
                  <span className="font-medium text-slate-800">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, bgColor }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`${bgColor} p-3 rounded-xl`}>
          <div className={`${color.replace('bg-', 'text-')}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

function PriorityBar({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-medium text-slate-800">{count}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function getCategoryDistribution(reports: any[]) {
  const categories: Record<string, number> = {};
  reports.forEach(r => {
    const label = getCategoryLabel(r.category);
    categories[label] = (categories[label] || 0) + 1;
  });
  return Object.entries(categories)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
