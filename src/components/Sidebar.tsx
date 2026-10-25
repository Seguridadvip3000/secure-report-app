import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  List,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/nuevo', icon: FilePlus, label: 'Nuevo Reporte' },
    { to: '/reportes', icon: List, label: 'Reportes' },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-slate-800 text-white p-2 rounded-lg shadow-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">SecureReport</h1>
              <p className="text-xs text-slate-400">Gestión de Novedades</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {links.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <link.icon size={20} />
                <span className="font-medium">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">GU</span>
            </div>
            <div>
              <p className="text-sm font-medium">Guardia de Turno</p>
              <p className="text-xs text-slate-400">Turno Activo</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
