import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  Clock,
  FileText,
  Trash2,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  ShieldCheck,
  Download,
  Mail,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStatusColor, getStatusLabel, getReportIcon } from '../utils/helpers';
import { generateReportPDF, downloadPDF } from '../utils/pdfGenerator';

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReportById, addNote, deleteReport, approveForClient, rejectReport } = useReports();
  const { currentUser, users } = useAuth();
  const [note, setNote] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const report = getReportById(id || '');

  if (!report || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-5xl">🔍</div>
          <h2 className="text-xl font-bold text-slate-800">Reporte no encontrado</h2>
          <Link to="/" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <ArrowLeft size={16} />
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const canView = () => {
    if (currentUser.role === 'directiva') return true;
    if (currentUser.role === 'operaciones') return true;
    if (currentUser.role === 'lider') return report.createdBy === currentUser.id;
    if (currentUser.role === 'cliente') return report.visibleForClient;
    return false;
  };

  if (!canView()) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold text-slate-800">Acceso Restringido</h2>
          <Link to="/" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <ArrowLeft size={16} />
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const canApprove = currentUser.role === 'operaciones' || currentUser.role === 'directiva';
  const canAddNotes = currentUser.role !== 'cliente';
  const canDelete = currentUser.role === 'directiva' || (currentUser.role === 'lider' && report.createdBy === currentUser.id);

  const creatorUser = users.find(u => u.id === report.createdBy);
  const approverUser = report.approvedByOperaciones ? users.find(u => u.id === report.approvedByOperaciones) : null;

  const handleAddNote = () => {
    if (note.trim()) {
      addNote(report.id, note.trim());
      setNote('');
    }
  };

  const handleDelete = () => {
    deleteReport(report.id);
    navigate('/');
  };

  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    try {
      const pdfData = await generateReportPDF(report);
      const filename = `Reporte_${report.proyecto.replace(/\s/g, '_')}_${format(parseISO(report.fechaHora), 'yyyy-MM-dd_HH-mm')}.pdf`;
      downloadPDF(pdfData, filename);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    }
    setGeneratingPDF(false);
  };

  // FUNCIÓN PARA COMPARTIR DETALLES DE NOVEDAD POR WHATSAPP
  const handleWhatsAppShare = () => {
    const mensaje = `*🚨 SEGURIDAD VIP 3000 - REPORTE DE NOVEDAD*\n\n` +
                    `*ID:* ${report.id.slice(0, 8).toUpperCase()}\n` +
                    `*Título:* ${report.tituloNovedad}\n` +
                    `*Proyecto:* ${report.proyecto}\n` +
                    `*Estatus:* ${getStatusLabel(report.status).toUpperCase()}\n\n` +
                    `*Desarrollo:* \n${report.desarrollo}\n\n` +
                    `_Enviado de forma automática desde la plataforma SecureReport PWA._`;

    const url = `https://wa.me{encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Detalle del Reporte</h1>
            <p className="text-slate-500 text-sm">ID: {report.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* BOTÓN FÍSICO WHATSAPP */}
          <button
            onClick={handleWhatsAppShare}
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Compartir por WhatsApp"
          >
            <MessageSquare size={20} />
          </button>
          
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Descargar PDF"
          >
            <Download size={20} />
          </button>
          {canDelete && (
            <button
              onClick={() => { if (confirm('¿Está seguro de eliminar este reporte?')) handleDelete(); }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Description */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{getReportIcon(report.tituloNovedad)}</span>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{report.tituloNovedad}</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="inline-block bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded font-medium">
                    {report.proyecto}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(report.status)}`}>
                    {getStatusLabel(report.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
                <FileText size={16} />
                Desarrollo
              </h3>
              <p className="text-slate-700 leading-relaxed">{report.desarrollo}</p>
            </div>

            {/* Evidencias */}
            {report.evidencias && report.evidencias.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">
                  Evidencias ({report.evidencias.length} fotos)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {report.evidencias.map((img, index) => {
                    const isUrl = img.startsWith('http://') || img.startsWith('https://');
                    
                    return (
                      <div key={index} className="relative group">
                        <img
                          src={img}
                          alt={`Evidencia ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(img, '_blank')}
                        />
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          Foto {index + 1}
                        </div>
                        {isUrl && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            ✓ En la nube
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Approval Status & Actions */}
          {canApprove && report.status === 'pendiente' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-3 justify-end">
              <button
                onClick={() => rejectReport(report.id)}
                className="inline-flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                <XCircle size={16} /> Rechazar
              </button>
              <button
                onClick={() => approveForClient(report.id)}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
              >
                <CheckCircle size={16} /> Validar y Hacer Visible al Cliente
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Meta Info & Notes */}
        <div className="space-y-6">
        {/* Right Column - Meta Info & Notes */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <User size={16} /> 
              <span><strong>Autor:</strong> {creatorUser?.nombre_completo || 'Desconocido'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} /> 
              <span><strong>Fecha:</strong> {format(parseISO(report.fechaHora), 'dd LLL yyyy', { locale: es })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} /> 
              <span><strong>Hora:</strong> {format(parseISO(report.fechaHora), 'HH:mm aa')}</span>
            </div>
            {report.ubicacionGps && (
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <a 
                  href={`https://google.com{report.ubicacionGps.lat},${report.ubicacionGps.lng}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-600 underline"
                >
                  Ver Coordenadas
                </a>
              </div>
            )}
          </div>

          {/* Notas de Seguimiento */}
          {canAddNotes && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <MessageSquare size={16} /> 
                Notas de Control
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {report.notes?.map((n: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 p-2 rounded text-xs border border-slate-100">
                    <p className="text-slate-700">{n.text}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input 
                  type="text" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  placeholder="Escribir nota..." 
                  className="flex-1 text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500" 
                />
                <button 
                  onClick={handleAddNote} 
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}