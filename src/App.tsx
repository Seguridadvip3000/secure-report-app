import React, { lazy, Suspense, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider } from './context/ReportContext';
import { notificationService } from './services/notificationService';
import Sidebar from './components/Sidebar';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const LiderHome = lazy(() => import('./pages/LiderHome'));
const SupervisorHome = lazy(() => import('./pages/SupervisorHome'));
const CecomHome = lazy(() => import('./pages/CecomHome'));
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
const EstadisticasPage = lazy(() => import('./pages/EstadisticasPage'));
const AsistenciasPage = lazy(() => import('./pages/AsistenciasPage'));
const SupervisionesPage = lazy(() => import('./pages/SupervisionesPage'));
const AsistenciaLiderPage = lazy(() => import('./pages/AsistenciaLiderPage'));
const AnalistaHome = lazy(() => import('./pages/AnalistaHome'));
const MonitorAsistenciaOperativa = lazy(() => import('./components/MonitorAsistenciaOperativa'));
const VerificacionServiciosEspecialesPage = lazy(() => import('./pages/VerificacionServiciosEspecialesPage'));
const ReclutamientoHome = lazy(() => import('./pages/ReclutamientoHome'));
const EgresadosPage = lazy(() => import('./pages/EgresadosPage'));
const ConsultaFichaTecnicaPage = lazy(() => import('./pages/ConsultaFichaTecnicaPage'));
const NominaRecibosPage = lazy(() => import('./pages/NominaRecibosPage'));

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
    case 'analista':
    case 'rrhh':
    case 'recursos_humanos':
      return <Navigate to="/home-analista" replace />;
    case 'reclutamiento':
      return <Navigate to="/home-reclutamiento" replace />;
    case 'cecom':
      return <Navigate to="/home-cecom" replace />;
    case 'supervisor':
      return <Navigate to="/home-supervisor" replace />;
    case 'cliente':
      return <Navigate to="/dashboard-cliente" replace />;
    case 'lider':
    default:
      return <LiderHome />;
  }
}

