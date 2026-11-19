import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  List,
  UserCheck,
  Map,
  Settings,
  Menu,
  X,
  LogOut,
  Clock,
  ShieldCheck,
  BarChart3,
  ClipboardCheck,
  UserSearch,
} from 'lucide-react';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const rol = currentUser?.role?.toLowerCase() || '';
  const nombreElemento = currentUser?.nombre_completo || '';

  const puedeCrearReporte = ['administrador', 'admin', 'directiva', 'operaciones', 'cecom', 'supervisor', 'lider'].includes(rol);
  const puedeVerAsistenciaPlantilla = ['administrador', 'admin', 'directiva', 'operaciones', 'lider'].includes(rol);
  const puedeVerPanelAnalista = ['administrador', 'admin', 'directiva', 'operaciones', 'analista'].includes(rol);
  const puedeVerListaReportes = ['administrador', 'admin', 'directiva', 'operaciones', 'cecom', 'cliente'].includes(rol);
  const puedeVerAprobacionesUsuarios = ['administrador', 'admin', 'directiva', 'operaciones'].includes(rol);
  const puedeVerAsistenciasYSupervisiones = ['administrador', 'admin', 'directiva'].includes(rol);
  const puedeVerEstadisticas = ['administrador', 'admin', 'directiva', 'operaciones'].includes(rol);
  const puedeVerSeguimientoRutas = ['administrador', 'admin'].includes(rol) && nombreElemento.includes('Matthías');
  const puedeVerConfiguracion = ['administrador', 'admin', 'directiva'].includes(rol);

  const cerrarMenu = () => setMenuAbierto(false);

  const manejarCerrarSesion = async () => {
    cerrarMenu();
    await logout();
    navigate('/auth', { replace: true });
  };

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-950 text-white px-4 pt-8 pb-3 flex items-center justify-between shadow-md border-b border-slate-800">
        <Link to="/" onClick={cerrarMenu} className="flex items-center gap-2.5">
          <img
            src="/logo-vip3000.jpg"
            alt="Seguridad VIP 3000"
            className="w-8 h-8 rounded-lg object-cover border border-amber-400/50"
          />
          <span className="font-bold text-base tracking-wide">SecureReport</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label="Alternar menú"
          className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 active:scale-95 transition-all"
        >
          {menuAbierto ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {menuAbierto && (
        <div
          onClick={cerrarMenu}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 min-h-screen text-slate-300 p-4 pt-10 md:pt-4 flex flex-col justify-between transform transition-transform duration-200 ease-out ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 py-3 border-b border-slate-800">
            <Link to="/" onClick={cerrarMenu} className="flex items-center gap-2.5">
              <img
                src="/logo-vip3000.jpg"
                alt="Seguridad VIP 3000"
                className="w-9 h-9 rounded-lg object-cover border border-amber-400/50"
              />
              <span className="font-bold text-white text-lg">SecureReport</span>
            </Link>
            <button
              type="button"
              onClick={cerrarMenu}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1">
            {puedeCrearReporte && (
              <Link
                to="/crear-reporte"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/crear-reporte' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <FileText size={18} /> Crear Reporte
              </Link>
            )}

            {puedeVerAsistenciaPlantilla && (
              <Link
                to="/asistencia"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/asistencia' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <ClipboardCheck size={18} /> ASISTENCIA
              </Link>
            )}

            {puedeVerPanelAnalista && (
              <Link
                to="/home-analista"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/home-analista' ? 'bg-teal-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <UserSearch size={18} /> Control Analista
              </Link>
            )}

            {puedeVerListaReportes && (
              <Link
                to="/lista-reportes"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/lista-reportes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <List size={18} /> Lista de Reportes
              </Link>
            )}

            {puedeVerAprobacionesUsuarios && (
              <Link
                to="/aprobaciones"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/aprobaciones' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <UserCheck size={18} /> Aprobaciones
              </Link>
            )}

            {puedeVerAsistenciasYSupervisiones && (
              <>
                <Link
                  to="/asistencias"
                  onClick={cerrarMenu}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/asistencias' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'
                  }`}
                >
                  <Clock size={18} /> Asistencia Líderes
                </Link>

                <Link
                  to="/supervisiones"
                  onClick={cerrarMenu}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/supervisiones' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'
                  }`}
                >
                  <ShieldCheck size={18} /> Supervisiones
                </Link>
              </>
            )}

            {puedeVerEstadisticas && (
              <Link
                to="/estadisticas"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/estadisticas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <BarChart3 size={18} /> Estadísticas
              </Link>
            )}

            {puedeVerSeguimientoRutas && (
              <Link
                to="/seguimiento-rutas"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/seguimiento-rutas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <Map size={18} /> Seguimiento de Rutas
              </Link>
            )}

            {puedeVerConfiguracion && (
              <Link
                to="/configuracion"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/configuracion' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <Settings size={18} /> Configuración
              </Link>
            )}
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="text-xs space-y-1 px-1">
            <div className="font-semibold text-white truncate">{nombreElemento}</div>
            <div className="text-slate-500 uppercase font-bold tracking-wider">{rol}</div>
          </div>

          <button
            type="button"
            onClick={manejarCerrarSesion}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors cursor-pointer"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
}
