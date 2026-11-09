import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Shield, Check, X, AlertTriangle, UserCheck, Lock } from 'lucide-react';

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

  // VALIDACIÓN ESTRICTA: Matthías Hernández es el Administrador Principal Único
  const nombreUsuarioActivo = currentUser?.nombre_completo || '';
  const rolActual = currentUser?.role?.toLowerCase() || '';

  const esAdminPrincipal = 
    (rolActual === 'admin' || rolActual === 'administrador') && 
    nombreUsuarioActivo.includes('Matthías');

  const esDirectiva = rolActual === 'directiva';
  
  // Tanto el Administrador Principal como la Directiva entran a la página
  const tieneAccesoAprobaciones = esAdminPrincipal || esDirectiva;

  const cargarSolicitudesRetenidas = async () => {
    if (!tieneAccesoAprobaciones) return;
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('id, username, nombre_completo, email, role, status, created_at')
        .eq('status', 'retenido')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setSolicitudes(data || []);
    } catch (err: any) {
      console.error('Error cargando solicitudes:', err.message);
      setError('No se pudieron obtener las cuentas por autorizar');
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
  if (!tieneAccesoAprobaciones) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="bg-red-100 p-4 rounded-full text-red-600">
          <AlertTriangle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-slate-500 max-w-md">
          Esta sección es exclusiva para el personal con credenciales operativas de Directiva o Administración en el sistema SecureReport.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <UserCheck className="text-blue-600" /> Autorización de Nuevos Registros
        </h2>
        <p className="text-slate-500 text-sm">Evalúe y apruebe las cuentas pendientes. Las cuentas con rol directiva solo pueden ser procesadas por el Administrador Principal.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando registros pendientes...</div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">{error}</div>
      ) : solicitudes.length === 0 ? (
        <div className="bg-slate-50 text-center py-16 rounded-2xl border border-dashed border-slate-200 text-slate-400">
          🎉 No existen solicitudes de registro pendientes por procesar actualmente.
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-xl overflow-hidden border border-slate-100">
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
                // Solo Matthías (esAdminPrincipal) puede autorizar cuentas de tipo directiva
                const puedeProcesar = esAdminPrincipal || (esDirectiva && !esSolicitudDirectiva);

                return (
                  <tr key={sol.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{sol.nombre_completo} <span className="text-xs text-slate-400">(@{sol.username})</span></td>
                    <td className="p-4 text-slate-500">{sol.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase ${esSolicitudDirectiva ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700'}`}>
                        {sol.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {puedeProcesar ? (
                        <div className="space-x-2 inline-flex justify-end">
                          <button onClick={() => gestionarSolicitud(sol.id, 'aprobado')} className="p-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors inline-flex items-center gap-1 font-medium text-xs">
                            <Check size={14} /> Aprobar
                          </button>
                          <button onClick={() => gestionarSolicitud(sol.id, 'rechazado')} className="p-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors inline-flex items-center gap-1 font-medium text-xs">
                            <X size={14} /> Rechazar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 select-none">
                          <Lock size={12} className="text-slate-400" /> Req. Administrador
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