function MonitorPorRolRoute() {
  const { currentUser } = useAuth();
  const rol = (currentUser?.role || '').toLowerCase();
  if (rol === 'cecom') {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <MonitorAsistenciaOperativa modo="CECOM" titulo="Fuerza Operativa por Proyecto (CECOM)" />
      </div>
    );
  }
  if (rol === 'operaciones') {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <MonitorAsistenciaOperativa modo="OPERACIONES" titulo="Personal Operativo en Guardia (Operaciones)" />
      </div>
    );
  }
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <MonitorAsistenciaOperativa modo="DIRECTIVA" titulo="Control Completo de Asistencia por Proyecto" />
    </div>
  );
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
                  <RoleRoute roles={['lider', 'supervisor', 'cecom', 'operaciones', 'directiva', 'administrador', 'admin']}>
                    <NewReport />
                  </RoleRoute>
                } />

                <Route path="asistencia" element={
                  <RoleRoute roles={['lider', 'operaciones', 'directiva', 'administrador', 'admin']}>
                    <AsistenciaLiderPage />
                  </RoleRoute>
                } />

                <Route path="home-analista" element={
                  <RoleRoute roles={['analista', 'rrhh', 'recursos_humanos', 'operaciones', 'directiva', 'administrador', 'admin']}>
                    <AnalistaHome />
                  </RoleRoute>
                } />

                <Route path="nomina-recibos" element={
                  <RoleRoute roles={['analista', 'rrhh', 'recursos_humanos', 'directiva', 'administrador', 'admin']}>
                    <NominaRecibosPage />
                  </RoleRoute>
                } />

                <Route path="home-reclutamiento" element={
                  <RoleRoute roles={['reclutamiento', 'rrhh', 'recursos_humanos', 'directiva', 'administrador', 'admin']}>
                    <ReclutamientoHome />
                  </RoleRoute>
                } />

                <Route path="ficha-tecnica" element={
                  <RoleRoute roles={['analista', 'reclutamiento', 'rrhh', 'recursos_humanos', 'operaciones', 'directiva', 'administrador', 'admin']}>
                    <ConsultaFichaTecnicaPage />
                  </RoleRoute>
                } />

                <Route path="egresados" element={
                  <RoleRoute roles={['analista', 'reclutamiento', 'rrhh', 'recursos_humanos', 'directiva', 'administrador', 'admin']}>
                    <EgresadosPage />
                  </RoleRoute>
                } />
                
                <Route path="monitor-asistencia" element={
                  <RoleRoute roles={['cecom', 'operaciones', 'directiva', 'administrador', 'admin']}>
                    <MonitorPorRolRoute />
                  </RoleRoute>
                } />

                <Route path="verificacion-servicios-especiales" element={
                  <RoleRoute roles={['operaciones', 'analista', 'rrhh', 'recursos_humanos', 'directiva', 'administrador', 'admin']}>
                    <VerificacionServiciosEspecialesPage />
                  </RoleRoute>
                } />

                <Route path="lista-reportes" element={
                  <RoleRoute roles={['operaciones', 'cecom', 'directiva', 'administrador', 'admin', 'cliente']}>
                    <ReportList />
                  </RoleRoute>
                } />
                
                <Route path="lista-reportes/:id" element={
                  <RoleRoute roles={['lider', 'supervisor', 'cecom', 'operaciones', 'directiva', 'administrador', 'admin', 'cliente']}>
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

                <Route path="estadisticas" element={
                  <RoleRoute roles={['operaciones', 'directiva', 'administrador', 'admin']}>
                    <EstadisticasPage />
                  </RoleRoute>
                } />

                <Route path="asistencias" element={
                  <RoleRoute roles={['directiva', 'administrador', 'admin']}>
                    <AsistenciasPage />
                  </RoleRoute>
                } />

                <Route path="supervisiones" element={
                  <RoleRoute roles={['directiva', 'administrador', 'admin']}>
                    <SupervisionesPage />
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
                <Route path="home-supervisor" element={
                  <RoleRoute roles={['supervisor']}>
                    <SupervisorHome />
                  </RoleRoute>
                } />
                <Route path="home-cecom" element={
                  <RoleRoute roles={['cecom']}>
                    <CecomHome />
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
  const [diagnosticoPush, setDiagnosticoPush] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!currentUser) return;

    const enviarSesionNativa = () => {
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'SET_USER_SESSION',
            user: {
              id: currentUser.id,
              email: currentUser.email,
              role: currentUser.role,
              proyectos: currentUser.proyectos || [],
            },
          })
        );
      }
    };

    const manejarTokenDesdeApp = async (event: MessageEvent) => {
      try {
        const datos = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (datos?.type === 'NATIVE_PUSH_ERROR' && datos.error) {
          setDiagnosticoPush(`Error Push APK: ${datos.error}`);
        }
        if (datos?.type === 'NATIVE_PUSH_TOKEN' && datos.token && currentUser?.id) {
          setDiagnosticoPush(null);
          const { supabase } = await import('./lib/supabase');
          const { error } = await supabase.rpc('registrar_push_token', {
            p_user_id: currentUser.id,
            p_token: datos.token,
          });
          if (error) {
            setDiagnosticoPush(`Error guardando en Supabase: ${error.message}`);
          }
        }
      } catch (err) {
        console.error('Error guardando push token desde WebView:', err);
      }
    };

    window.addEventListener('message', manejarTokenDesdeApp);
    document.addEventListener('message', manejarTokenDesdeApp as any);

    enviarSesionNativa();
    const intervalo = setInterval(enviarSesionNativa, 5000);

    notificationService.requestPermission();
    const unsubscribe = notificationService.subscribeToUserNotifications(
      currentUser.role,
      currentUser.proyectos || []
    );

    return () => {
      clearInterval(intervalo);
      window.removeEventListener('message', manejarTokenDesdeApp);
      document.removeEventListener('message', manejarTokenDesdeApp as any);
      unsubscribe();
    };
  }, [currentUser]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 w-full pt-20 md:pt-0 overflow-y-auto">
        {diagnosticoPush && (
          <div className="bg-amber-900/90 text-amber-100 text-xs px-4 py-2 flex items-center justify-between border-b border-amber-700">
            <span>⚠️ {diagnosticoPush}</span>
            <button onClick={() => setDiagnosticoPush(null)} className="underline ml-3 font-semibold">
              Cerrar
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
