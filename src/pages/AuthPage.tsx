import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ROLE_LABELS } from '../types';
import { Shield, Phone, Mail, User, Building, Briefcase, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

type View = 'login' | 'register' | 'success';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [view, setView] = useState<View>('login');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('lider');
  const [regCompany, setRegCompany] = useState('');
  const [regPosition, setRegPosition] = useState('');

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

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (!regName || !regPhone) {
        setError('Complete todos los campos');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!regEmail) {
        setError('El email es requerido');
        return;
      }
      setStep(3);
      return;
    }

    // Step 3 - submit
    const result = register({
      name: regName,
      email: regEmail,
      phone: regPhone,
      role: regRole,
      company: regCompany,
      position: regPosition,
    });

    if (result.success) {
      setView('success');
    } else {
      setError(result.message);
    }
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
            Su solicitud ha sido enviada al administrador. Recibirá una notificación cuando su cuenta sea aprobada.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            ⏳ Tiempo estimado de aprobación: 24-48 horas
          </div>
          <button
            onClick={() => { setView('login'); setStep(1); setError(''); }}
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
              onClick={() => { setView('register'); setStep(1); setError(''); }}
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
                    placeholder="+57 300 000 0000"
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
                  <p>👑 Admin: admin@seguridad.com</p>
                  <p>🛡️ Líder: carlos@seguridad.com</p>
                  <p>📊 Operaciones: roberto@operaciones.com</p>
                  <p>👤 Cliente: ana@cliente.com</p>
                </div>
              </form>
            )}

            {/* REGISTER */}
            {view === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Progress */}
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3].map(s => (
                    <div key={s} className="flex-1">
                      <div className={`h-1.5 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 text-center mb-2">Paso {step} de 3</p>

                {step === 1 && (
                  <>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                        <User size={16} />
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                        <Phone size={16} />
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="+57 300 000 0000"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                      <Mail size={16} />
                      Correo electrónico *
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Tipo de usuario *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['lider', 'cliente', 'operaciones'] as UserRole[]).map(role => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setRegRole(role)}
                            className={`p-3 border-2 rounded-lg text-sm font-medium transition-all text-left ${
                              regRole === role
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <div className="text-lg mb-1">
                              {role === 'lider' ? '🛡️' : role === 'cliente' ? '👤' : '📊'}
                            </div>
                            {ROLE_LABELS[role]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                        <Building size={16} />
                        Empresa
                      </label>
                      <input
                        type="text"
                        value={regCompany}
                        onChange={e => setRegCompany(e.target.value)}
                        placeholder="Nombre de la empresa"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                        <Briefcase size={16} />
                        Cargo
                      </label>
                      <input
                        type="text"
                        value={regPosition}
                        onChange={e => setRegPosition(e.target.value)}
                        placeholder="Ej: Líder de Turno"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={18} />
                      Atrás
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {step < 3 ? (
                      <>Siguiente <ArrowRight size={18} /></>
                    ) : (
                      'Registrarse'
                    )}
                  </button>
                </div>
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
