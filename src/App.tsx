import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
const NewReport = lazy(() => import('./pages/NewReport'));
const ReportList = lazy(() => import('./pages/ReportList'));
const ReportDetail = lazy(() => import('./pages/ReportDetail'));
const AprobacionesPage = lazy(() => import('./pages/AprobacionesPage'));
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage'));

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
  return <>{children}</>;
}

function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (!roles.includes(currentUser.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { currentUser, loading: authLoading } = useAuth();
  const { loading: reportsLoading } = useReports();

  // Show loading screen while data is being fetched
  if (authLoading || reportsLoading) {
    return <LoadingScreen />;
  }

  if (!currentUser || currentUser.status !== 'aprobado') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto pt-12 lg:pt-0">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Home - role-based routing */}
              <Route path="/" element={
                <ProtectedRoute>
                  {currentUser.role === 'lider' && <LiderHome />}
                  {currentUser.role === 'operaciones' && <OperacionesHome />}
                  {currentUser.role === 'cliente' && <ClienteDashboard />}
                  {currentUser.role === 'directiva' && <DirectivaHome />}
                </ProtectedRoute>
              } />

              {/* New Report - Lider, Operaciones, Directiva */}
              <Route path="/nuevo" element={
                <RoleRoute roles={['lider', 'operaciones', 'directiva']}>
                  <NewReport />
                </RoleRoute>
              } />

              {/* Report List - Operaciones, Directiva */}
              <Route path="/reportes" element={
                <RoleRoute roles={['operaciones', 'directiva']}>
                  <ReportList />
                </RoleRoute>
              } />

              {/* Aprobaciones - Directiva only */}
              <Route path="/aprobaciones" element={
                <RoleRoute roles={['directiva']}>
                  <AprobacionesPage />
                </RoleRoute>
              } />

              {/* Configuración - Directiva only */}
              <Route path="/configuracion" element={
                <RoleRoute roles={['directiva']}>
                  <ConfiguracionPage />
                </RoleRoute>
              } />

              {/* Report Detail - all roles (with internal permission check) */}
              <Route path="/reportes/:id" element={
                <ProtectedRoute>
                  <ReportDetail />
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ReportProvider>
          <AppRoutes />
        </ReportProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
