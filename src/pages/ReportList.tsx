import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RefreshCw, Check, X, Edit, Trash2, Save, Eye, EyeOff } from 'lucide-react';

interface Reporte {
  id: string;
  titulo_novedad: string;
  proyecto: string;
  status: string;
  visibleForClient?: boolean;
  created_at: string;
}
export default function ReportList() {
  const { currentUser } = useAuth();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para controlar la edición integral inline del elemento seleccionado
  const [idReporteEditando, setIdReporteEditando] = useState<string | null>(null);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoProyecto, setNuevoProyecto] = useState('');
  const [nuevoStatus, setNuevoStatus] = useState('');
  const [nuevaVisibilidadCliente, setNuevaVisibilidadCliente] = useState(false);

  const rol = currentUser?.role?.toLowerCase() || '';

  const cargarReportes = async () => {
    setLoading(true);
    try {
      let query = supabase.from('reports').select('*').order('created_at', { ascending: false });

      if (rol === 'cliente') {
        query = query
          .eq('status', 'aprobado')
          .eq('visibleForClient', true)
          .eq('proyecto', currentUser?.proyecto_id || ''); 
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

  const cambiarEstadoReporte = async (id: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase.from('reports').update({ status: nuevoEstado }).eq('id', id);
      if (error) throw error;
      cargarReportes();
    } catch (err) {
      console.error('Error al actualizar estado:', err);
    }
  };

  // FUNCIÓN MAESTRA INTEGRAL: Modifica todo el contenido del reporte de manera unificada
  const guardarEdicionReporte = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ 
          titulo_novedad: nuevoTitulo, 
          proyecto: nuevoProyecto,
          status: nuevoStatus,
          visibleForClient: nuevaVisibilidadCliente
        })
        .eq('id', id);
        
      if (error) throw error;
      setIdReporteEditando(null);
      cargarReportes();
    } catch (err: any) {
      alert('Error al guardar la edición integral: ' + err.message);
    }
  };

  // FUNCIÓN MAESTRA DE EXPULSIÓN: Elimina permanentemente el registro de la base de datos
  const eliminarReporte = async (id: string) => {
    if (!window.confirm('¿Está totalmente seguro de que desea eliminar este reporte de novedades permanentemente del archivo?')) return;
    try {
      const { error } = await supabase.from('reports').delete().eq('id', id);
      if (error) throw error;
      cargarReportes();
    } catch (err: any) {
      alert('Error al eliminar registro: ' + err.message);
    }
  };

  const iniciarEdicion = (reporte: Reporte) => {
    setIdReporteEditando(reporte.id);
    setNuevoTitulo(reporte.titulo_novedad || '');
    setNuevoProyecto(reporte.proyecto || '');
    setNuevoStatus(reporte.status || 'pendiente');
    setNuevaVisibilidadCliente(!!reporte.visibleForClient);
  };

  // POLÍTICAS EXCLUSIVAS DE CONTROL DE PRIVILEGIOS DE ACCESO DE SEGURIDAD VIP 3000
  const puedeAprobarORechazar = ['administrador', 'admin', 'directiva', 'operaciones'].includes(rol);
  
  // EXCLUSIVO: Solo la directiva y el administrador pueden realizar modificaciones o eliminar registros
  const puedeEditarOEliminar = ['administrador', 'admin', 'directiva'].includes(rol);
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: '#333', margin: 0 }}>CONTROL Y ARCHIVO DE NOVEDADES</h2>
          <small style={{ color: '#666' }}>Seguridad Vip 3000 C.A. — Gestión de Registros</small>
        </div>
        <button onClick={cargarReportes} style={{ padding: '10px', borderRadius: '5px', cursor: 'pointer', background: '#fff', border: '1px solid #ccc' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Sincronizando archivo de novedades...</div>
      ) : reportes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: '#f8f9fa', borderRadius: '12px', border: '1px dashed #ccc', color: '#666' }}>
          No se encontraron reportes archivados en el sistema actualmente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {reportes.map((reporte) => {
            const estaEditando = idReporteEditando === reporte.id;

            return (
              <div key={reporte.id} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                
                {/* ÁREA DE CONTENIDO INTEGRAL: Inputs avanzados para editar todo el contenido */}
                <div style={{ flex: 1, marginRight: '20px' }}>
                  {estaEditando ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#6c757d', marginBottom: '3px' }}>Contenido de la Novedad</label>
                        <textarea 
                          value={nuevoTitulo} 
                          onChange={(e) => setNuevoTitulo(e.target.value)} 
                          rows={3}
                          style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '14px', width: '100%', fontFamily: 'Arial, sans-serif', resize: 'vertical' }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#6c757d', marginBottom: '3px' }}>Proyecto / Ruta</label>
                          <input 
                            type="text" 
                            value={nuevoProyecto} 
                            onChange={(e) => setNuevoProyecto(e.target.value)} 
                            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '13px', width: '100%' }}
                          />
                        </div>

                        <div style={{ width: '140px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#6c757d', marginBottom: '3px' }}>Estado Actual</label>
                          <select 
                            value={nuevoStatus} 
                            onChange={(e) => setNuevoStatus(e.target.value)}
                            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '13px', width: '100%', bg: '#fff' }}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="aprobado">Aprobado</option>
                            <option value="rechazado">Rechazado</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '18px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#495057' }}>
                            <input 
                              type="checkbox" 
                              checked={nuevaVisibilidadCliente} 
                              onChange={(e) => setNuevaVisibilidadCliente(e.target.checked)}
                              style={{ width: '16px', height: '16px' }}
                            />
                            Visible para el Cliente
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 style={{ margin: '0 0 8px 0', color: '#212529', fontSize: '16px', lineHeight: '1.4', whiteSpace: 'pre-line' }}>{reporte.titulo_novedad || 'Novedad Registrada'}</h4>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12px', color: '#6c757d' }}>
                        <span>Proyecto: <span style={{ color: '#0070f3', fontWeight: 'bold' }}>{reporte.proyecto || 'Asignación General'}</span></span>
                        <span>|</span>
                        <span>Estado: <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: reporte.status === 'aprobado' ? '#28a745' : reporte.status === 'rechazado' ? '#dc3545' : '#f5a623' }}>{reporte.status}</span></span>
                        <span>|</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          {reporte.visibleForClient ? <Eye size={13} color="#28a745" /> : <EyeOff size={13} color="#dc3545" />}
                          {reporte.visibleForClient ? 'Visible al Cliente' : 'Privado de Gestión'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* BOTONERAS INTERACTIVAS */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', alignSelf: 'center' }}>
                  {estaEditando ? (
                    <>
                      <button onClick={() => guardarEdicionReporte(reporte.id)} style={{ padding: '8px 12px', background: '#0070f3', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}><Save size={14} /> Guardar</button>
                      <button onClick={() => setIdReporteEditando(null)} style={{ padding: '8px 12px', background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#495057', fontSize: '12px' }}><X size={14} /> Cancelar</button>
                    </>
                  ) : (
                    <>
                      {/* Control Operativo de Aprobaciones Rápidas */}
                      {puedeAprobarORechazar && (reporte.status?.toLowerCase() === 'pendiente' || reporte.status?.toLowerCase() === 'en revisión') && (
                        <>
                          <button onClick={() => cambiarEstadoReporte(reporte.id, 'aprobado')} style={{ padding: '6px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Aprobar</button>
                          <button onClick={() => cambiarEstadoReporte(reporte.id, 'rechazado')} style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Rechazar</button>
                        </>
                      )}

                      {/* Control Maestro de Edición y Eliminación Completa (Directiva y Admin únicamente) */}
                      {puedeEditarOEliminar && (
                        <>
                          <button onClick={() => iniciarEdicion(reporte)} style={{ padding: '6px 10px', background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: '6px', cursor: 'pointer' }}><Edit size={14} color="#495057" /></button>
                          <button onClick={() => eliminarReporte(reporte.id)} style={{ padding: '6px 10px', background: '#fff0f1', border: '1px solid #ffccd1', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={14} color="#dc3545" /></button>
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
