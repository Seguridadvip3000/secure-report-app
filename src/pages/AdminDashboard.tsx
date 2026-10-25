import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportContext';
import { UserStatus, UserRole, ROLE_LABELS, ROLE_COLORS } from '../types';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminDashboard() {
  const { users, pendingUsers, approvedUsers, approveUser, rejectUser, deleteUser } = useAuth();
  const { reports } = useReports();
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [rejectModal, setRejectModal] = useState<{ userId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleReject = () => {
    if (rejectModal && rejectReason.trim()) {
      rejectUser(rejectModal.userId, rejectReason);
      setRejectModal(null);
      setRejectReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={24} />
          <h1 className="text-xl font-bold">Panel de Administración</h1>
        </div>
        <p className="text-red-100">
          Gestione usuarios y supervise el sistema de reportes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <Users size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{users.length}</p>
          <p className="text-xs text-slate-500">Total Usuarios</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-yellow-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{pendingUsers.length}</p>
          <p className="text-xs text-slate-500">Pendientes Aprobación</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <UserCheck size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{approvedUsers.length}</p>
          <p className="text-xs text-slate-500">Usuarios Activos</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="bg-purple-50 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
            <FileText size={20} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{reports.length}</p>
          <p className="text-xs text-slate-500">Total Reportes</p>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={18} className="text-amber-600" />
            <h2 className="font-semibold text-amber-800">
              {pendingUsers.length} usuario(s) esperando aprobación
            </h2>
          </div>
          <p className="text-sm text-amber-600">Revise y apruebe los nuevos registros</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'pending'
                ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock size={16} />
            Pendientes ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'all'
                ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={16} />
            Todos ({users.length})
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {activeTab === 'pending' && pendingUsers.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
              <p className="font-medium">No hay usuarios pendientes</p>
              <p className="text-sm">Todos los registros han sido procesados</p>
            </div>
          )}

          {(activeTab === 'pending' ? pendingUsers : users).map(user => (
            <div key={user.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-slate-600">
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-slate-800">{user.name}</h3>
                      <p className="text-xs text-slate-500">{user.email} • {user.phone}</p>
                      {user.company && (
                        <p className="text-xs text-slate-400">{user.company} {user.position ? `• ${user.position}` : ''}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium border ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Registrado: {format(parseISO(user.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                  </p>

                  {user.status === 'pendiente' && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => approveUser(user.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <CheckCircle size={14} />
                        Aprobar
                      </button>
                      <button
                        onClick={() => setRejectModal({ userId: user.id, name: user.name })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 transition-colors font-medium"
                      >
                        <XCircle size={14} />
                        Rechazar
                      </button>
                    </div>
                  )}

                  {user.status === 'rechazado' && user.rejectionReason && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                      <strong>Motivo:</strong> {user.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Delete button for non-admin users */}
              {user.role !== 'administrador' && (
                <div className="mt-2 flex justify-end">
                  {deleteConfirm === user.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600">¿Eliminar?</span>
                      <button
                        onClick={() => { deleteUser(user.id); setDeleteConfirm(null); }}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(user.id)}
                      className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Rechazar usuario</h3>
            <p className="text-sm text-slate-500 mb-4">
              Indique el motivo para rechazar a <strong>{rejectModal.name}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo..."
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
