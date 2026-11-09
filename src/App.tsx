import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider } from './context/ReportContext';
import Sidebar from './components/Sidebar';
import { ReactNode, useEffect } from 'react';

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

// Componente de carga visual
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
  
  // Normalización de caja para evitar que fallas por mayúsculas/minúsculas expulsen al elemento
  const rolNormalizado = currentUser.role ? currentUser.role.toLowerCase() : '';
  const rolesPermitidosNormalizados = roles.map(r => r.toLowerCase());
  
  if (!rolesPermitidosNormalizados.includes(rolNormalizado)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

// Redireccionador inteligente para la ruta raíz ("/") según el rol del usuario
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
                {/* La raíz evalúa el rol del usuario dinámicamente */}
                <Route index element={<RootRedirect />} />
                
                {/* 1. CREAR REPORTE: Sincronizado a /crear-reporte con accesos de tu matriz */}
                <Route path="crear-reporte" element={
                  <RoleRoute roles={['lider', 'operaciones', 'directiva', 'administrador', 'admin']}>
                    <NewReport />
                  </RoleRoute>
                } />
                
                {/* 2. LISTA DE REPORTES: Sincronizado a /lista-reportes incluyendo el rol cliente */}
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
                
                {/* 3. APROBACIONES DE USUARIOS: Abierto para controles internos de Operaciones, Directiva y Admin */}
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
                
                {/* 4. SEGUIMIENTO DE RUTAS: Exclusivo del Administrador Principal */}
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
                
                {/* Redirección preventiva por si se introduce un sub-path roto */}
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
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
