import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import { PROYECTOS, TITULOS_NOVEDAD } from '../data/constants';
import { notificationService } from '../services/notificationService';
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

// Ubicación por defecto: Caracas, Venezuela
const DEFAULT_LOCATION = {
  lat: 10.4806,
  lng: -66.9036,
  address: 'Caracas, Venezuela (Ubicación por defecto)'
};

export default function NewReport() {
  const { addReport } = useReports();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [gpsUsedDefault, setGpsUsedDefault] = useState(false);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const [form, setForm] = useState({
    proyecto: '',
    tituloNovedad: '',
    desarrollo: '',
  });

  const [evidencias, setEvidencias] = useState<string[]>([]);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Función helper para obtener el input de archivos
  const getFileInput = () => document.getElementById('fileInput') as HTMLInputElement;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.proyecto) newErrors.proyecto = 'Seleccione un proyecto';
    if (!form.tituloNovedad) newErrors.tituloNovedad = 'Seleccione un tipo de novedad';
    if (!form.desarrollo.trim()) newErrors.desarrollo = 'El desarrollo es requerido';
    if (evidencias.length < 2) newErrors.evidencias = 'Debe cargar mínimo 2 fotos de evidencia';
    // GPS es opcional - si no se puede obtener, se usará ubicación por defecto
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

  const getGPSLocation = (): Promise<{ location: { lat: number; lng: number; address?: string }; usedDefault: boolean }> => {
    return new Promise((resolve) => {
      // Si el navegador no soporta geolocalización, usar ubicación por defecto
      if (!navigator.geolocation) {
        console.warn('⚠️ Geolocalización no soportada. Usando ubicación por defecto.');
        resolve({ 
          location: {
            ...DEFAULT_LOCATION,
            address: 'Ubicación por defecto (Navegador no soporta GPS)'
          }, 
          usedDefault: true 
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('✅ GPS obtenido exitosamente:', latitude, longitude);
          resolve({
            location: {
              lat: latitude,
              lng: longitude,
              address: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
            },
            usedDefault: false
          });
        },
        (error) => {
          // En caso de error (permisos denegados, timeout, etc.), usar ubicación por defecto
          console.warn('⚠️ GPS bloqueado por el navegador, aplicando coordenadas base por defecto.');
          console.warn('⚠️ Error details:', error.message, '(Código:', error.code, ')');
          resolve({ 
            location: {
              ...DEFAULT_LOCATION,
              address: 'Ubicación estimada (Permiso de navegador denegado)'
            }, 
            usedDefault: true 
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000, // Reducido a 5 segundos para mejor UX
          maximumAge: 60000 // Aceptar ubicación de hasta 1 minuto de antigüedad
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 handleSubmit llamado');
    console.log('👤 currentUser:', currentUser);
    console.log('🆔 currentUser.id:', currentUser?.id);
    console.log('📧 currentUser.email:', currentUser?.email);
    
    // Validar campos obligatorios (excepto GPS)
    if (!validate()) {
      console.log('❌ Validación fallida');
      return;
    }

    if (!currentUser) {
      console.error('❌ No hay currentUser');
      return;
    }

    // Validar que el ID sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentUser.id)) {
      console.error('❌ currentUser.id no es un UUID válido:', currentUser.id);
      setErrors({ general: 'Error: Usuario no válido. Por favor, cierra sesión e inicia sesión nuevamente.' });
      return;
    }

    try {
      setLoading(true);
      
      // Intentar obtener GPS, si falla usará ubicación por defecto automáticamente
      const { location, usedDefault } = await getGPSLocation();
      setGpsLocation(location);
      setGpsUsedDefault(usedDefault);

      if (usedDefault) {
        console.log('ℹ️ Se usó ubicación por defecto (Caracas)');
      }

      // Crear reporte
      const reportData = {
        fechaHora: new Date().toISOString(),
        proyecto: form.proyecto,
        tituloNovedad: form.tituloNovedad,
        desarrollo: form.desarrollo,
        evidencias: evidencias,
        ubicacionGPS: location,
        quienReporta: currentUser.nombre_completo,
        createdBy: currentUser.id,
        status: 'pendiente' as const,
      };

      console.log('📝 Llamando a addReport con:', reportData);
      await addReport(reportData);

      console.log('✅ Reporte enviado exitosamente');

      // NOTIFICACIÓN 2: Enviar notificación push de reporte creado
      try {
        notificationService.notifyNewReportCreated(
          form.proyecto,
          form.tituloNovedad
        );
        console.log('✅ [NOTIFICACIÓN 2] Push de reporte creado enviada');
      } catch (notificationError) {
        console.error('❌ [NOTIFICACIÓN 2] Error enviando notificación:', notificationError);
      }

      setSubmitted(true);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error al crear reporte:', error);
      if (error instanceof Error) {
        console.error('❌ Mensaje:', error.message);
        console.error('❌ Stack:', error.stack);
      }
      setErrors({ general: `Error al crear el reporte: ${error instanceof Error ? error.message : 'Error desconocido'}` });
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
            <p>✓ Ubicación GPS registrada {gpsUsedDefault && '(ubicación por defecto)'}</p>
            <p>✓ Evidencias adjuntas</p>
            <p className="text-xs mt-2">El equipo de Operaciones revisará el reporte. Una vez aprobado, se notificará al cliente.</p>
          </div>
          {gpsUsedDefault && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              ℹ️ Se usó la ubicación por defecto (Caracas) porque no se pudo obtener tu ubicación GPS.
            </div>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({ proyecto: '', tituloNovedad: '', desarrollo: '' });
                setEvidencias([]);
                setGpsLocation(null);
                setGpsUsedDefault(false);
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
                id="fileInput"
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
                    onClick={() => getFileInput()?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Camera size={18} />
                    Tomar Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const input = getFileInput();
                      if (input) {
                        input.removeAttribute('capture');
                        input.click();
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
          <div className={`border rounded-lg p-4 ${gpsUsedDefault ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-start gap-3">
              <MapPin size={20} className={`${gpsUsedDefault ? 'text-amber-600' : 'text-blue-600'} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${gpsUsedDefault ? 'text-amber-800' : 'text-blue-800'}`}>
                  Ubicación GPS {gpsUsedDefault ? '(Por Defecto)' : ''}
                </p>
                <p className={`text-xs mt-1 ${gpsUsedDefault ? 'text-amber-600' : 'text-blue-600'}`}>
                  {gpsUsedDefault 
                    ? 'No se pudo obtener tu ubicación. Se usará la ubicación por defecto (Caracas).'
                    : 'La ubicación se capturará automáticamente al enviar el reporte'}
                </p>
                {gpsLocation && (
                  <p className={`text-xs mt-2 font-mono ${gpsUsedDefault ? 'text-amber-700' : 'text-blue-700'}`}>
                    {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quien Reporta */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500">Quien Reporta</p>
            <p className="text-sm font-medium text-slate-700">{currentUser?.nombre_completo}</p>
            <p className="text-xs text-slate-500 mt-1">{currentUser?.email}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-xl">
          {errors.general && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
              <AlertCircle size={16} />
              {errors.general}
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
                Enviando reporte...
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
