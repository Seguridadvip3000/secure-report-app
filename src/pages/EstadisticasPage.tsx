import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PROYECTOS, TITULOS_NOVEDAD } from '../data/constants';
import { ArrowLeft, BarChart3, Filter, Calendar, FileText, MapPin, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';

interface ReporteStats {
  id: string;
  titulo_novedad: string;
  proyecto: string;
  status: string;
  created_at: string;
}

type FiltroPeriodo = 'general' | 'semana' | 'mes' | 'rango';

export default function EstadisticasPage() {
  const navigate = useNavigate();
  const [reportes, setReportes] = useState<ReporteStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [periodo, setPeriodo] = useState<FiltroPeriodo>('general');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [proyectoFiltro, setProyectoFiltro] = useState('todos');
  const [tituloFiltro, setTituloFiltro] = useState('todos');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id, titulo_novedad, proyecto, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReportes(data || []);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Aplicar filtros combinados (Fecha, Proyecto y Título)
  const reportesFiltrados = useMemo(() => {
    const ahora = new Date();

    return reportes.filter((r) => {
      const fechaRep = new Date(r.created_at);

      // 1. Filtro por Fecha
      if (periodo === 'semana') {
        const hace7Dias = new Date(ahora);
        hace7Dias.setDate(ahora.getDate() - 7);
        if (fechaRep < hace7Dias) return false;
      } else if (periodo === 'mes') {
        if (fechaRep.getMonth() !== ahora.getMonth() || fechaRep.getFullYear() !== ahora.getFullYear()) {
          return false;
        }
      } else if (periodo === 'rango') {
        if (fechaInicio) {
          const inicio = new Date(`${fechaInicio}T00:00:00`);
          if (fechaRep < inicio) return false;
        }
        if (fechaFin) {
          const fin = new Date(`${fechaFin}T23:59:59`);
          if (fechaRep > fin) return false;
        }
      }

      // 2. Filtro por Proyecto
      if (proyectoFiltro !== 'todos' && r.proyecto !== proyectoFiltro) {
        return false;
      }

      // 3. Filtro por Título de Novedad
      if (tituloFiltro !== 'todos' && r.titulo_novedad !== tituloFiltro) {
        return false;
      }

      return true;
    });
  }, [reportes, periodo, fechaInicio, fechaFin, proyectoFiltro, tituloFiltro]);

  // Cálculos para gráficos y tarjetas
  const metricas = useMemo(() => {
    const total = reportesFiltrados.length;
    const aprobados = reportesFiltrados.filter((r) => r.status === 'aprobado').length;
    const pendientes = reportesFiltrados.filter((r) => r.status === 'pendiente' || r.status === 'en_proceso').length;
    const rechazados = reportesFiltrados.filter((r) => r.status === 'rechazado').length;

    // Agrupar por Proyecto
    const mapaProyectos: Record<string, number> = {};
    reportesFiltrados.forEach((r) => {
      const proy = r.proyecto || 'Sin Proyecto';
      mapaProyectos[proy] = (mapaProyectos[proy] || 0) + 1;
    });
    const porProyecto = Object.entries(mapaProyectos)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Agrupar por Título de Novedad
    const mapaTitulos: Record<string, number> = {};
    reportesFiltrados.forEach((r) => {
      const tit = r.titulo_novedad || 'Sin Clasificar';
      mapaTitulos[tit] = (mapaTitulos[tit] || 0) + 1;
    });
    const porTitulo = Object.entries(mapaTitulos)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return { total, aprobados, pendientes, rechazados, porProyecto, porTitulo };
  }, [reportesFiltrados]);
  const maxProyecto = metricas.porProyecto.length > 0 ? metricas.porProyecto[0].cantidad : 1;
  const maxTitulo = metricas.porTitulo.length > 0 ? metricas.porTitulo[0].cantidad : 1;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-red-600" /> Estadísticas y Análisis Operativo
            </h1>
            <p className="text-xs md:text-sm text-slate-500">Seguridad VIP 3000 C.A. — Indicadores de Novedades</p>
          </div>
        </div>

        <button
          onClick={cargarDatos}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar Datos
        </button>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">
          <Filter size={16} className="text-blue-600" /> Filtros de Búsqueda
        </div>

        {/* Botones rápidos de Período */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'general', label: 'Nivel General (Todo)' },
            { id: 'semana', label: 'Última Semana (7 días)' },
            { id: 'mes', label: 'Este Mes' },
            { id: 'rango', label: 'Rango de Fechas' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setPeriodo(btn.id as FiltroPeriodo)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodo === btn.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Inputs de Rango Personalizado si se elige 'rango' */}
        {periodo === 'rango' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar size={13} /> Fecha Desde:
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar size={13} /> Fecha Hasta:
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
          </div>
        )}

        {/* Selectores de Proyecto y Título */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin size={13} className="text-blue-600" /> Filtrar por Proyecto
            </label>
            <select
              value={proyectoFiltro}
              onChange={(e) => setProyectoFiltro(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los Proyectos</option>
              {PROYECTOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
              <FileText size={13} className="text-purple-600" /> Filtrar por Título de Novedad
            </label>
            <select
              value={tituloFiltro}
              onChange={(e) => setTituloFiltro(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los Títulos / Novedades</option>
              {TITULOS_NOVEDAD.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas de Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Filtrado</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{metricas.total}</p>
          <span className="text-[11px] text-blue-600 font-semibold">Reportes registrados</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Aprobados</p>
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <p className="text-3xl font-black text-green-600 mt-1">{metricas.aprobados}</p>
          <span className="text-[11px] text-slate-400">
            {metricas.total > 0 ? Math.round((metricas.aprobados / metricas.total) * 100) : 0}% del total
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Pendientes</p>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-500 mt-1">{metricas.pendientes}</p>
          <span className="text-[11px] text-slate-400">
            {metricas.total > 0 ? Math.round((metricas.pendientes / metricas.total) * 100) : 0}% del total
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Rechazados</p>
            <XCircle size={16} className="text-red-500" />
          </div>
          <p className="text-3xl font-black text-red-500 mt-1">{metricas.rechazados}</p>
          <span className="text-[11px] text-slate-400">
            {metricas.total > 0 ? Math.round((metricas.rechazados / metricas.total) * 100) : 0}% del total
          </span>
        </div>
      </div>
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          Calculando gráficas estadísticas...
        </div>
      ) : metricas.total === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No se encontraron reportes que coincidan con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Incidencia por Proyecto */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin size={18} className="text-blue-600" /> Reportes por Proyecto
            </h3>
            <div className="space-y-3">
              {metricas.porProyecto.map((item) => {
                const porcentajeAncho = Math.max(6, Math.round((item.cantidad / maxProyecto) * 100));
                const porcentajeReal = Math.round((item.cantidad / metricas.total) * 100);
                return (
                  <div key={item.nombre} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate pr-2">{item.nombre}</span>
                      <span className="text-blue-700 flex-shrink-0">{item.cantidad} ({porcentajeReal}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${porcentajeAncho}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfico 2: Incidencia por Título / Tipo de Novedad */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText size={18} className="text-red-600" /> Reportes por Tipo / Título de Novedad
            </h3>
            <div className="space-y-3">
              {metricas.porTitulo.map((item) => {
                const porcentajeAncho = Math.max(6, Math.round((item.cantidad / maxTitulo) * 100));
                const porcentajeReal = Math.round((item.cantidad / metricas.total) * 100);
                return (
                  <div key={item.nombre} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate pr-2">{item.nombre}</span>
                      <span className="text-red-700 flex-shrink-0">{item.cantidad} ({porcentajeReal}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${porcentajeAncho}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
