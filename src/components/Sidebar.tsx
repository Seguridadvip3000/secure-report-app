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
          {/* OPT 1: CREAR REPORTE (Líder, Operaciones, Directiva, Admin) */}
          {puedeCrearReporte && (
            <Link to="/crear-reporte" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/crear-reporte' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'}`}>
              <FileText size={18} /> Crear Reporte
            </Link>
          )}

          {/* OPT 2: LISTA DE REPORTES (Cliente, Operaciones, Directiva, Admin) */}
          {puedeVerListaReportes && (
            <Link to="/lista-reportes" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/lista-reportes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'}`}>
              <List size={18} /> Lista de Reportes
            </Link>
          )}

          {/* OPT 3: APROBACIONES DE USUARIOS (Operaciones, Directiva, Admin) */}
          {puedeVerAprobacionesUsuarios && (
            <Link to="/aprobaciones" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/aprobaciones' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'}`}>
              <UserCheck size={18} /> Aprobaciones
            </Link>
          )}

          {/* OPT 4: SEGUIMIENTO DE RUTAS (EXCLUSIVO ADMINISTRADOR MATTHÍAS) */}
          {puedeVerSeguimientoRutas && (
            <Link to="/seguimiento-rutas" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/seguimiento-rutas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'}`}>
              <Map size={18} /> Seguimiento de Rutas
            </Link>
          )}

          {/* OPT 5: CONFIGURACIÓN (Directiva, Admin) */}
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
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function ListaReportesPage() {
  const { currentUser } = useAuth();
  const [reportes, setReportes] = useState([]);
  const rol = currentUser?.role?.toLowerCase() || '';

  useEffect(() => {
    const consultarReportesEstructurados = async () => {
      let query = supabase.from('reportes').select('*');

      // REGLA CLIENTE: Solo ve aprobados y que correspondan a su proyecto asignado
      if (rol === 'cliente') {
        query = query
          .eq('status', 'aprobado')
          .eq('proyecto_id', currentUser?.proyecto_id || '');
      }

      const { data } = await query;
      if (data) setReportes(data);
    };

    consultarReportesEstructurados();
  }, [currentUser]);

  // REGLAS OPERATIVAS DE CONTROL DE ACCIONES EN LA UI
  const puedeAprobarORechazar = ['administrador', 'admin', 'directiva', 'operaciones'].includes(rol);
  const puedeEditarOEliminar = ['administrador', 'admin', 'directiva'].includes(rol); // Operaciones EXCLUIDO

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Control y Archivo de Novedades</h2>
      
      <div className="space-y-3">
        {reportes.map((reporte: any) => (
          <div key={reporte.id} className="bg-white border rounded-xl p-4 flex justify-between items-center shadow-sm">
            <div>
              <h4 className="font-bold text-slate-800">{reporte.titulo_novedad}</h4>
              <p className="text-xs text-slate-500">Proyecto: {reporte.nombre_proyecto} | Estado: <span className="font-semibold uppercase">{reporte.status}</span></p>
            </div>
            
            <div className="space-x-2">
              {/* Botones de aprobación rápidos para Operaciones, Directiva y Admin */}
              {puedeAprobarORechazar && reporte.status === 'pendiente' && (
                <>
                  <button className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium">Aprobar</button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium">Rechazar</button>
                </>
              )}

              {/* Botones de Modificación Estricta (Operaciones NO TIENE ACCESO) */}
              {puedeEditarOEliminar && (
                <>
                  <button className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs">Editar</button>
                  <button className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs">Eliminar</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
