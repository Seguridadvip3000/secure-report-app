import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ROLE_LABELS } from '../types';
import { PROYECTOS } from '../data/constants';
import { Shield, Mail, User, Lock, Eye, EyeOff, ArrowRight, Building, UserCircle, Key } from 'lucide-react';

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
  const [adminKey, setAdminKey] = useState('');

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

    if (regRole === 'admin' && adminKey !== '05072022') {
      setError('La clave de autorización para registrarse como Administrador es incorrecta.');
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
      is_approved: regRole === 'directiva' ? false : true,
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
            Su cuenta ha sido creada correctamente en el sistema.
          </p>
          {regRole === 'directiva' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 text-left">
              ⏳ **Aviso:** Su cuenta de directiva se encuentra en estado retenido. Deberá ser autorizada exclusivamente por el Administrador principal antes de poder iniciar sesión.
            </div>
          )}
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
              setAdminKey('');
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Shield size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">SecureReport</h1>
          <p className="text-blue-200 mt-1">Sistema de Gestión de Novedades</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              type="button"
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
              type="button"
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Iniciando sesión...' : 'Ingresar'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>
            )}

            {view === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <User size={16} />
                    Nombre de Usuario
<input
type="text"
value={regUsername}
onChange={e => setRegUsername(e.target.value)}
placeholder="ej. jgomez"
className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
disabled={loading}
/>
Nombre Completo
<input
type="text"
value={regNombreCompleto}
onChange={e => setRegNombreCompleto(e.target.value)}
placeholder="ej. Juan Gómez"
className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
disabled={loading}
/>
Correo Electrónico
<input
type="email"
value={regEmail}
onChange={e => setRegEmail(e.target.value)}
placeholder="correo@ejemplo.com"
className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
disabled={loading}
/>
Contraseña
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
className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
>
{showRegPassword ?  : }


Rol en la Empresa
<select
value={regRole}
onChange={e => {
setRegRole(e.target.value as UserRole);
setRegProyectos([]);
if(e.target.value !== 'admin') setAdminKey('');
}}
className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none"
disabled={loading}
>
Seleccione un rol...
{Object.entries(ROLE_LABELS).map(([value, label]) => (
{label}
))}

{regRole === 'admin' && (
Clave de Seguridad Administrador
<input
type="password"
value={adminKey}
onChange={e => setAdminKey(e.target.value)}
placeholder="Ingrese la clave corporativa"
className="w-full px-4 py-3 border border-amber-300 bg-amber-50/30 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
disabled={loading}
required
/>

)}
{(regRole === 'lider' || regRole === 'cliente') && (
Asignar Proyectos / Rutas
{PROYECTOS.map(proyecto => (
<button
key={proyecto}
type="button"
onClick={() => toggleProyecto(proyecto)}
className={p-2 text-xs rounded-md border text-left transition-all ${ regProyectos.includes(proyecto) ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' }}
>
{proyecto}

))}


)}
{loading ? 'Creando cuenta...' : 'Completar Registro'}
{!loading && }


)}




);
}