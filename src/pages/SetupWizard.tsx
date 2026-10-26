import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializationService } from '../services/initializationService';
import { useAuth } from '../context/AuthContext';
import { Database, CheckCircle, AlertCircle, Loader, Shield } from 'lucide-react';

export default function SetupWizard() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<'checking' | 'ready' | 'initializing' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    setStatus('checking');
    setMessage('Verificando base de datos...');

    try {
      const empty = await initializationService.checkIfDatabaseIsEmpty();
      setIsEmpty(empty);

      if (empty) {
        setStatus('ready');
        setMessage('La base de datos está vacía. Se necesitan insertar los datos de prueba.');
      } else {
        setStatus('success');
        setMessage('La base de datos ya tiene datos. Redirigiendo...');
        setTimeout(() => navigate('/auth'), 2000);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Error al verificar la base de datos. Por favor, intenta nuevamente.');
    }
  };

  const handleInitialize = async () => {
    setStatus('initializing');
    setMessage('Insertando datos de prueba en Supabase...');

    try {
      const result = await initializationService.initializeAllData();

      if (result.success) {
        setStatus('success');
        setMessage(`✅ ${result.usersCount} usuarios y ${result.reportsCount} reportes insertados exitosamente`);
        
        // Esperar 2 segundos y redirigir al login
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      } else {
        setStatus('error');
        setMessage(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleQuickLogin = async (email: string) => {
    const result = await login(email, '');
    if (result.success) {
      navigate('/');
    } else {
      setMessage(`❌ ${result.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Shield size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Configuración Inicial</h1>
          <p className="text-slate-500 mt-2">Preparando la base de datos de SecureReport</p>
        </div>

        {/* Status Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            {status === 'checking' && (
              <>
                <Loader size={32} className="animate-spin text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-800">Verificando...</h3>
                  <p className="text-sm text-slate-600 mt-1">{message}</p>
                </div>
              </>
            )}

            {status === 'ready' && (
              <>
                <Database size={32} className="text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">Base de Datos Vacía</h3>
                  <p className="text-sm text-slate-600 mt-1">{message}</p>
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Se insertarán los siguientes datos:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>✓ 7 usuarios de prueba (Directiva, Operaciones, Líderes, Clientes)</li>
                      <li>✓ 5 reportes de ejemplo con diferentes estados</li>
                      <li>✓ Todos los usuarios estarán en estado "aprobado"</li>
                    </ul>
                  </div>
                </div>
              </>
            )}

            {status === 'initializing' && (
              <>
                <Loader size={32} className="animate-spin text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-800">Inicializando...</h3>
                  <p className="text-sm text-slate-600 mt-1">{message}</p>
                  <p className="text-xs text-slate-500 mt-2">Esto puede tomar unos segundos</p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle size={32} className="text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-800">¡Configuración Completada!</h3>
                  <p className="text-sm text-green-700 mt-1">{message}</p>
                  <p className="text-xs text-slate-500 mt-2">Redirigiendo al inicio de sesión...</p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <AlertCircle size={32} className="text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{message}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {status === 'ready' && (
          <div className="space-y-3">
            <button
              onClick={handleInitialize}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Database size={20} />
              Inicializar Base de Datos
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="w-full border border-slate-200 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Ir al Inicio de Sesión
            </button>
          </div>
        )}

        {status === 'success' && isEmpty && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 text-center mb-4">
              Puedes iniciar sesión con cualquiera de estos usuarios:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickLogin('directiva@seguridad.com')}
                className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                👑 Directiva
              </button>
              <button
                onClick={() => handleQuickLogin('roberto@operaciones.com')}
                className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
              >
                📊 Operaciones
              </button>
              <button
                onClick={() => handleQuickLogin('carlos@seguridad.com')}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                🛡️ Líder
              </button>
              <button
                onClick={() => handleQuickLogin('ana@cliente.com')}
                className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
              >
                👤 Cliente
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <button
              onClick={checkDatabase}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="w-full border border-slate-200 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Ir al Inicio de Sesión
            </button>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-800 mb-2">¿Problemas?</h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Asegúrate de haber ejecutado el script SQL en Supabase</li>
            <li>• Verifica que las credenciales en .env sean correctas</li>
            <li>• Revisa la consola del navegador (F12) para más detalles</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
