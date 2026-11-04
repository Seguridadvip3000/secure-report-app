import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import { ArrowLeft, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AprobacionesPage() {
  const { user: currentUser, pendingUsers, approveUser, rejectUser } = useAuth();
  const navigate = useNavigate();
  const [rejectModal, setRejectModal] = useState<{ userId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // VALIDACIÓN DE SEGURIDAD EXCLUSIVA: Solo el rol 'admin' puede interactuar o visualizar esta sección
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-sm">
          <ShieldAlert size={36} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-slate-500 max-w-md">
          Lo sentimos, solo el **Administrador Principal** del sistema posee los privilegios requeridos para autorizar o rechazar solicitudes de registro.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
        >
          Regresar a un lugar seguro
        </button>
      </div>
    );
  }

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
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Aprobaciones de Usuarios</h1>
          <p className="text-slate-500">Revise y apruebe los nuevos registros</p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-amber-600" />
          <p className="font-semibold text-amber-800">
            {pendingUsers.length} usuario(s) esperando aprobación
          </p>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {pendingUsers.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
            <h3 className="text-lg font-medium text-slate-600">No hay usuarios pendientes</h3>
            <p className="text-slate-400 mt-1">Todos los registros han sido procesados</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingUsers.map(user => (
              <div key={user.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-slate-600">
                      {user.nombre_completo.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-800 text-lg">{user.nombre_completo}</h3>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
                          <span>👤 @{user.username}</span>
                          <span>📧 {user.email}</span>
                        </div>
                        {user.proyectos && user.proyectos.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {user.proyectos.map(p => (
                              <span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Registrado: {format(parseISO(user.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approveUser(user.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <CheckCircle size={16} />
                        Aprobar
                      </button>
                      <button
                        onClick={() => setRejectModal({ userId: user.id, name: user.nombre_completo })}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors font-medium"
                      >
                        <XCircle size={16} />
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none mb-4"
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