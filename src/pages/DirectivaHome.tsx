import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportContext';
import { FilePlus, List, UserCheck, Settings, CheckCircle, Clock, FileText, MapPin } from 'lucide-react'; // Importado MapPin

export default function DirectivaHome() {
  const navigate = useNavigate();
  const { currentUser, pendingUsers } = useAuth();
  const { reports } = useReports();

  const stats = {
    total: reports.length,
    pendientes: reports.filter(r => r.status === 'pendiente' || r.status === 'en_proceso').length,
    aprobados: reports.filter(r => r.status === 'aprobado').length,
    usuariosPendientes: pendingUsers.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Panel de Directiva</h1>
        <p className="text-red-100 mt-1">Bienvenido, {currentUser?.nombre_completo}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <FileText size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500">Total Reportes</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-yellow-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.pendientes}</p>
          <p className="text-xs text-slate-500">Pendientes</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.aprobados}</p>
          <p className="text-xs text-slate-500">Aprobados</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-amber-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <UserCheck size={20} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.usuariosPendientes}</p>
          <p className="text-xs text-slate-500">Usuarios Pendientes</p>
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/nuevo')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FilePlus size={28} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">1. Crear Reporte</h3>
          <p className="text-sm text-slate-500">Registrar una nueva novedad</p>
        </button>

        <button
          onClick={() => navigate('/reportes')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <List size={28} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">2. Lista de Reportes</h3>
          <p className="text-sm text-slate-500">Ver y aprobar reportes (con casilla de verificación)</p>
        </button>

        <button
          onClick={() => navigate('/seguimiento-rutas')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <MapPin size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">3. Seguimiento de Rutas</h3>
          <p className="text-sm text-slate-500">Monitoreo de asistencia y GPS en tiempo real</p>
        </button>

        <button
          onClick={() => navigate('/aprobaciones')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-amber-500 hover:bg-amber-50 transition-all group text-left relative"
        >
          {stats.usuariosPendientes > 0 && (
            <div className="absolute top-4 right-4 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
              {stats.usuariosPendientes}
            </div>
          )}
          <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UserCheck size={28} className="text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">4. Aprobaciones</h3>
          <p className="text-sm text-slate-500">Aprobar registros de nuevos usuarios</p>
        </button>

        <button
          onClick={() => navigate('/configuracion')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-slate-500 hover:bg-slate-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Settings size={28} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">5. Configuración</h3>
          <p className="text-sm text-slate-500">Panel de control avanzado (requiere clave)</p>
        </button>
      </div>
    </div>
  );
}