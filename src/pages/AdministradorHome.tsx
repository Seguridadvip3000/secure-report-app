import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import { UserRole } from './types';

// Carga perezosa (lazy) de los componentes de páginas
const LiderHome = lazy(() => import('./pages/LiderHome'));
const OperacionesHome = lazy(() => import('./pages/OperacionesHome'));
const DirectivaHome = lazy(() => import('./pages/DirectivaHome'));
const AdministradorHome = lazy(() => import('./pages/AdministradorHome'));
const SeguimientoRutasPage = lazy(() => import('./pages/SeguimientoRutasPage'));
const NewReport = lazy(() => import('./pages/NewReport'));

// Componente para proteger las rutas basándose en roles estrictos
interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  userRole: UserRole | null;
  isAuthenticated: boolean;
}

function RoleRoute({ children, allowedRoles, userRole, isAuthenticated }: RoleRouteProps) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole && !allowedRoles.includes(userRole)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

export default function App() {
  // Simulación temporal de autenticación (Reemplazar con lógica real de Supabase)
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('administrador');
  const [username, setUsername] = useState('Keyser Hernández');

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
  };

  return (
    <Router>
      <div className="flex bg-gray-50 min-h-screen">
        {isAuthenticated && userRole && (
          <Sidebar role={userRole} username={username} onLogout={handleLogout} />
        )}
        
        <div className={`flex-1 ${isAuthenticated ? 'pl-64' : ''}`}>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          }>
            <Routes>
              {/* Ruta pública */}
              <Route path="/login" element={<AuthPage />} />

              {/* Redirección automática de la raíz según el rol del usuario */}
              <Route path="/" element={
                isAuthenticated 
                  ? userRole === 'administrador' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
                  : <Navigate to="/login" replace />
              } />

              {/* Paneles generales protegidos */}
              <Route path="/dashboard" element={
                <RoleRoute isAuthenticated={isAuthenticated} userRole={userRole} allowedRoles={['lider', 'operaciones', 'directiva']}>
                  {userRole === 'lider' && <LiderHome />}
                  {userRole === 'operaciones' && <OperacionesHome />}
                  {userRole === 'directiva' && <DirectivaHome />}
                </RoleRoute>
              } />

              <Route path="/nuevo-reporte" element={
                <RoleRoute isAuthenticated={isAuthenticated} userRole={userRole} allowedRoles={['lider']}>
                  <NewReport />
                </RoleRoute>
              } />

              {/* Rutas exclusivas del Rol Administrador */}
              <Route path="/admin" element={
                <RoleRoute isAuthenticated={isAuthenticated} userRole={userRole} allowedRoles={['administrador']}>
                  <AdministradorHome />
                </RoleRoute>
              } />

              <Route path="/seguimiento-rutas" element={
                <RoleRoute isAuthenticated={isAuthenticated} userRole={userRole} allowedRoles={['administrador']}>
                  <SeguimientoRutasPage />
                </RoleRoute>
              } />

              {/* Ruta de Contingencia para accesos denegados */}
              <Route path="/unauthorized" element={
                <div className="min-h-screen flex flex-col items-center justify-center p-4">
                  <h1 className="text-2xl font-bold text-red-600">Acceso No Autorizado</h1>
                  <p className="text-gray-500 mt-2 text-center">Tu rol actual no tiene privilegios para ingresar a este panel.</p>
                </div>
              } />

              {/* Captura de rutas inexistentes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  );
}