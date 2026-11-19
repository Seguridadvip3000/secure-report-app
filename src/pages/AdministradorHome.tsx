import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Route, Settings, Clock, ShieldCheck, BarChart3, Search, ClipboardCheck } from 'lucide-react';

export default function AdministradorHome() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Panel de Administrador</h1>
        <p className="text-orange-100 mt-1">Bienvenido, {currentUser?.nombre_completo}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/seguimiento-rutas')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-orange-500 hover:bg-orange-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Route size={28} className="text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">1. Seguimiento de Rutas</h3>
          <p className="text-sm text-slate-500">Monitoreo en tiempo real de líderes y operaciones</p>
        </button>

        <button
          onClick={() => navigate('/home-analista')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-teal-500 hover:bg-teal-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Search size={28} className="text-teal-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">2. Control Analista e Informe Diario</h3>
          <p className="text-sm text-slate-500">Auditar asistencias, bajas por salud, PDFs e historial por cédula</p>
        </button>

        <button
          onClick={() => navigate('/asistencia')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-cyan-500 hover:bg-cyan-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ClipboardCheck size={28} className="text-cyan-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">3. Plantilla y Asistencia Diaria</h3>
          <p className="text-sm text-slate-500">Gestión completa de plantilla operativa, traslados y pases de guardia</p>
        </button>

        <button
          onClick={() => navigate('/asistencias')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-teal-500 hover:bg-teal-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Clock size={28} className="text-teal-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">4. Asistencia de Líderes</h3>
          <p className="text-sm text-slate-500">Verificar entradas y salidas en cada proyecto</p>
        </button>

        <button
          onClick={() => navigate('/supervisiones')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShieldCheck size={28} className="text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">5. Supervisiones de Operaciones</h3>
          <p className="text-sm text-slate-500">Auditar visitas e inspecciones realizadas por Operaciones</p>
        </button>

        <button
          onClick={() => navigate('/estadisticas')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
        >
          <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BarChart3 size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">6. Estadísticas y Gráficos</h3>
          <p className="text-sm text-slate-500">Visualizar reportes por fecha, proyecto y título</p>
        </button>

        <button
          onClick={() => navigate('/configuracion')}
          className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-slate-500 hover:bg-slate-50 transition-all group text-left md:col-span-2"
        >
          <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Settings size={28} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">7. Configuración</h3>
          <p className="text-sm text-slate-500">Gestión de usuarios y parámetros del sistema</p>
        </button>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-sm text-orange-800">
          <strong>Nota:</strong> Como administrador, tienes acceso total al seguimiento de rutas GPS, control de asistencias, auditoría de supervisiones y gestión de personal.
        </p>
      </div>
    </div>
  );
}
