import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Route, Settings, Users } from 'lucide-react';

export default function AdministradorHome() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Panel de Administrador</h1>
        <p className="text-orange-100 mt-1">Bienvenido, {currentUser?.nombre_completo}</p>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/seguimiento-rutas')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-orange-500 hover:bg-orange-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Route size={28} className="text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Seguimiento de Rutas</h3>
          <p className="text-sm text-slate-500">Monitoreo en tiempo real de líderes y operaciones</p>
        </button>

        <button
          onClick={() => navigate('/configuracion')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-slate-500 hover:bg-slate-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Settings size={28} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Configuración</h3>
          <p className="text-sm text-slate-500">Gestión de usuarios y parámetros del sistema</p>
        </button>
      </div>

      {/* Info */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-sm text-orange-800">
          <strong>Nota:</strong> Como administrador, tienes acceso exclusivo al seguimiento de rutas en tiempo real de todos los líderes y usuarios de operaciones.
        </p>
      </div>
    </div>
  );
}