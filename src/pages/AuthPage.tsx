import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ROLE_LABELS } from '../types';
import { PROYECTOS } from '../data/constants';
import { Shield, Mail, User, Lock, Eye, EyeOff, ArrowRight, Building, UserCircle } from 'lucide-react';

type View = 'login' | 'register' | 'success';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [view, setView] = useState<View>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginUsernameOrEmail, setLoginUsernameOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regNombreCompleto, setRegNombreCompleto] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState<UserRole | ''>('');
  const [regProyectos, setRegProyectos] = useState<string[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!loginUsernameOrEmail || !loginPassword) {
      setError('Complete todos los campos');
      setLoading(false);
      return;
    }

    const result = await login(loginUsernameOrEmail, loginPassword);
    
    if (!result.success) {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones
    if (!regUsername.trim()) {
      setError('Ingrese un nombre de usuario');
      setLoading(false);
      return;
    }
    if (!regNombreCompleto.trim()) {
      setError('Ingrese su nombre completo');
      setLoading(false);
      return;
    }
    if (!regEmail.trim()) {
      setError('Ingrese su correo electrónico');
      setLoading(false);
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }
    if (!regRole) {
      setError('Seleccione un rol');
      setLoading(false);
      return;
    }
    if ((regRole === 'lider' || regRole === 'cliente') && regProyectos.length === 0) {
      setError('Seleccione al menos un proyecto');
      setLoading(false);
      return;
    }

    const result = await register({
      username: regUsername,
      nombre_completo: regNombreCompleto,
      email: regEmail,
      password: regPassword,
      role: regRole,
      proyectos: (regRole === 'lider' || regRole === 'cliente') ? regProyectos : undefined,
    });

    if (result.success) {
      setView('success');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
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
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">¡Registro Exitoso!</h2>
          <p className="text-slate-500">
            Su cuenta ha sido creada y está pendiente de aprobación por la Directiva.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            ⏳ Recibirá una notificación cuando su cuenta sea aprobada.
          </div>
          <button
            onClick={() => {
              setView('login');
              setError('');
              setRegUsername('');
              setRegNombreCompleto('');
              setRegEmail('');
              setRegPassword('');
              setRegRole('');
              setRegProyectos([]);
            }}
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
                    <UserCircle size={16} />
                    Nombre de Usuario o Correo Electrónico
                  </label>
                  <input
                    type="text"
                    value={loginUsernameOrEmail}
                    onChange={e => setLoginUsernameOrEmail(e.target.value)}
                    placeholder="usuario o correo@ejemplo.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Lock size={16} />
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    <>
                      Ingresar
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* REGISTER */}
            {view === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <User size={16} />
                    Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    placeholder="ej: juanperez"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={loading}
                  />
                </div>

                {/* Nombre Completo */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <User size={16} />
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={regNombreCompleto}
                    onChange={e => setRegNombreCompleto(e.target.value)}
                    placeholder="Ej: Juan Pérez García"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={loading}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Mail size={16} />
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={loading}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Lock size={16} />
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showRegPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Rol */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Tipo de Usuario *
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
                        disabled={loading}
                      >
                        <div className="text-lg mb-1">
                          {role === 'lider' ? '🛡️' : role === 'cliente' ? '👤' : role === 'operaciones' ? '📊' : '👑'}
                        </div>
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Proyectos (solo para lider y cliente) */}
                {(regRole === 'lider' || regRole === 'cliente') && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <Building size={16} />
                      Proyectos *
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2">
                      {PROYECTOS.map(proyecto => (
                        <label key={proyecto} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={regProyectos.includes(proyecto)}
                            onChange={() => toggleProyecto(proyecto)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            disabled={loading}
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
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      Registrarse
                      <ArrowRight size={18} />
                    </>
                  )}
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
