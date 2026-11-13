import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateOfficialPDF } from '../utils/pdfGenerator';
import { ArrowLeft, Calendar, User, MapPin, CheckCircle, Clock, XCircle, Image as ImageIcon, ExternalLink, Download, Share2 } from 'lucide-react';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);

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

  const compartirPorWhatsApp = () => {
    if (!reporte) return;

    const fechaTexto = new Date(reporte.created_at || Date.now()).toLocaleString('es-VE');
    const gps = reporte.ubicacion_gps;
    const tieneGps = gps && typeof gps.lat === 'number' && typeof gps.lng === 'number' && (gps.lat !== 0 || gps.lng !== 0);
    
    const enlaceMapa = tieneGps ? `\n📍 *Ubicación GPS:* https://google.com{gps.lat},${gps.lng}` : '';
    const fotos: string[] = Array.isArray(reporte.evidencias)
      ? reporte.evidencias.filter((url: any) => typeof url === 'string' && url.trim() !== '')
      : [];
    const textoFotos = fotos.length > 0 ? `\n📸 *Evidencias adjuntas:* ${fotos.length} fotografía(s) en sistema` : '';

    const mensaje = `🛡️ *SEGURIDAD VIP 3000 C.A.*\n*REPORTE DE NOVEDAD*\n\n` +
      `📌 *Caso:* ${(reporte.titulo_novedad || 'Novedad Operativa').toUpperCase()}\n` +
      `🏢 *Proyecto:* ${reporte.proyecto || 'Asignación General'}\n` +
      `👤 *Reporta:* ${reporte.quien_reporta || reporte.quienReporta || 'Personal Operativo'}\n` +
      `📅 *Fecha:* ${fechaTexto}\n` +
      `📊 *Estado:* ${(reporte.status || 'Pendiente').toUpperCase()}\n\n` +
      `📝 *Conocimiento del Caso:*\n${reporte.desarrollo || reporte.descripcion || 'Sin descripción adicional.'}` +
      `${enlaceMapa}${textoFotos}`;

    const urlWhatsApp = `https://whatsapp.com{encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
  };

  const manejarDescargaPDF = async () => {
    if (!reporte) return;
    setGenerandoPdf(true);
    try {
      const fotos: string[] = Array.isArray(reporte.evidencias)
        ? reporte.evidencias.filter((url: any) => typeof url === 'string' && url.trim() !== '')
        : [];

      const gps = reporte.ubicacion_gps || { lat: 0, lng: 0 };

      const fechaFormateada = new Date(reporte.created_at || Date.now()).toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const blob = await generateOfficialPDF({
        titulo: reporte.titulo_novedad || 'REPORTE DE NOVEDAD',
        proyecto: reporte.proyecto || 'ASIGNACIÓN GENERAL',
        fecha: fechaFormateada,
        descripcion: reporte.desarrollo || reporte.descripcion || 'SIN DESCRIPCIÓN ADICIONAL REGISTRADA.',
        quien_reporta: reporte.quien_reporta || reporte.quienReporta || 'PERSONAL OPERATIVO',
        imagenes: fotos,
        coordenadas: {
          lat: typeof gps.lat === 'number' ? gps.lat : 0,
          lng: typeof gps.lng === 'number' ? gps.lng : 0
        }
      });

      const nombreLimpio = (reporte.proyecto || 'Reporte').replace(/[^a-zA-Z0-9]/g, '_');
      const nombreArchivo = `SecureReport_${nombreLimpio}_${reporte.id.slice(0, 6)}.pdf`;

      if (window.ReactNativeWebView) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64Puro = dataUrl.split(',')[1];
          window.ReactNativeWebView?.postMessage(
            JSON.stringify({
              type: 'DOWNLOAD_PDF',
              filename: nombreArchivo,
              base64: base64Puro
            })
          );
        };
        reader.readAsDataURL(blob);
      } else {
        const urlBlob = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = urlBlob;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(urlBlob);
      }
    } catch (error) {
      console.error('Error al generar el PDF oficial:', error);
      alert('Ocurrió un error al generar el PDF. Verifica tu conexión a internet.');
    } finally {
      setGenerandoPdf(false);
    }
  };
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

  const listaFotos: string[] = Array.isArray(reporte.evidencias)
    ? reporte.evidencias.filter((url: any) => typeof url === 'string' && url.trim() !== '')
    : [];

  const gps = reporte.ubicacion_gps;
  const tieneGpsValido = gps && typeof gps.lat === 'number' && typeof gps.lng === 'number' && (gps.lat !== 0 || gps.lng !== 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/lista-reportes')}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium text-sm"
        >
          <ArrowLeft size={18} /> Volver a la Lista
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={compartirPorWhatsApp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
          >
            <Share2 size={16} /> Compartir WhatsApp
          </button>

          <button
            onClick={manejarDescargaPDF}
            disabled={generandoPdf}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-red-700 disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
          >
            <Download size={16} />
            {generandoPdf ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
            {tieneGpsValido && (
              <a
                href={`https://google.com{gps.lat},${gps.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
              >
                <MapPin size={14} /> Ver Ubicación GPS ({gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}) <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        <div className="p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Desarrollo de la Novedad</h3>
          <div className="text-slate-700 text-base leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100">
            {reporte.desarrollo || reporte.descripcion || 'Sin descripción adicional registrada.'}
          </div>
        </div>

        <div className="p-5 md:p-6 border-t border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <ImageIcon size={16} /> Evidencia Fotográfica ({listaFotos.length})
          </h3>
          
          {listaFotos.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Este reporte no contiene fotografías adjuntas.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listaFotos.map((url, index) => (
                <a 
                  key={index} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-95 transition-opacity bg-slate-100"
                >
                  <img 
                    src={url} 
                    alt={`Evidencia ${index + 1}`} 
                    className="w-full h-64 object-cover" 
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
