import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportContext';
import { FilePlus, List, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

export default function OperacionesHome() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { reports } = useReports();

  const stats = {
    total: reports.length,
    pendientes: reports.filter(r => r.status === 'pendiente' || r.status === 'en_proceso').length,
    aprobados: reports.filter(r => r.status === 'aprobado').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Panel de Operaciones</h1>
        <p className="text-purple-100 mt-1">Bienvenido, {currentUser?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Al marcar la casilla de verificación en un reporte, este será visible para el cliente correspondiente al proyecto.
        </p>
      </div>
    </div>
  );
}
