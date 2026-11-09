import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider } from './context/ReportContext';
import Sidebar from './components/Sidebar';
import { ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { AlertOctagon, X, MapPin, Battery } from 'lucide-react';

// Lazy load de todos los componentes de páginas
const AuthPage = lazy(() => import('./pages/AuthPage'));
const LiderHome = lazy(() => import('./pages/LiderHome'));
const ClienteDashboard = lazy(() => import('./pages/ClienteDashboard'));
const OperacionesHome = lazy(() => import('./pages/OperacionesHome'));
const DirectivaHome = lazy(() => import('./pages/DirectivaHome'));
const AdministradorHome = lazy(() => import('./pages/AdministradorHome'));
const NewReport = lazy(() => import('./pages/NewReport'));
const ReportList = lazy(() => import('./pages/ReportList'));
const ReportDetail = lazy(() => import('./pages/ReportDetail'));
const AprobacionesPage = lazy(() => import('./pages/AprobacionesPage'));
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage'));
const SeguimientoRutasPage = lazy(() => import('./pages/SeguimientoRutasPage'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Cargando...</p>
      </div>
    </div>
  );
}
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (currentUser.status !== 'aprobado') return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/auth" replace />;
  
  const rolNormalizado = currentUser.role ? currentUser.role.toLowerCase() : '';
  const rolesPermitidosNormalizados = roles.map(r => r.toLowerCase());
  
  if (!rolesPermitidosNormalizados.includes(rolNormalizado)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/auth" replace />;
  
  const rolNormalizado = currentUser.role ? currentUser.role.toLowerCase() : '';
  
  switch (rolNormalizado) {
    case 'admin':
    case 'administrador':
      return <Navigate to="/home-admin" replace />;
    case 'directiva':
      return <Navigate to="/home-directiva" replace />;
    case 'operaciones':
      return <Navigate to="/home-operaciones" replace />;
    case 'cliente':
      return <Navigate to="/dashboard-cliente" replace />;
    case 'lider':
    default:
      return <LiderHome />;
  }
}
export default function App() {
  return (
    <AuthProvider>
      <ReportProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<RootRedirect />} />
                
                <Route path="crear-reporte" element={
                  <RoleRoute roles={['lider', 'operaciones', 'directiva', 'administrador', 'admin']}>
                    <NewReport />
                  </RoleRoute>
                } />
                
                <Route path="lista-reportes" element={
                  <RoleRoute roles={['operaciones', 'directiva', 'administrador', 'admin', 'cliente']}>
                    <ReportList />
                  </RoleRoute>
                } />
                
                <Route path="lista-reportes/:id" element={
                  <RoleRoute roles={['lider', 'operaciones', 'directiva', 'administrador', 'admin', 'cliente']}>
                    <ReportDetail />
                  </RoleRoute>
                } />
                
                <Route path="aprobaciones" element={
                  <RoleRoute roles={['operaciones', 'directiva', 'administrador', 'admin']}>
                    <AprobacionesPage />
                  </RoleRoute>
                } />
                
                <Route path="configuracion" element={
                  <RoleRoute roles={['directiva', 'administrador', 'admin']}>
                    <ConfiguracionPage />
                  </RoleRoute>
                } />
                
                <Route path="seguimiento-rutas" element={
                  <RoleRoute roles={['administrador', 'admin']}>
                    <SeguimientoRutasPage />
                  </RoleRoute>
                } />
                <Route path="dashboard-cliente" element={
                  <RoleRoute roles={['cliente']}>
                    <ClienteDashboard />
                  </RoleRoute>
                } />
                <Route path="home-operaciones" element={
                  <RoleRoute roles={['operaciones']}>
                    <OperacionesHome />
                  </RoleRoute>
                } />
                <Route path="home-directiva" element={
                  <RoleRoute roles={['directiva']}>
                    <DirectivaHome />
                  </RoleRoute>
                } />
                <Route path="home-admin" element={
                  <RoleRoute roles={['administrador', 'admin']}>
                    <AdministradorHome />
                  </RoleRoute>
                } />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ReportProvider>
    </AuthProvider>
  );
}

