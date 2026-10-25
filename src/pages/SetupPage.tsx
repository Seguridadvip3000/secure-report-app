import { useState } from 'react';
import { migrateIfNeeded, checkIfDataExists } from '../scripts/migrateInitialData';
import { Shield, Database, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function SetupPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSetup = async () => {
    setStatus('checking');
    setMessage('Verificando datos existentes...');

    try {
      const exists = await checkIfDataExists();
      
      if (exists) {
        setStatus('success');
        setMessage('✓ Los datos ya están configurados en Supabase');
        return;
      }

      setStatus('migrating');
      setMessage('Migrando datos iniciales...');

      const success = await migrateIfNeeded();

      if (success) {
        setStatus('success');
        setMessage('✓ Datos migrados exitosamente a Supabase');
      } else {
        setStatus('error');
        setMessage('❌ Error al migrar los datos');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Shield size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Configuración Inicial</h1>
          <p className="text-slate-500 mt-2">Configura los datos iniciales en Supabase</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">¿Qué se migrará?</h2>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Usuario Directiva inicial</li>
            <li>• Usuarios de prueba (Líder, Operaciones, Cliente)</li>
            <li>• Reportes de ejemplo</li>
          </ul>
        </div>

        <div className="space-y-4">
          {status === 'idle' && (
            <button
              onClick={handleSetup}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Database size={20} />
              Iniciar Configuración
            </button>
          )}

          {status === 'checking' && (
            <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Loader size={24} className="animate-spin text-blue-600" />
              <span className="text-blue-700">{message}</span>
            </div>
          )}

          {status === 'migrating' && (
            <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Loader size={24} className="animate-spin text-blue-600" />
              <span className="text-blue-700">{message}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center justify-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle size={24} className="text-green-600" />
              <span className="text-green-700">{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center justify-center gap-3 p-4 bg-red-50 rounded-lg">
              <AlertCircle size={24} className="text-red-600" />
              <span className="text-red-700">{message}</span>
            </div>
          )}

          {(status === 'success' || status === 'error') && (
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Ir a la Aplicación
              </button>
              {status === 'error' && (
                <button
                  onClick={() => { setStatus('idle'); setMessage(''); }}
                  className="w-full border border-slate-200 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Intentar Nuevamente
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> Asegúrate de haber ejecutado el script SQL en Supabase antes de continuar.
            Si no lo has hecho, ve a <code className="bg-amber-100 px-1 rounded">SUPABASE_SETUP.md</code> para instrucciones.
          </p>
        </div>
      </div>
    </div>
  );
}
