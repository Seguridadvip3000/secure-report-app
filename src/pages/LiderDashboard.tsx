import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportContext';
import { Link } from 'react-router-dom';
import {
  FilePlus,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  FileText,
  ArrowRight,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel, getReportIcon } from '../utils/helpers';

export default function LiderDashboard() {
  const { currentUser } = useAuth();
  const { reports } = useReports();

  const myReports = reports.filter(r => r.createdBy === currentUser?.id);
  const recentReports = [...myReports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = {
    total: myReports.length,
    pendientes: myReports.filter(r => r.status === 'pendiente').length,
    aprobados: myReports.filter(r => r.status === 'aprobado').length,
    criticos: myReports.filter(r => r.priority === 'critica' && r.status !== 'aprobado').length,
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={24} />
          <h1 className="text-xl font-bold">Panel del Líder de Seguridad</h1>
        </div>
        <p className="text-blue-100">
          Bienvenido, {currentUser?.name}. Registre novedades en tiempo real.
        </p>
      </div>

      {/* Quick Action */}
      <Link
        to="/nuevo"
        className="block bg-white border-2 border-dashed border-blue-300 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all group"
      >
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <FilePlus size={28} className="text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Crear Nuevo Reporte</h3>
        <p className="text-sm text-slate-500 mt-1">Registre una novedad en tiempo real</p>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={<FileText size={20} />} label="Mis Reportes" value={stats.total} color="text-blue-600" bg="bg-blue-50" />
        <MiniStat icon={<Clock size={20} />} label="Pendientes" value={stats.pendientes} color="text-yellow-600" bg="bg-yellow-50" />
        <MiniStat icon={<CheckCircle size={20} />} label="Aprobados" value={stats.aprobados} color="text-green-600" bg="bg-green-50" />
        <MiniStat icon={<AlertTriangle size={20} />} label="Críticos" value={stats.criticos} color="text-red-600" bg="bg-red-50" />
      </div>

      {/* Recent */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Mis Últimos Reportes</h2>
          <Link to="/mis-reportes" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recentReports.map(report => (
            <Link
              key={report.id}
              to={`/reportes/${report.id}`}
              className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
            >
              <span className="text-xl">{getReportIcon(report)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm truncate">{report.title}</p>
                <p className="text-xs text-slate-400">
                  {format(parseISO(report.createdAt), "dd MMM, HH:mm", { locale: es })}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(report.status)}`}>
                {getStatusLabel(report.status)}
              </span>
            </Link>
          ))}
          {recentReports.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              No ha creado reportes aún. ¡Comience creando uno!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, color, bg }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={`${bg} w-10 h-10 rounded-lg flex items-center justify-center mb-2`}>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
