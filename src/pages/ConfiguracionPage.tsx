import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS, ROLE_LABELS } from '../data/constants';
import { Lock, Eye, EyeOff, CheckCircle, Settings, Key, Users, Edit, Save, X } from 'lucide-react';

export default function ConfiguracionPage() {
  const { currentUser } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowLoginPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [rolEditado, setRolEditado] = useState('');
  const [proyectosEditados, setProyectosEditados] = useState<string[]>([]);

  const rol = currentUser?.role?.toLowerCase() || '';
  const nombreElemento = currentUser?.nombre_completo || '';
  const CLAVE_DIRECTIVA = '05072022';

  const cargarUsuarios = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      cargarUsuarios();
    }
  }, [isAuthenticated]);

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if ((rol === 'administrador' || rol === 'admin') && nombreElemento.includes('Matthías')) {
      setIsAuthenticated(true);
      return;
    }

    if (rol === 'directiva' && password === CLAVE_DIRECTIVA) {
      setIsAuthenticated(true);
    } else {
      setError('Contraseña de autorización de seguridad incorrecta.');
    }
  };

  const iniciarEdicionUsuario = (u: any) => {
    setEditandoId(u.id);
    setRolEditado(u.role || 'lider');
    setProyectosEditados(Array.isArray(u.proyectos) ? u.proyectos : []);
  };

  const toggleProyectoUsuario = (proyecto: string) => {
    setProyectosEditados(prev =>
      prev.includes(proyecto) ? prev.filter(p => p !== proyecto) : [...prev, proyecto]
    );
  };

  const guardarCambiosUsuario = async (id: string) => {
    try {
      const proyectosFinales = (rolEditado === 'directiva' || rolEditado === 'operaciones' || rolEditado === 'admin')
        ? ['*']
        : proyectosEditados;

      const { error } = await supabase
        .from('users')
        .update({
          role: rolEditado,
          proyectos: proyectosFinales
        })
        .eq('id', id);

      if (error) throw error;
      setEditandoId(null);
      setSuccessMessage('Rol y proyectos del usuario actualizados correctamente.');
      cargarUsuarios();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert('Error al actualizar usuario: ' + err.message);
    }
  };
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 bg-slate-50/50">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full border border-slate-100 space-y-4">
          <div className="text-center">
            <div className="inline-flex p-3 bg-amber-50 rounded-xl text-amber-600 mb-3">
              <Lock size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Verificación de Identidad</h3>
            <p className="text-slate-500 text-xs mt-1">
              Introduzca la clave corporativa de nivel Directivo para gestionar usuarios y parámetros.
            </p>
          </div>

          {error && <div className="bg-red-50 text-red-700 text-xs rounded-lg p-3 border border-red-100">{error}</div>}

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña del Sistema</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese la contraseña de control"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowLoginPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
              <Key size={14} /> Validar Credenciales
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings size={24} className="text-blue-600" /> CONFIGURACIÓN Y GESTIÓN DE PERSONAL
        </h2>
        <p className="text-xs md:text-sm text-slate-500">Seguridad Vip 3000 C.A. — Control de Roles, Proyectos y Privilegios</p>
      </div>

      {successMessage && (
        <div className="bg-green-50 text-green-800 p-3.5 rounded-xl border border-green-200 text-sm flex items-center gap-2 font-medium">
          <CheckCircle size={18} className="text-green-600" /> {successMessage}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
            <Users size={18} className="text-blue-600" /> Personal y Clientes Registrados ({usuarios.length})
          </h3>
        </div>
        {loadingUsers ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando base de datos de usuarios...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {usuarios.map((u) => {
              const estaEditando = editandoId === u.id;
              const esAdminPrincipal = (u.role?.toLowerCase() === 'admin' || u.role?.toLowerCase() === 'administrador') && u.nombre_completo?.includes('Matthías');

              return (
                <div key={u.id} className="p-4 md:p-5 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm md:text-base">
                        {u.nombre_completo} <span className="text-xs font-normal text-slate-400">(@{u.username})</span>
                      </div>
                      <div className="text-xs text-slate-500">{u.email} • Estado: <strong className="uppercase">{u.status}</strong></div>
                    </div>

                    {!estaEditando && !esAdminPrincipal && (
                      <button
                        onClick={() => iniciarEdicionUsuario(u)}
                        className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Edit size={14} /> Cambiar Rol / Proyectos
                      </button>
                    )}
                  </div>

                  {estaEditando ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Asignar Nuevo Rol</label>
                        <select
                          value={rolEditado}
                          onChange={(e) => setRolEditado(e.target.value)}
                          className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                          {Object.entries(ROLE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>

                      {(rolEditado === 'lider' || rolEditado === 'cliente') && (
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Proyectos Asignados (Toque para marcar/desmarcar)</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {PROYECTOS.map((proy) => (
                              <button
                                key={proy}
                                type="button"
                                onClick={() => toggleProyectoUsuario(proy)}
                                className={`p-2 text-xs rounded-lg border text-left transition-all ${
                                  proyectosEditados.includes(proy)
                                    ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {proy}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => guardarCambiosUsuario(u.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                        >
                          <Save size={14} /> Guardar Cambios
                        </button>
                        <button
                          onClick={() => setEditandoId(null)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100"
                        >
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-md uppercase">
                        Rol: {u.role}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">
                        Proyectos: <strong>{Array.isArray(u.proyectos) && u.proyectos.length > 0 ? u.proyectos.join(', ') : 'Ninguno asignado'}</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
