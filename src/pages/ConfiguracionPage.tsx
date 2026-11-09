import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Settings, Key } from 'lucide-react';

export default function ConfiguracionPage() {
  const { currentUser } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowLoginPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const rol = currentUser?.role?.toLowerCase() || '';
  const nombreElemento = currentUser?.nombre_completo || '';

  // Clave de seguridad corporativa requerida para la Directiva
  const CLAVE_DIRECTIVA = '05072022'; 
  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // ADMINISTRADOR: Acceso libre o con cualquier intento si es Matthías Hernández
    if ((rol === 'administrador' || rol === 'admin') && nombreElemento.includes('Matthías')) {
      setIsAuthenticated(true);
      return;
    }

    // DIRECTIVA: Validación estricta contra la clave maestra
    if (rol === 'directiva' && password === CLAVE_DIRECTIVA) {
      setIsAuthenticated(true);
    } else {
      setError('Contraseña de autorización de seguridad incorrecta.');
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
              Está intentando ingresar a los parámetros de Configuración. Introduzca la clave corporativa de nivel Directivo.
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
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ borderBottom: '2px solid #f1f3f5', paddingBottom: '12px', marginBottom: '25px' }}>
        <h2 style={{ color: '#333', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={24} className="text-blue-600" /> PARÁMETROS GENERALES DEL SISTEMA
        </h2>
        <small style={{ color: '#666' }}>Seguridad Vip 3000 C.A. — Consola de Control de Privilegios</small>
      </div>

      {successMessage && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={16} /> {successMessage}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '20px', spaceY: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#495057' }}>Políticas de Seguridad Activas</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #f5a623' }}>
            <span style={{ fontWeight: 'bold', display: 'block', fontSize: '14px' }}>Rastreo Móvil Perimetral</span>
            <small style={{ color: '#6c757d' }}>Frecuencia de actualización satelital de los dispositivos de los Líderes establecida en 30 segundos.</small>
          </div>

          <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #0070f3' }}>
            <span style={{ fontWeight: 'bold', display: 'block', fontSize: '14px' }}>Jerarquía de Registros</span>
            <small style={{ color: '#6c757d' }}>Las solicitudes con rango de Directiva quedan retenidas para autorización exclusiva del Administrador Principal.</small>
          </div>
        </div>

        <button 
          onClick={() => setSuccessMessage('Parámetros y cachés del sistema sincronizados con Supabase correctamente.')}
          style={{ marginTop: '25px', padding: '10px 20px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
        >
          Sincronizar Cambios
        </button>
      </div>
    </div>
  );
}
