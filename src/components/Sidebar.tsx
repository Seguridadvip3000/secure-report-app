import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Shield, FileText, List, UserCheck, Map, Settings } from 'lucide-react';

export default function Sidebar() {
  const { currentUser } = useAuth();
  const location = useLocation();

  const rol = currentUser?.role?.toLowerCase() || '';
  const nombreElemento = currentUser?.nombre_completo || '';

  // REGLAS MAESTRAS DE VISIBILIDAD PARA EL MENÚ
  const puedeCrearReporte = ['administrador', 'admin', 'directiva', 'operaciones', 'lider'].includes(rol);
  const puedeVerListaReportes = ['administrador', 'admin', 'directiva', 'operaciones', 'cliente'].includes(rol);
  const puedeVerAprobacionesUsuarios = ['administrador', 'admin', 'directiva', 'operaciones'].includes(rol);
  
  // El seguimiento de rutas es EXCLUSIVO del Administrador Principal (Matthías Hernández)
  const puedeVerSeguimientoRutas = 
    (['administrador', 'admin'].includes(rol)) && nombreElemento.includes('Matthías');

  const puedeVerConfiguracion = ['administrador', 'admin', 'directiva'].includes(rol);

  return (
    <div className="w-64 bg-slate-950 min-h-screen text-slate-300 p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-2 py-3 border-b border-slate-800">
          <Shield className="text-blue-500" size={24} />
          <span className="font-bold text-white text-lg">SecureReport</span>
        </div>

        <nav className="space-y-1">
          {/* OPT 1: CREAR REPORTE (Enlazado a la ruta real de tu proyecto) */}
          {puedeCrearReporte && (
            <Link to="/crear-reporte" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/crear-reporte' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'}`}>
              <FileText size={18} /> Crear Reporte
            </Link>
          )}

          {/* OPT 2: LISTA DE REPORTES (Sincronizado con /lista-reportes) */}
          {puedeVerListaReportes && (
            <Link to="/lista-reportes" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/lista-reportes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'}`}>
              <List size={18} /> Lista de Reportes
            </Link>
          )}
          {/* OPT 3: APROBACIONES DE USUARIOS */}
          {puedeVerAprobacionesUsuarios && (
            <Link to="/aprobaciones" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/aprobaciones' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'}`}>
              <UserCheck size={18} /> Aprobaciones
            </Link>
          )}

          {/* OPT 4: SEGUIMIENTO DE RUTAS */}
          {puedeVerSeguimientoRutas && (
            <Link to="/seguimiento-rutas" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/seguimiento-rutas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'}`}>
              <Map size={18} /> Seguimiento de Rutas
            </Link>
          )}

          {/* OPT 5: CONFIGURACIÓN */}
          {puedeVerConfiguracion && (
            <Link to="/configuracion" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/configuracion' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'}`}>
              <Settings size={18} /> Configuración
            </Link>
          )}
        </nav>
      </div>

      {/* PIE DE MENÚ CON PERFIL ACTIVO */}
      <div className="border-t border-slate-800 pt-4 text-xs space-y-1">
        <div className="font-semibold text-white truncate">{nombreElemento}</div>
        <div className="text-slate-500 uppercase font-bold tracking-wider">{rol}</div>
      </div>
    </div>
  );
}
