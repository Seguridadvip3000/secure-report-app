import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider } from './context/ReportContext';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import LiderHome from './pages/LiderHome';
import ClienteDashboard from './pages/ClienteDashboard';
import OperacionesHome from './pages/OperacionesHome';
import DirectivaHome from './pages/DirectivaHome';
import NewReport from './pages/NewReport';
import ReportList from './pages/ReportList';
import ReportDetail from './pages/ReportDetail';
import AprobacionesPage from './pages/AprobacionesPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import { ReactNode } from 'react';

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
  const { currentUser } = useAuth();

  if (!currentUser || currentUser.status !== 'aprobado') {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto pt-12 lg:pt-0">
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
