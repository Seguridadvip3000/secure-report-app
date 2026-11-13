import { useState, useMemo, useEffect } from 'react';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, CheckCircle, Calendar, Shield, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ReportCard from '../components/ReportCard';

export default function ClienteDashboard() {
  const { reports, refreshReports } = useReports();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    refreshReports().then(() => {
      setLastUpdate(new Date());
    });
  }, []);

  const handleRefresh = async () => {
    await refreshReports();
    setLastUpdate(new Date());
  };

  // El cliente SOLO ve reportes aprobados, visibles y que coincidan estrictamente con sus proyectos asignados
  const approvedReports = useMemo(() => {
    const misProyectos = Array.isArray(currentUser?.proyectos) ? currentUser.proyectos : [];
    if (misProyectos.length === 0) return [];

    return reports
      .filter(r => r.visibleForClient && r.status === 'aprobado')
      .filter(r => misProyectos.includes('*') || misProyectos.includes(r.proyecto))
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Shield size={24} />
            <h1 className="text-xl font-bold">Panel del Cliente</h1>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
            title="Recargar reportes"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Recargar</span>
          </button>
        </div>
        <p className="text-green-100">
          Reportes verificados de tus proyectos: <strong>{currentUser?.proyectos?.join(', ') || 'Ninguno asignado'}</strong>
        </p>
        <p className="text-green-200 text-xs mt-1">
          Última actualización: {format(lastUpdate, "HH:mm:ss", { locale: es })}
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
              <p className="text-2xl font-bold text-slate-800">{approvedReports.length}</p>
              <p className="text-xs text-slate-500">Reportes de tu Proyecto</p>
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
              <p className="text-2xl font-bold text-slate-800">{currentUser?.proyectos?.length || 0}</p>
              <p className="text-xs text-slate-500">Proyectos Asignados</p>
            </div>
          </div>
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
            <h3 className="text-lg font-medium text-slate-600">No hay reportes aprobados para tu proyecto</h3>
            <p className="text-slate-400 mt-1 text-sm">
              Los reportes aparecerán aquí una vez sean verificados por Operaciones o Directiva.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
