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
  Search,
  Users,
  UserPlus,
  UserMinus,
  Contact,
  Receipt,
  Activity,
  PhoneCall,
  ClipboardList,
} from 'lucide-react';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const rol = currentUser?.role?.toLowerCase() || '';
  const nombreElemento = currentUser?.nombre_completo || '';
  const esAdminTotal = rol === 'administrador' || rol === 'admin';

  const puedeCrearReporte = esAdminTotal || ['directiva', 'operaciones', 'cecom', 'supervisor', 'lider'].includes(rol);
  const puedeVerAsistenciaLider = esAdminTotal || rol === 'lider';
  const puedeVerTableroCobertura = esAdminTotal || ['directiva', 'operaciones'].includes(rol);
  const puedeVerLlamadasCecom = esAdminTotal || ['cecom', 'operaciones', 'directiva'].includes(rol);
  const puedeVerRelacionInasistencias = esAdminTotal || ['operaciones', 'directiva'].includes(rol);
  const puedeVerMonitorAsistencia = esAdminTotal || ['directiva', 'operaciones', 'cecom'].includes(rol);
  const puedeVerPanelAnalista = esAdminTotal || ['directiva', 'operaciones', 'analista', 'rrhh', 'recursos_humanos'].includes(rol);
  const puedeVerNominaRecibos = esAdminTotal || ['directiva', 'analista', 'rrhh', 'recursos_humanos'].includes(rol);
  const puedeVerVerificacionSE = esAdminTotal || ['directiva', 'operaciones', 'analista', 'rrhh', 'recursos_humanos'].includes(rol);
  const puedeVerReclutamiento = esAdminTotal || ['directiva', 'reclutamiento', 'rrhh', 'recursos_humanos'].includes(rol);
  const puedeVerFichaTecnica = esAdminTotal || ['directiva', 'operaciones', 'analista', 'reclutamiento', 'rrhh', 'recursos_humanos'].includes(rol);
  const puedeVerEgresadosYLiquidaciones = esAdminTotal || ['directiva', 'analista', 'reclutamiento', 'rrhh', 'recursos_humanos'].includes(rol);
  const puedeVerListaReportes = esAdminTotal || ['directiva', 'operaciones', 'cecom', 'cliente'].includes(rol);
  const puedeVerAprobacionesUsuarios = esAdminTotal || ['directiva', 'operaciones'].includes(rol);
  const puedeVerAsistenciasYSupervisiones = esAdminTotal || ['directiva'].includes(rol);
  const puedeVerEstadisticas = esAdminTotal || ['directiva', 'operaciones'].includes(rol);
  const puedeVerSeguimientoRutas = esAdminTotal;
  const puedeVerConfiguracion = esAdminTotal || ['directiva'].includes(rol);

  const cerrarMenu = () => setMenuAbierto(false);

  const manejarCerrarSesion = async () => {
    cerrarMenu();
    await logout();
    navigate('/auth', { replace: true });
  };

  const etiquetaMonitor =
    rol === 'cecom'
      ? 'Fuerza Operativa'
      : rol === 'operaciones'
      ? 'Personal Operativo'
      : 'Asistencia Proyectos';

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 min-h-screen text-slate-300 p-4 pt-10 md:pt-4 flex flex-col justify-between transform transition-transform duration-200 ease-out overflow-y-auto ${
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

            {puedeVerAsistenciaLider && (
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

            {puedeVerTableroCobertura && (
              <Link
                to="/tablero-cobertura"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/tablero-cobertura' ? 'bg-cyan-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <Activity size={18} /> Cobertura en Vivo
              </Link>
            )}

            {puedeVerLlamadasCecom && (
              <Link
                to="/llamadas-control"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/llamadas-control' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <PhoneCall size={18} /> Llamadas Control CECOM
              </Link>
            )}

            {puedeVerRelacionInasistencias && (
              <Link
                to="/relacion-inasistencias"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/relacion-inasistencias' ? 'bg-amber-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <ClipboardList size={18} /> Relación Inasistencias
              </Link>
            )}

            {puedeVerMonitorAsistencia && (
              <Link
                to="/monitor-asistencia"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/monitor-asistencia' ? 'bg-cyan-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <Users size={18} /> {etiquetaMonitor}
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
                <Search size={18} /> Control Analista
              </Link>
            )}

            {puedeVerNominaRecibos && (
              <Link
                to="/nomina-recibos"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/nomina-recibos' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <Receipt size={18} /> Nómina y Recibos
              </Link>
            )}

            {puedeVerVerificacionSE && (
              <Link
                to="/verificacion-servicios-especiales"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/verificacion-servicios-especiales' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <ShieldCheck size={18} /> Verificación Serv. Esp.
              </Link>
            )}

            {puedeVerReclutamiento && (
              <Link
                to="/home-reclutamiento"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/home-reclutamiento' ? 'bg-violet-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <UserPlus size={18} /> Reclutamiento
              </Link>
            )}
            {puedeVerFichaTecnica && (
              <Link
                to="/ficha-tecnica"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/ficha-tecnica' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <Contact size={18} /> Ficha Técnica C.I.
              </Link>
            )}

            {puedeVerEgresadosYLiquidaciones && (
              <Link
                to="/egresados"
                onClick={cerrarMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/egresados' ? 'bg-red-600 text-white' : 'hover:bg-slate-900'
                }`}
              >
                <UserMinus size={18} /> Egresados Empresa
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

        <div className="border-t border-slate-800 pt-4 space-y-3 mt-4">
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
