import { useState, useMemo } from 'react';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, CheckCircle, Calendar, Shield } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import ReportCard from '../components/ReportCard';

export default function ClienteDashboard() {
  const { reports } = useReports();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');

  // Client only sees approved reports for their projects
  const approvedReports = useMemo(() => {
    return reports
      .filter(r => r.visibleForClient && r.status === 'aprobado')
      .filter(r => {
        // Filter by client's assigned projects
        if (currentUser?.proyectos && currentUser.proyectos.length > 0) {
          return currentUser.proyectos.includes(r.proyecto);
        }
        return true; // If no projects assigned, show all
      })
      .filter(r => {
        if (search === '') return true;
        return (
          r.tituloNovedad.toLowerCase().includes(search.toLowerCase()) ||
          r.desarrollo.toLowerCase().includes(search.toLowerCase()) ||
          r.proyecto.toLowerCase().includes(search.toLowerCase())
        );
      })
      .sort((a, b) => new Date(b.approvedAtOperaciones || b.createdAt).getTime() - new Date(a.approvedAtOperaciones || a.createdAt).getTime());
  }, [reports, search, currentUser]);

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
              <p className="text-xs text-slate-500">Disponibles</p>
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
            Todos los reportes mostrados han sido revisados y aprobados por el equipo de Operaciones.
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
          <ReportCard key={report.id} report={report} />
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
