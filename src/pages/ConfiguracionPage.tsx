import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportContext';
import { PROYECTOS } from '../data/constants';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import { ArrowLeft, Lock, Settings, Users, FileText, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const CONFIG_PASSWORD = 'SeguridadVip3OOO';

export default function ConfiguracionPage() {
  const { users, deleteUser, approveUser } = useAuth();
  const { reports, deleteReport } = useReports();
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CONFIG_PASSWORD) {
      setAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Clave incorrecta');
    }
  };

  if (!authenticated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
            <p className="text-slate-500">Panel de control avanzado</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Acceso Protegido</h2>
            <p className="text-sm text-slate-500 mt-1">Ingrese la clave de administrador</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Clave de acceso"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-lg"
              />
              {passwordError && (
                <p className="text-xs text-red-500 mt-1 text-center">{passwordError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Acceder
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Settings size={24} />
              Panel de Configuración
            </h1>
            <p className="text-slate-500">Administración avanzada del sistema</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'users'
                ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={16} />
            Usuarios ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'reports'
                ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={16} />
            Reportes ({reports.length})
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>Gestión de Usuarios:</strong> Puede eliminar usuarios o reasignar proyectos.
              </div>
              <div className="divide-y divide-slate-100">
                {users.map(user => (
                  <div key={user.id} className="py-3 flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-600">
                        {user.nombre_completo.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-slate-800">{user.nombre_completo}</h3>
                          <p className="text-xs text-slate-500">{user.email} • @{user.username}</p>
                          {user.proyectos && user.proyectos.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {user.proyectos.map(p => (
                                <span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium border ${ROLE_COLORS[user.role]}`}>
                            {ROLE_LABELS[user.role]}
                          </span>
                          {user.role !== 'directiva' && (
                            <button
                              onClick={() => { if (confirm(`¿Eliminar a ${user.nombre_completo}?`)) deleteUser(user.id); }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>Gestión de Reportes:</strong> Puede eliminar reportes existentes.
              </div>
              <div className="divide-y divide-slate-100">
                {reports.map(report => (
                  <div key={report.id} className="py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-slate-800">{report.tituloNovedad}</h3>
                          <p className="text-xs text-slate-500">{report.proyecto}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {format(parseISO(report.fechaHora), "dd MMM yyyy, HH:mm", { locale: es })}
                          </p>
                        </div>
                        <button
                          onClick={() => { if (confirm('¿Eliminar este reporte?')) deleteReport(report.id); }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
