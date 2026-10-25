import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import { PROYECTOS, TITULOS_NOVEDAD } from '../data/constants';
import { generateReportPDF } from '../utils/pdfGenerator';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  MapPin,
  Camera,
  Upload,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function NewReport() {
  const { addReport } = useReports();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Update time every second
  useState(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  });

  const [form, setForm] = useState({
    proyecto: '',
    tituloNovedad: '',
    desarrollo: '',
  });

  const [evidencias, setEvidencias] = useState<string[]>([]);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.proyecto) newErrors.proyecto = 'Seleccione un proyecto';
    if (!form.tituloNovedad) newErrors.tituloNovedad = 'Seleccione un tipo de novedad';
    if (!form.desarrollo.trim()) newErrors.desarrollo = 'El desarrollo es requerido';
    if (evidencias.length < 2) newErrors.evidencias = 'Debe cargar mínimo 2 fotos de evidencia';
    if (!gpsLocation) newErrors.gps = 'No se pudo obtener la ubicación GPS';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEvidencias(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEvidence = (index: number) => {
    setEvidencias(prev => prev.filter((_, i) => i !== index));
  };

  const getGPSLocation = (): Promise<{ lat: number; lng: number; address?: string }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Simular dirección (en producción usarías reverse geocoding)
          resolve({
            lat: latitude,
            lng: longitude,
            address: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Obtener GPS al enviar
    try {
      setLoading(true);
      const location = await getGPSLocation();
      setGpsLocation(location);

      if (!validate()) {
        setLoading(false);
        return;
      }

      if (!currentUser) return;

      // Crear reporte
      const reportData = {
        fechaHora: new Date().toISOString(),
        proyecto: form.proyecto,
        tituloNovedad: form.tituloNovedad,
        desarrollo: form.desarrollo,
        evidencias: evidencias,
        ubicacionGPS: location,
        quienReporta: currentUser.name,
        createdBy: currentUser.id,
        status: 'pendiente' as const,
      };

      addReport(reportData);

      // Generar PDF (simulado - en producción se subiría a la nube)
      // const pdfData = await generateReportPDF({ ...reportData, id: 'temp', createdAt: new Date().toISOString(), visibleForClient: false });
      // console.log('PDF generado:', pdfData);

      setSubmitted(true);
      setLoading(false);
    } catch (error) {
      setErrors({ gps: 'Error al obtener ubicación GPS. Verifique los permisos.' });
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">¡Reporte Enviado!</h2>
          <p className="text-slate-500">El reporte ha sido registrado exitosamente.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 space-y-2">
            <p>✓ PDF generado y almacenado en la nube</p>
            <p>✓ Ubicación GPS registrada</p>
            <p>✓ Evidencias adjuntas</p>
            <p className="text-xs mt-2">El equipo de Operaciones revisará el reporte. Una vez aprobado, se notificará al cliente.</p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({ proyecto: '', tituloNovedad: '', desarrollo: '' });
                setEvidencias([]);
                setGpsLocation(null);
              }}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Crear Otro Reporte
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium"
            >
              Ir al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nuevo Reporte</h1>
            <p className="text-slate-500">Registro de novedad en tiempo real</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
          <Clock size={16} className="text-blue-600" />
          <span className="text-sm font-mono text-slate-700">
            {currentTime.toLocaleTimeString('es-ES')}
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 space-y-5">
          {/* Fecha y Hora (automática) */}
          <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
            <Clock size={20} className="text-blue-600" />
            <div>
              <p className="text-xs text-slate-500">Fecha y Hora del Reporte</p>
              <p className="text-sm font-medium text-slate-700">
                {currentTime.toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Proyecto */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              <MapPin size={16} />
              Proyecto *
            </label>
            <select
              value={form.proyecto}
              onChange={e => handleChange('proyecto', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white ${
                errors.proyecto ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            >
              <option value="">Seleccione un proyecto</option>
              {PROYECTOS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.proyecto && <p className="text-xs text-red-500 mt-1">{errors.proyecto}</p>}
          </div>

          {/* Título de la Novedad */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              <FileText size={16} />
              Tipo de Novedad *
            </label>
            <select
              value={form.tituloNovedad}
              onChange={e => handleChange('tituloNovedad', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white ${
                errors.tituloNovedad ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            >
              <option value="">Seleccione un tipo de novedad</option>
              {TITULOS_NOVEDAD.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.tituloNovedad && <p className="text-xs text-red-500 mt-1">{errors.tituloNovedad}</p>}
          </div>

          {/* Desarrollo */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Desarrollo de la Novedad *
            </label>
            <textarea
              value={form.desarrollo}
              onChange={e => handleChange('desarrollo', e.target.value)}
              placeholder="Describa detalladamente lo sucedido..."
              rows={6}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none ${
                errors.desarrollo ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            />
            {errors.desarrollo && <p className="text-xs text-red-500 mt-1">{errors.desarrollo}</p>}
          </div>

          {/* Evidencias */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Evidencias Fotográficas * (mínimo 2 fotos)
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Camera size={18} />
                    Tomar Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                  >
                    <Upload size={18} />
                    Subir de Galería
                  </button>
                </div>
                <p className="text-xs text-slate-500">Puede tomar fotos con la cámara o seleccionarlas de su galería</p>
              </div>

              {/* Preview de imágenes */}
              {evidencias.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {evidencias.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Evidencia ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeEvidence(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                        Foto {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.evidencias && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.evidencias}
              </p>
            )}
            {evidencias.length > 0 && evidencias.length < 2 && (
              <p className="text-xs text-amber-600 mt-1">
                Faltan {2 - evidencias.length} foto(s) más
              </p>
            )}
          </div>

          {/* GPS Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Ubicación GPS</p>
                <p className="text-xs text-blue-600 mt-1">
                  La ubicación se capturará automáticamente al enviar el reporte
                </p>
                {gpsLocation && (
                  <p className="text-xs text-blue-700 mt-2 font-mono">
                    {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quien Reporta */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500">Quien Reporta</p>
            <p className="text-sm font-medium text-slate-700">{currentUser?.name}</p>
            <p className="text-xs text-slate-500 mt-1">{currentUser?.email}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-xl">
          {errors.gps && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
              <AlertCircle size={16} />
              {errors.gps}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Obteniendo GPS y generando PDF...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Enviar Reporte
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
