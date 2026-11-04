import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';

interface SidebarProps {
  role: UserRole;
  username: string;
  onLogout: () => void;
}

export default function Sidebar({ role, username, onLogout }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) => `
    flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium
    ${isActive(path) 
      ? 'bg-blue-600 text-white shadow-md' 
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
  `;

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 z-20">
      {/* Encabezado con Logo Corporativo */}
      <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-sm tracking-wide">VIP 3000 C.A.</h1>
          <p className="text-xs text-gray-500 font-medium">SecureReport PWA</p>
        </div>
      </div>

      {/* Perfil del Usuario Conectado */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Usuario activo</p>
        <p className="text-sm font-bold text-gray-800 truncate mt-0.5">{username}</p>
        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-blue-100 text-blue-800">
          {role}
        </span>
      </div>

      {/* Menú de Navegación según Rol */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Rutas compartidas por Operaciones, Directiva y Líderes */}
        {(role === 'lider' || role === 'operaciones' || role === 'directiva') && (
          <Link to="/dashboard" className={linkClass('/dashboard')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            <span>Panel General</span>
          </Link>
        )}

        {role === 'lider' && (
          <Link to="/nuevo-reporte" className={linkClass('/nuevo-reporte')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Crear Reporte</span>
          </Link>
        )}

        {/* Vista exclusiva de Monitoreo para el Administrador */}
        {role === 'administrador' && (
          <>
            <Link to="/admin" className={linkClass('/admin')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Dashboard Admin</span>
            </Link>
            <Link to="/seguimiento-rutas" className={linkClass('/seguimiento-rutas')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Seguimiento de Rutas</span>
            </Link>
          </>
        )}
      </nav>

      {/* Botón de Cierre de Sesión */}
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}