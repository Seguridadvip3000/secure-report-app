import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { RefreshCw, X, Edit, Trash2, Save, Eye, EyeOff, FileText, Send, CheckCircle } from 'lucide-react';

interface Reporte {
  id: string;
  titulo_novedad: string;
  desarrollo?: string;
  proyecto: string;
  status: string;
  visible_for_client?: boolean;
  created_at: string;
}

export default function ReportList() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [idReporteEditando, setIdReporteEditando] = useState<string | null>(null);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoDesarrollo, setNuevoDesarrollo] = useState('');
  const [nuevoProyecto, setNuevoProyecto] = useState('');
  const [nuevoStatus, setNuevoStatus] = useState('');
  const [nuevaVisibilidadCliente, setNuevaVisibilidadCliente] = useState(false);

  const rol = currentUser?.role?.toLowerCase() || '';

  const cargarReportes = async () => {
    setLoading(true);
    try {
      let query = supabase.from('reports').select('*').order('created_at', { ascending: false });

      if (rol === 'cliente') {
        const misProyectos = Array.isArray(currentUser?.proyectos) ? currentUser.proyectos : [];
        if (misProyectos.length === 0) {
          setReportes([]);
          setLoading(false);
          return;
        }
        query = query
          .eq('status', 'aprobado')
          .eq('visible_for_client', true);

        if (!misProyectos.includes('*')) {
          query = query.in('proyecto', misProyectos);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setReportes(data || []);
    } catch (err) {
      console.error('Error al cargar la lista de reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReportes();
  }, [currentUser]);

  const cambiarEstadoReporte = async (reporte: Reporte, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: nuevoEstado,
          visible_for_client: nuevoEstado === 'rechazado' ? false : reporte.visible_for_client
        })
        .eq('id', reporte.id);

      if (error) throw error;
      cargarReportes();
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  const enviarACliente = async (reporte: Reporte) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: 'aprobado',
          visible_for_client: true
        })
        .eq('id', reporte.id);

      if (error) throw error;

      await notificationService.notifyReportApproved(
        reporte.titulo_novedad || 'Reporte de Novedad',
        reporte.proyecto || 'General'
      );

      alert('✅ Reporte enviado al cliente correctamente.');
      cargarReportes();
    } catch (err: any) {
      alert('Error al enviar reporte al cliente: ' + err.message);
    }
  };

  const guardarEdicionReporte = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ 
          titulo_novedad: nuevoTitulo,
          desarrollo: nuevoDesarrollo,
          proyecto: nuevoProyecto,
          status: nuevoStatus,
          visible_for_client: nuevaVisibilidadCliente
        })
        .eq('id', id);
        
      if (error) throw error;
      setIdReporteEditando(null);
      alert('✅ Cambios guardados correctamente.');
      cargarReportes();
    } catch (err: any) {
      alert('Error al guardar la edición: ' + err.message);
    }
  };

  const eliminarReporte = async (id: string) => {
    if (!window.confirm('¿Está totalmente seguro de que desea eliminar este reporte permanentemente?')) return;
    try {
      const { error } = await supabase.from('reports').delete().eq('id', id);
      if (error) throw error;
      setReportes((prev) => prev.filter((sol) => sol.id !== id));
    } catch (err: any) {
      alert('Error al eliminar en Supabase: ' + err.message);
    }
  };

  const iniciarEdicion = (reporte: Reporte) => {
    setIdReporteEditando(reporte.id);
    setNuevoTitulo(reporte.titulo_novedad || '');
    setNuevoDesarrollo(reporte.desarrollo || '');
    setNuevoProyecto(reporte.proyecto || '');
    setNuevoStatus(reporte.status || 'pendiente');
    setNuevaVisibilidadCliente(!!reporte.visible_for_client);
  };

  const puedeGestionarYEnviar = ['administrador', 'admin', 'directiva', 'operaciones'].includes(rol);
  const puedeEditarOEliminar = ['administrador', 'admin', 'directiva'].includes(rol);
  return (
    <div style={{ padding: '16px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
        <div>
          <h2 style={{ color: '#333', margin: 0, fontSize: '18px' }}>CONTROL Y ARCHIVO DE NOVEDADES</h2>
          <small style={{ color: '#666' }}>Seguridad Vip 3000 C.A. — Gestión de Registros</small>
        </div>
        <button onClick={cargarReportes} style={{ padding: '10px', borderRadius: '8px', cursor: 'pointer', background: '#fff', border: '1px solid #ccc', flexShrink: 0 }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Sincronizando archivo de novedades...</div>
      ) : reportes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: '#f8f9fa', borderRadius: '12px', border: '1px dashed #ccc', color: '#666' }}>
          No se encontraron reportes archivados para tu perfil actualmente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {reportes.map((reporte) => {
            const estaEditando = idReporteEditando === reporte.id;

            return (
              <div key={reporte.id} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ flex: 1, width: '100%' }}>
                  {estaEditando ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#6c757d', marginBottom: '4px' }}>Título de la Novedad</label>
                        <input type="text" value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '14px', width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#6c757d', marginBottom: '4px' }}>Desarrollo Completo de la Novedad</label>
                        <textarea value={nuevoDesarrollo} onChange={(e) => setNuevoDesarrollo(e.target.value)} rows={5} style={{ padding: '10px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '14px', width: '100%', fontFamily: 'Arial, sans-serif', resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#6c757d', marginBottom: '4px' }}>Proyecto / Ruta</label>
                          <input type="text" value={nuevoProyecto} onChange={(e) => setNuevoProyecto(e.target.value)} style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '13px', width: '100%' }} />
                        </div>
                        <div style={{ width: '140px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#6c757d', marginBottom: '4px' }}>Estado Actual</label>
                          <select value={nuevoStatus} onChange={(e) => setNuevoStatus(e.target.value)} style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '13px', width: '100%', background: '#fff' }}>
                            <option value="pendiente">Pendiente</option>
                            <option value="aprobado">Aprobado</option>
                            <option value="rechazado">Rechazado</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#495057' }}>
                            <input type="checkbox" checked={nuevaVisibilidadCliente} onChange={(e) => setNuevaVisibilidadCliente(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                            Enviado al Cliente
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => navigate(`/lista-reportes/${reporte.id}`)} style={{ cursor: 'pointer' }}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '16px', lineHeight: '1.4', fontWeight: 'bold' }}>
                        {reporte.titulo_novedad || 'Novedad Registrada'}
                      </h4>
                      {reporte.desarrollo && (
                        <p style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '13px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {reporte.desarrollo}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12px', color: '#6c757d' }}>
                        <span>Proyecto: <span style={{ color: '#0070f3', fontWeight: 'bold' }}>{reporte.proyecto || 'Asignación General'}</span></span>
                        <span>|</span>
                        <span>Estado: <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: reporte.status === 'aprobado' ? '#28a745' : reporte.status === 'rechazado' ? '#dc3545' : '#f5a623' }}>{reporte.status}</span></span>
                        <span>|</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {reporte.visible_for_client ? <Eye size={14} color="#28a745" /> : <EyeOff size={14} color="#64748b" />}
                          {reporte.visible_for_client ? 'Enviado al Cliente' : 'Pendiente por enviar a cliente'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  {estaEditando ? (
                    <>
                      <button onClick={() => guardarEdicionReporte(reporte.id)} style={{ padding: '8px 14px', background: '#0070f3', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}><Save size={14} /> Guardar Cambios</button>
                      <button onClick={() => setIdReporteEditando(null)} style={{ padding: '8px 14px', background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#495057', fontSize: '12px' }}><X size={14} /> Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => navigate(`/lista-reportes/${reporte.id}`)} style={{ padding: '7px 12px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <FileText size={14} /> Leer / Fotos
                      </button>

                      {puedeGestionarYEnviar && (reporte.status?.toLowerCase() === 'pendiente' || reporte.status?.toLowerCase() === 'en revisión') && (
                        <>
                          <button onClick={() => cambiarEstadoReporte(reporte, 'aprobado')} style={{ padding: '7px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Aprobar</button>
                          <button onClick={() => cambiarEstadoReporte(reporte, 'rechazado')} style={{ padding: '7px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Rechazar</button>
                        </>
                      )}

                      {puedeGestionarYEnviar && !reporte.visible_for_client && reporte.status?.toLowerCase() !== 'rechazado' && (
                        <button
                          onClick={() => enviarACliente(reporte)}
                          style={{ padding: '7px 12px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Send size={14} /> ENVIAR A CLIENTE
                        </button>
                      )}

                      {puedeGestionarYEnviar && reporte.visible_for_client && (
                        <span style={{ padding: '6px 10px', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={13} /> Enviado al Cliente
                        </span>
                      )}

                      {puedeEditarOEliminar && (
                        <>
                          <button onClick={() => iniciarEdicion(reporte)} style={{ padding: '7px 10px', background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#495057' }}><Edit size={14} /> Editar</button>
                          <button onClick={() => eliminarReporte(reporte.id)} style={{ padding: '7px 10px', background: '#fff0f1', border: '1px solid #ffccd1', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#dc3545' }}><Trash2 size={14} /> Eliminar</button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