function Layout() {
  const { currentUser } = useAuth();
  const [alertaEmergencia, setAlertaEmergencia] = useState<any>(null);

  useEffect(() => {
    if (!currentUser) return;

    const rolActual = currentUser.role ? currentUser.role.toLowerCase() : '';
    const proyectoUsuario = currentUser.proyecto_id || '';

    // CANAL UNIFICADO: Escucha Broadcast Directo + Cambios en la Base de Datos en paralelo
    const canalPanicoVIP3000 = supabase
      .channel('alertas-panico-global')
      // 1. Escucha de Broadcast Directo (Mensajería instantánea entre clientes)
      .on('broadcast', { event: 'SOS_EMERGENCIA' }, (response) => {
        const datosSOS = response.payload;
        const esPersonalInterno = ['administrador', 'admin', 'directiva', 'operaciones'].includes(rolActual);
        const esClienteAfectado = rolActual === 'cliente' && datosSOS.proyecto_id === proyectoUsuario;

        if (esPersonalInterno || esClienteAfectado) {
          setAlertaEmergencia(datosSOS);
          dispararAlarmaSonora();
        }
      })
      // 2. Escucha de Cambios en Tablas (Inserciones en reports)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
          const nuevoReporte = payload.new;
          const esAlertaPanico = nuevoReporte.titulo_novedad && nuevoReporte.titulo_novedad.includes('PÁNICO');

          if (esAlertaPanico) {
            const esPersonalInterno = ['administrador', 'admin', 'directiva', 'operaciones'].includes(rolActual);
            const esClienteAfectado = rolActual === 'cliente' && nuevoReporte.proyecto === proyectoUsuario;

            if (esPersonalInterno || esClienteAfectado) {
              setAlertaEmergencia({
                nombre_completo: nuevoReporte.quien_reporta || 'Líder en Ruta',
                proyecto_id: nuevoReporte.proyecto || 'Zona Operativa VIP 3000',
                latitude: 10.4914,
                longitude: -66.8486,
                bateria: 95,
                fecha_alerta: nuevoReporte.created_at || new Date().toISOString()
              });
              dispararAlarmaSonora();
            }
          }
        }
      )
      .subscribe();

    const dispararAlarmaSonora = () => {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = context.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(587.33, context.currentTime);
        osc.connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.6);
      } catch (e) {
        console.warn('Audio en espera de interacción');
      }
    };

    return () => {
      supabase.removeChannel(canalPanicoVIP3000);
    };
  }, [currentUser]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* MODAL MAESTRO FLOTANTE DE ALERTA DE PÁNICO CRÍTICA */}
      {alertaEmergencia && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border-4 border-red-600 max-w-md w-full overflow-hidden">
            <div className="bg-red-600 p-4 text-white flex items-center gap-2 animate-pulse">
              <AlertOctagon size={28} />
              <h3 className="text-lg font-black tracking-wider uppercase">¡ALERTA MÁXIMA S.O.S!</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-slate-700 text-sm font-medium">
                Un elemento operativo ha activado el botón de pánico de emergencia en tiempo real. Se requiere asistencia perimetral inmediata.
              </p>
              <div className="bg-slate-50 border rounded-xl p-3 text-xs text-slate-600 space-y-1.5">
                <div><strong>Elemento:</strong> <span className="text-slate-900 font-bold">{alertaEmergencia.nombre_completo}</span></div>
                <div><strong>Proyecto / Ruta:</strong> <span className="text-blue-600 font-bold">{alertaEmergencia.proyecto_id}</span></div>
                <div className="flex items-center gap-1"><strong>Coordenadas:</strong> <MapPin size={12} /> {alertaEmergencia.latitude}, {alertaEmergencia.longitude}</div>
                <div className="flex items-center gap-1"><strong>Nivel Batería:</strong> <Battery size={12} /> {alertaEmergencia.bateria}%</div>
                <div><strong>Transmisión Satelital:</strong> {new Date(alertaEmergencia.fecha_alerta).toLocaleTimeString()}</div>
              </div>
              <button 
                onClick={() => setAlertaEmergencia(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
              >
                <X size={16} /> Ocultar Alerta de Emergencia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
