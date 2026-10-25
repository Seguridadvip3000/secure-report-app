import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { useAuth } from '../context/AuthContext';
import { ReportCategory, ReportPriority } from '../types';
import {
  FileText,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Clock,
} from 'lucide-react';

export default function NewReport() {
  const { addReport } = useReports();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second for real-time display
  useState(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'novedad_rutinaria' as ReportCategory,
    priority: 'media' as ReportPriority,
    location: '',
    guardName: currentUser?.name || '',
    date: new Date().toISOString().slice(0, 16),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'El título es requerido';
    if (!form.description.trim()) newErrors.description = 'La descripción es requerida';
    if (!form.location.trim()) newErrors.location = 'La ubicación es requerida';
    if (!form.guardName.trim()) newErrors.guardName = 'El nombre es requerido';
    if (!form.date) newErrors.date = 'La fecha es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !currentUser) return;

    addReport({
      title: form.title,
      description: form.description,
      category: form.category,
      status: 'pendiente',
      priority: form.priority,
      location: form.location,
      guardName: form.guardName,
      createdBy: currentUser.id,
      date: new Date(form.date).toISOString(),
    });

    setSubmitted(true);
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
          <h2 className="text-2xl font-bold text-slate-800">¡Reporte Registrado!</h2>
          <p className="text-slate-500">El reporte ha sido creado exitosamente en tiempo real.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            📊 El equipo de Operaciones revisará y aprobará el reporte para el cliente.
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => { setSubmitted(false); setForm({ title: '', description: '', category: 'novedad_rutinaria', priority: 'media', location: '', guardName: currentUser?.name || '', date: new Date().toISOString().slice(0, 16) }); }}
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
            <p className="text-slate-500">Registro en tiempo real de novedades</p>
          </div>
        </div>
        {/* Real-time clock */}
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
          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              <FileText size={16} />
              Título del Reporte *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="Ej: Puerta principal dañada"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                errors.title ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <AlertTriangle size={16} />
                Categoría *
              </label>
              <select
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="novedad_rutinaria">Novedad Rutinaria</option>
                <option value="incidente">Incidente</option>
                <option value="alerta">Alerta</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="acceso_no_autorizado">Acceso No Autorizado</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                Prioridad *
              </label>
              <select
                value={form.priority}
                onChange={e => handleChange('priority', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              <MapPin size={16} />
              Ubicación *
            </label>
            <input
              type="text"
              value={form.location}
              onChange={e => handleChange('location', e.target.value)}
              placeholder="Ej: Edificio A - Piso 2, Entrada Principal"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                errors.location ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            />
            {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
          </div>

          {/* Guard Name & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <User size={16} />
                Nombre del Guardia *
              </label>
              <input
                type="text"
                value={form.guardName}
                onChange={e => handleChange('guardName', e.target.value)}
                placeholder="Ej: Carlos Martínez"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                  errors.guardName ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
              />
              {errors.guardName && <p className="text-xs text-red-500 mt-1">{errors.guardName}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                Fecha y Hora del Suceso *
              </label>
              <input
                type="datetime-local"
                value={form.date}
                onChange={e => handleChange('date', e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                  errors.date ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
              Descripción Detallada *
            </label>
            <textarea
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Describa detalladamente lo sucedido..."
              rows={5}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none ${
                errors.description ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-xl flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            📡 Registrar Reporte en Tiempo Real
          </button>
        </div>
      </form>
    </div>
  );
}
