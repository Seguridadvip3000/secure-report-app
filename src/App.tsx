import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider, useReports } from './context/ReportContext';
import Sidebar from './components/Sidebar';
import { ReactNode } from 'react';

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

// Componente de carga
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
  
  // CONTROL DE SEGURIDAD: Evita el inicio de sesión a usuarios directiva desaprobados
  if (currentUser.role === 'directiva' && currentUser.is_approved === false) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (!roles.includes(currentUser.role)) return <Navigate to="/" replace />;
  
  return <>{children}</>;
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
                <Route index element={
                  <RoleRoute roles={['lider']}>
                    <LiderHome />
                  </RoleRoute>
                } />
                <Route path="nuevo" element={
                  <RoleRoute roles={['lider', 'operaciones', 'directiva', 'administrador']}>
                    <NewReport />
                  </RoleRoute>
                } />
                <Route path="reportes" element={
                  <RoleRoute roles={['operaciones', 'directiva', 'administrador']}>
                    <ReportList />
                  </RoleRoute>
                } />
                <Route path="reportes/:id" element={
                  <RoleRoute roles={['lider', 'operaciones', 'directiva', 'administrador', 'cliente']}>
                    <ReportDetail />
                  </RoleRoute>
                } />
                {/* REQUERIMIENTO COMPLETO: Solo el rol administrador puede autorizar y acceder */}
                <Route path="aprobaciones" element={
                  <RoleRoute roles={['administrador']}>
                    <AprobacionesPage />
                  </RoleRoute>
                } />
                <Route path="configuracion" element={
                  <RoleRoute roles={['directiva', 'administrador']}>
                    <ConfiguracionPage />
                  </Route>
                } />
                <Route path="seguimiento-rutas" element={
                  <RoleRoute roles={['administrador']}>
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
                  <RoleRoute roles={['administrador']}>
                    <AdministradorHome />
                  </RoleRoute>
                } />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ReportProvider>
    </AuthProvider>
  );
}

function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}