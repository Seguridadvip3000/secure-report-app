import React, { lazy, Suspense, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider } from './context/ReportContext';
import { notificationService } from './services/notificationService';
import Sidebar from './components/Sidebar';

// Lazy load de todos los componentes de páginas para optimizar rendimiento
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
                
                {/* 1. CREAR REPORTE */}
                <Route path="crear-reporte" element={
                  <RoleRoute roles={['lider', 'operaciones', 'directiva', 'administrador', 'admin']}>
                    <NewReport />
                  </RoleRoute>
                } />
                
                {/* 2. LISTA DE REPORTES */}
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
                
                {/* 3. APROBACIONES DE USUARIOS */}
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
                {/* 4. SEGUIMIENTO DE RUTAS */}
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

  React.useEffect(() => {
    if (!currentUser) return;
    notificationService.requestPermission();
    const unsubscribe = notificationService.subscribeToUserNotifications(
      currentUser.role,
      currentUser.proyectos || []
    );
    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 w-full pt-20 md:pt-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
