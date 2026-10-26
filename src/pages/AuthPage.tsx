import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ROLE_LABELS } from '../types';
import { PROYECTOS } from '../data/constants';
import { Shield, Phone, Mail, User, ArrowRight, ArrowLeft, CheckCircle, Building } from 'lucide-react';

type View = 'login' | 'register' | 'success';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [view, setView] = useState<View>('login');
  const [error, setError] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');

  // Register form - paso 1
  const [regRole, setRegRole] = useState<UserRole | ''>('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  
  // Register form - paso 2 (solo para lider y cliente)
  const [regProyectos, setRegProyectos] = useState<string[]>([]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!loginEmail && !loginPhone) {
      setError('Ingrese su email o teléfono');
      return;
    }
    const result = login(loginEmail, loginPhone);
    if (!result.success) {
      setError(result.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones básicas
    if (!regRole) {
      setError('Seleccione un rol');
      return;
    }
    if (!regName.trim()) {
      setError('Ingrese su nombre completo');
      return;
    }
    if (!regPhone.trim()) {
      setError('Ingrese su número de teléfono');
      return;
    }
    if (!regEmail.trim()) {
      setError('Ingrese su correo electrónico');
      return;
    }

    // Para lider y cliente, validar proyectos
    if ((regRole === 'lider' || regRole === 'cliente') && regProyectos.length === 0) {
      setError('Seleccione al menos un proyecto');
      return;
    }

    const result = await register({
      name: regName,
      email: regEmail,
      phone: regPhone,
      role: regRole,
      proyectos: (regRole === 'lider' || regRole === 'cliente') ? regProyectos : undefined,
    });

    if (result.success) {
      setView('success');
    } else {
      setError(result.message);
    }
  };

  const toggleProyecto = (proyecto: string) => {
    setRegProyectos(prev => 
      prev.includes(proyecto) 
        ? prev.filter(p => p !== proyecto)
        : [...prev, proyecto]
    );
  };

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">¡Registro Exitoso!</h2>
          <p className="text-slate-500">
            Su solicitud ha sido enviada a la Directiva. Recibirá una notificación cuando su cuenta sea autorizada.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            ⏳ Tiempo estimado de aprobación: 24-48 horas
          </div>
          <button
            onClick={() => { setView('login'); setError(''); setRegRole(''); setRegName(''); setRegPhone(''); setRegEmail(''); setRegProyectos([]); }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Volver al Inicio de Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Shield size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">SecureReport</h1>
          <p className="text-blue-200 mt-1">Sistema de Gestión de Novedades</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => { setView('login'); setError(''); }}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                view === 'login'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setView('register'); setError(''); }}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                view === 'register'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Registrarse
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            {/* LOGIN */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Mail size={16} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="text-center text-xs text-slate-400">— o —</div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Phone size={16} />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={loginPhone}
                    onChange={e => setLoginPhone(e.target.value)}
                    placeholder="+58 414 000 0000"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Ingresar
                  <ArrowRight size={18} />
                </button>

                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                  <p className="font-medium text-slate-600">Cuentas de prueba:</p>
                  <p>👑 Directiva: directiva@seguridad.com</p>
                  <p>🛡️ Líder: carlos@seguridad.com</p>
                  <p>📊 Operaciones: roberto@operaciones.com</p>
                  <p>👤 Cliente: ana@cliente.com</p>
                </div>

                <button
                  type="button"
                  onClick={() => window.location.href = '/setup'}
                  className="w-full text-xs text-blue-600 hover:text-blue-700 underline mt-2"
                >
                  ¿Problemas para iniciar sesión? Inicializar base de datos
                </button>
              </form>
            )}

            {/* REGISTER */}
            {view === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* a) Rol */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    a) Tipo de Usuario *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['lider', 'cliente', 'operaciones', 'directiva'] as UserRole[]).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => { setRegRole(role); setRegProyectos([]); }}
                        className={`p-3 border-2 rounded-lg text-sm font-medium transition-all text-left ${
                          regRole === role
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-lg mb-1">
                          {role === 'lider' ? '🛡️' : role === 'cliente' ? '👤' : role === 'operaciones' ? '📊' : '👑'}
                        </div>
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* b) Nombre completo */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <User size={16} />
                    b) Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* c) Teléfono */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Phone size={16} />
                    c) Número de Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    placeholder="+58 414 000 0000"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* d) Email */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Mail size={16} />
                    d) Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    A este correo se enviarán los reportes autorizados
                  </p>
                </div>

                {/* e) Proyectos (solo para lider y cliente) */}
                {(regRole === 'lider' || regRole === 'cliente') && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <Building size={16} />
                      e) Proyectos *
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2">
                      {PROYECTOS.map(proyecto => (
                        <label key={proyecto} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={regProyectos.includes(proyecto)}
                            onChange={() => toggleProyecto(proyecto)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700">{proyecto}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Seleccione los proyectos a los que tendrá acceso ({regProyectos.length} seleccionados)
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Registrarse
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">
          © 2026 SecureReport - Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
