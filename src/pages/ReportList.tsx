import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RefreshCw, FileText, Check, X, Edit, Trash2 } from 'lucide-react';

interface Reporte {
  id: string;
  titulo_novedad: string;
  nombre_proyecto: string;
  proyecto_id?: string;
  status: string;
  created_at: string;
}
export default function ReportList() {
  const { currentUser } = useAuth();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const rol = currentUser?.role?.toLowerCase() || '';

  const cargarReportes = async () => {
    setLoading(true);
    try {
      let query = supabase.from('reportes').select('*').order('created_at', { ascending: false });

      // REGLA MATRIZ: El cliente solo visualiza los aprobados de su proyecto asignado
      if (rol === 'cliente') {
        query = query
          .eq('status', 'aprobado')
          .eq('nombre_proyecto', currentUser?.proyecto_id || ''); 
      }

      const { data, error } = await query;
      if (error) throw error;
      setReportes(data || []);
    } catch (err) {
      console.error('Error al cargar la lista de reportes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReportes();
  }, [currentUser]);

  const cambiarEstadoReporte = async (id: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('reportes')
        .update({ status: nuevoEstado })
        .eq('id', id);
      if (error) throw error;
      cargarReportes();
    } catch (err) {
      console.error('Error al actualizar estado:', err);
    }
  };

  // REGLAS OPERATIVAS DE CONTROL DE INTERFAZ
  const puedeAprobarORechazar = ['administrador', 'admin', 'directiva', 'operaciones'].includes(rol);
  const puedeEditarOEliminar = ['administrador', 'admin', 'directiva'].includes(rol); // Operaciones EXCLUIDO
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
          No se encontraron reportes archivados para su nivel de acceso.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {reportes.map((reporte) => (
            <div key={reporte.id} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div>
                <h4 style={{ margin: '0 0 5px 0', color: '#212529', fontSize: '16px' }}>{reporte.titulo_novedad}</h4>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  Proyecto: <span style={{ color: '#0070f3', fontWeight: 'bold' }}>{reporte.nombre_proyecto}</span> | 
                  Estado: <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{reporte.status}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Control Operativo de Aprobaciones */}
                {puedeAprobarORechazar && reporte.status?.toLowerCase() === 'pendiente' && (
                  <>
                    <button onClick={() => cambiarEstadoReporte(reporte.id, 'aprobado')} style={{ padding: '6px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Aprobar</button>
                    <button onClick={() => cambiarEstadoReporte(reporte.id, 'rechazado')} style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Rechazar</button>
                  </>
                )}

                {/* Control Maestro de Edición (Operaciones Excluido) */}
                {puedeEditarOEliminar && (
                  <>
                    <button style={{ padding: '6px 10px', background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: '6px', cursor: 'pointer' }}><Edit size={14} color="#495057" /></button>
                    <button style={{ padding: '6px 10px', background: '#fff0f1', border: '1px solid #ffccd1', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={14} color="#dc3545" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
