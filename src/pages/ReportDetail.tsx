import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Calendar, User, MapPin, CheckCircle, Clock, XCircle, Image as ImageIcon } from 'lucide-react';

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDetalle = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setReporte(data);
      } catch (err) {
        console.error('Error al cargar el reporte desde Supabase:', err);
        setReporte(null);
      } finally {
        setLoading(false);
      }
    };

    cargarDetalle();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Cargando detalles y fotografías del reporte...
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-4">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Reporte no encontrado</h2>
          <p className="text-slate-500 text-sm mb-6">El registro solicitado no existe o fue eliminado de la base de datos.</p>
          <button
            onClick={() => navigate('/lista-reportes')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            <ArrowLeft size={18} /> Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  // Extraer fotografías sin importar cómo estén guardadas en la columna de Supabase
  const listaFotos: string[] = Array.isArray(reporte.fotos) 
    ? reporte.fotos 
    : Array.isArray(reporte.imagenes) 
      ? reporte.imagenes 
      : typeof reporte.foto_url === 'string' && reporte.foto_url 
        ? [reporte.foto_url] 
        : [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/lista-reportes')}
        className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium text-sm"
      >
        <ArrowLeft size={18} /> Volver a la Lista de Reportes
      </button>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Encabezado del Reporte */}
        <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              {reporte.proyecto || 'Sin Proyecto'}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${
              reporte.status === 'aprobado' ? 'bg-green-100 text-green-700' :
              reporte.status === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {reporte.status === 'aprobado' && <CheckCircle size={14} />}
              {reporte.status === 'rechazado' && <XCircle size={14} />}
              {reporte.status === 'pendiente' && <Clock size={14} />}
              {reporte.status || 'Pendiente'}
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            {reporte.titulo_novedad || 'Reporte de Novedad'}
          </h1>

          <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <User size={14} /> Reportado por: <strong>{reporte.quien_reporta || reporte.quienReporta || 'Personal Operativo'}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} /> Fecha: <strong>{new Date(reporte.created_at).toLocaleString('es-VE')}</strong>
            </span>
            {reporte.ubicacion && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} /> Ubicación: <strong>{reporte.ubicacion}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Desarrollo completo de la novedad */}
        <div className="p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Desarrollo de la Novedad</h3>
          <div className="text-slate-700 text-base leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100">
            {reporte.desarrollo || reporte.descripcion || 'Sin descripción adicional registrada.'}
          </div>
        </div>

        {/* Galería de Fotografías */}
        <div className="p-5 md:p-6 border-t border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <ImageIcon size={16} /> Evidencia Fotográfica ({listaFotos.length})
          </h3>
          
          {listaFotos.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Este reporte no contiene fotografías adjuntas.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listaFotos.map((url, index) => (
                <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-95 transition-opacity">
                  <img src={url} alt={`Evidencia ${index + 1}`} className="w-full h-64 object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
