import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Database, ArrowLeft } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'pending';
  message: string;
}

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (index: number, result: Partial<TestResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...result } : r));
  };

  const runDiagnostics = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Verificar conexión a Supabase
    const test1Index = results.length;
    addResult({ name: 'Conexión a Supabase', status: 'pending', message: 'Verificando...' });
    
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        updateResult(test1Index, { status: 'error', message: `Error: ${error.message}` });
      } else {
        updateResult(test1Index, { status: 'success', message: 'Conexión exitosa' });
      }
    } catch (error) {
      updateResult(test1Index, { status: 'error', message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}` });
    }

    // Test 2: Verificar tabla users
    const test2Index = results.length;
    addResult({ name: 'Tabla users', status: 'pending', message: 'Verificando...' });
    
    try {
      const { data, error } = await supabase.from('users').select('*').limit(1);
      if (error) {
        updateResult(test2Index, { status: 'error', message: `Error: ${error.message}` });
      } else {
        updateResult(test2Index, { status: 'success', message: 'Tabla existe y es accesible' });
      }
    } catch (error) {
      updateResult(test2Index, { status: 'error', message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}` });
    }

    // Test 3: Verificar tabla reports
    const test3Index = results.length;
    addResult({ name: 'Tabla reports', status: 'pending', message: 'Verificando...' });
    
    try {
      const { data, error } = await supabase.from('reports').select('*').limit(1);
      if (error) {
        updateResult(test3Index, { status: 'error', message: `Error: ${error.message}` });
      } else {
        updateResult(test3Index, { status: 'success', message: 'Tabla existe y es accesible' });
      }
    } catch (error) {
      updateResult(test3Index, { status: 'error', message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}` });
    }

    // Test 4: Contar usuarios existentes
    const test4Index = results.length;
    addResult({ name: 'Usuarios en base de datos', status: 'pending', message: 'Contando...' });
    
    try {
      const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (error) {
        updateResult(test4Index, { status: 'error', message: `Error: ${error.message}` });
      } else {
        updateResult(test4Index, { status: 'success', message: `${count || 0} usuarios encontrados` });
      }
    } catch (error) {
      updateResult(test4Index, { status: 'error', message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}` });
    }

    // Test 5: Intentar insertar usuario de prueba
    const test5Index = results.length;
    addResult({ name: 'Insertar usuario de prueba', status: 'pending', message: 'Intentando...' });
    
    try {
      const testEmail = `test_${Date.now()}@example.com`;
      const { data, error } = await supabase.from('users').insert([{
        name: 'Usuario de Prueba',
        email: testEmail,
        phone: '+58 999 999 9999',
        role: 'lider',
        status: 'pendiente',
        proyectos: []
      }]).select().single();

      if (error) {
        updateResult(test5Index, { status: 'error', message: `Error: ${error.message}` });
      } else {
        updateResult(test5Index, { status: 'success', message: `Usuario creado: ${data.id}` });
        
        // Eliminar el usuario de prueba
        await supabase.from('users').delete().eq('id', data.id);
      }
    } catch (error) {
      updateResult(test5Index, { status: 'error', message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}` });
    }

    setTesting(false);
  };

  const createTestUsers = async () => {
    setTesting(true);
    addResult({ name: 'Creando usuarios de prueba', status: 'pending', message: 'Insertando...' });
    
    const testUsers = [
      {
        name: 'Carlos Martínez',
        email: 'carlos@seguridad.com',
        phone: '+58 414 123 4567',
        role: 'lider',
        proyectos: ['ESTACIONAMIENTO CCCT', 'COMERCIO CCCT', 'HOTEL CCT']
      },
      {
        name: 'Roberto Sánchez',
        email: 'roberto@operaciones.com',
        phone: '+58 414 345 6789',
        role: 'operaciones',
        proyectos: []
      },
      {
        name: 'Ana García',
        email: 'ana@cliente.com',
        phone: '+58 414 456 7890',
        role: 'cliente',
        proyectos: ['ESTACIONAMIENTO CCCT', 'COMERCIO CCCT']
      },
      {
        name: 'María Rodríguez',
        email: 'directiva@seguridad.com',
        phone: '+58 414 000 0000',
        role: 'directiva',
        proyectos: []
      }
    ];

    let created = 0;
    let errors = 0;

    for (const user of testUsers) {
      try {
        // Verificar si ya existe
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (existing) {
          console.log(`Usuario ${user.email} ya existe`);
          continue;
        }

        // Crear usuario
        const { data, error } = await supabase.from('users').insert([user]).select().single();
        
        if (error) {
          console.error(`Error creando ${user.email}:`, error);
          errors++;
        } else {
          // Aprobar automáticamente
          await supabase.from('users').update({
            status: 'aprobado',
            approved_at: new Date().toISOString(),
            approved_by: 'system'
          }).eq('id', data.id);
          
          created++;
          console.log(`✅ Usuario creado: ${user.email}`);
        }
      } catch (error) {
        console.error(`Error con ${user.email}:`, error);
        errors++;
      }
    }

    const lastIndex = results.length - 1;
    if (errors > 0) {
      updateResult(lastIndex, { 
        status: 'error', 
        message: `${created} creados, ${errors} errores` 
      });
    } else {
      updateResult(lastIndex, { 
        status: 'success', 
        message: `${created} usuarios creados exitosamente` 
      });
    }

    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Diagnóstico de Supabase</h1>
            <p className="text-slate-500 text-sm">Verifica la conexión y estado de la base de datos</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={runDiagnostics}
            disabled={testing}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <Loader size={20} className="animate-spin" />
                Ejecutando diagnósticos...
              </>
            ) : (
              <>
                <Database size={20} />
                Ejecutar Diagnósticos
              </>
            )}
          </button>

          <button
            onClick={createTestUsers}
            disabled={testing}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <Loader size={20} className="animate-spin" />
                Creando usuarios...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Crear Usuarios de Prueba
              </>
            )}
          </button>

          {results.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 mb-3">Resultados:</h3>
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-3">
                  {result.status === 'pending' && (
                    <Loader size={20} className="animate-spin text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  {result.status === 'success' && (
                    <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  )}
                  {result.status === 'error' && (
                    <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{result.name}</p>
                    <p className={`text-sm ${
                      result.status === 'success' ? 'text-green-600' :
                      result.status === 'error' ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-800 mb-2">Instrucciones:</h3>
            <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
              <li>Haz clic en "Ejecutar Diagnósticos" para verificar la conexión</li>
              <li>Si todo está bien, haz clic en "Crear Usuarios de Prueba"</li>
              <li>Ve a la página de login e intenta iniciar sesión</li>
              <li>Abre la consola del navegador (F12) para ver logs detallados</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
