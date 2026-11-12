import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Check, X, AlertTriangle, UserCheck, Lock, RefreshCw } from 'lucide-react';

interface SolicitudRegistro {
  id: string;
  username: string;
  nombre_completo: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function AprobacionesPage() {
  const { currentUser } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // VALIDACIÓN ESTRICTA DE ROLES
  const nombreUsuarioActivo = currentUser?.nombre_completo || '';
  const rolActual = currentUser?.role?.toLowerCase().trim() || '';

  const esAdminPrincipal = 
    (rolActual === 'admin' || rolActual === 'administrador') && 
    nombreUsuarioActivo.includes('Matthías');

  const esAdmin = rolActual === 'admin' || rolActual === 'administrador' || esAdminPrincipal;
  const esDirectiva = rolActual === 'directiva';
  const esOperaciones = rolActual === 'operaciones';
  
  // Administrador, Directiva y Operaciones tienen acceso al panel de aprobaciones
  const tieneAccesoAprobaciones = esAdmin || esDirectiva || esOperaciones;

  const cargarSolicitudesRetenidas = async () => {
    if (!tieneAccesoAprobaciones) return;
    setLoading(true);
    setError('');
    try {
      // Busca tanto 'retenido' como 'pendiente' para evitar que queden ocultos
      const { data, error: dbError } = await supabase
        .from('users')
        .select('id, username, nombre_completo, email, role, status, created_at')
        .in('status', ['retenido', 'pendiente', 'Retenido', 'Pendiente'])
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setSolicitudes(data || []);
    } catch (err: any) {
      console.error('Error cargando solicitudes:', err.message);
      setError('No se pudieron obtener las cuentas por autorizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSolicitudesRetenidas();
  }, [currentUser]);

  const gestionarSolicitud = async (id: string, nuevoEstado: 'aprobado' | 'rechazado') => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ status: nuevoEstado })
        .eq('id', id);

      if (updateError) throw updateError;
      setSolicitudes(prev => prev.filter(sol => sol.id !== id));
    } catch (err: any) {
      alert('Error al procesar la acción: ' + err.message);
    }
  };

  // FUNCIÓN QUE EVALÚA QUIÉN PUEDE AUTORIZAR CADA ROL SOLICITADO
  const evaluarPermisoAprobacion = (rolSolicitadoRaw: string) => {
    const rolSol = (rolSolicitadoRaw || '').toLowerCase().trim();

    if (esAdmin) {
      return { permitido: true, motivoBloqueo: '' };
    }

    if (esDirectiva) {
      if (rolSol === 'directiva' || rolSol === 'administrador' || rolSol === 'admin') {
        return { permitido: false, motivoBloqueo: 'Req. Administrador' };
      }
      // Directiva puede aprobar operaciones, cliente y lider
      return { permitido: true, motivoBloqueo: '' };
    }

    if (esOperaciones) {
      if (rolSol === 'lider') {
        return { permitido: true, motivoBloqueo: '' };
      }
      return { permitido: false, motivoBloqueo: 'Req. Directiva / Admin' };
    }

    return { permitido: false, motivoBloqueo: 'Sin permisos' };
  };
  if (!tieneAccesoAprobaciones) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="bg-red-100 p-4 rounded-full text-red-600">
          <AlertTriangle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-slate-500 max-w-md">
          Esta sección es exclusiva para el personal con credenciales de Operaciones, Directiva o Administración en el sistema SecureReport.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="text-blue-600 flex-shrink-0" /> Autorización de Nuevos Registros
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1">
            Evalúe y apruebe las cuentas pendientes según su nivel de autorización operativa.
          </p>
        </div>

        <button
          onClick={cargarSolicitudesRetenidas}
          className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm flex-shrink-0"
          title="Refrescar solicitudes"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando registros pendientes...</div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm">{error}</div>
      ) : solicitudes.length === 0 ? (
        <div className="bg-slate-50 text-center py-16 px-4 rounded-2xl border border-dashed border-slate-200 text-slate-500">
          No existen solicitudes de registro pendientes por procesar actualmente.
        </div>
      ) : (
        <>
          {/* VISTA DE TABLA PARA COMPUTADORAS */}
          <div className="hidden md:block bg-white shadow-md rounded-xl overflow-hidden border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Nombre Completo</th>
                  <th className="p-4">Correo Electrónico</th>
                  <th className="p-4">Rol Solicitado</th>
                  <th className="p-4 text-right">Acciones de Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {solicitudes.map((sol) => {
                  const esSolicitudDirectiva = sol.role?.toLowerCase() === 'directiva';
                  const { permitido, motivoBloqueo } = evaluarPermisoAprobacion(sol.role);

                  return (
                    <tr key={sol.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">
                        {sol.nombre_completo} <span className="text-xs text-slate-400">(@{sol.username})</span>
                      </td>
                      <td className="p-4 text-slate-500">{sol.email}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase ${
                          esSolicitudDirectiva ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {sol.role}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {permitido ? (
                          <div className="space-x-2 inline-flex justify-end">
                            <button onClick={() => gestionarSolicitud(sol.id, 'aprobado')} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors inline-flex items-center gap-1 font-medium text-xs cursor-pointer">
                              <Check size={14} /> Aprobar
                            </button>
                            <button onClick={() => gestionarSolicitud(sol.id, 'rechazado')} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors inline-flex items-center gap-1 font-medium text-xs cursor-pointer">
                              <X size={14} /> Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 select-none">
                            <Lock size={12} className="text-slate-400" /> {motivoBloqueo}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* VISTA DE TARJETAS RESPONSIVAS PARA TELÉFONOS MÓVILES */}
          <div className="md:hidden space-y-3">
            {solicitudes.map((sol) => {
              const esSolicitudDirectiva = sol.role?.toLowerCase() === 'directiva';
              const { permitido, motivoBloqueo } = evaluarPermisoAprobacion(sol.role);

              return (
                <div key={sol.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{sol.nombre_completo}</h3>
                      <p className="text-xs text-slate-400">@{sol.username} • {sol.email}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase flex-shrink-0 ${
                      esSolicitudDirectiva ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {sol.role}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    {permitido ? (
                      <>
                        <button onClick={() => gestionarSolicitud(sol.id, 'aprobado')} className="flex-1 py-2 bg-green-600 text-white rounded-lg inline-flex items-center justify-center gap-1.5 font-bold text-xs">
                          <Check size={15} /> Aprobar
                        </button>
                        <button onClick={() => gestionarSolicitud(sol.id, 'rechazado')} className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg inline-flex items-center justify-center gap-1.5 font-bold text-xs">
                          <X size={15} /> Rechazar
                        </button>
                      </>
                    ) : (
                      <span className="w-full justify-center text-xs text-slate-500 bg-slate-100 py-2 px-3 rounded-lg inline-flex items-center gap-1.5 font-medium">
                        <Lock size={13} className="text-slate-400" /> {motivoBloqueo}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
