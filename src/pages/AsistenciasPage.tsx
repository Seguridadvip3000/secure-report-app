import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Clock, LogIn, LogOut, MapPin, RefreshCw, Search } from 'lucide-react';

export default function AsistenciasPage() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargarAsistencias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('asistencias_lideres')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (err) {
      console.error('Error cargando asistencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAsistencias();
  }, []);

  const filtrados = registros.filter(
    (r) =>
      (r.nombre_lider || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.proyecto || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-emerald-600" /> Control de Asistencia de Líderes
            </h1>
            <p className="text-xs md:text-sm text-slate-500">Historial de Entradas y Salidas en Proyectos</p>
          </div>
        </div>

        <button
          onClick={cargarAsistencias}
          className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre del líder o proyecto..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando registros de asistencia...</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No hay registros de entrada o salida de líderes todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((item) => {
            const esEntrada = item.tipo === 'ENTRADA';
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        esEntrada ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {esEntrada ? <LogIn size={12} /> : <LogOut size={12} />} {item.tipo}
                    </span>
                    <span className="font-bold text-slate-900 text-sm md:text-base">{item.nombre_lider}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Proyecto: <strong className="text-blue-700">{item.proyecto}</strong>
                  </p>
                  <p className="text-xs text-slate-400">
                    Fecha y hora: {new Date(item.created_at).toLocaleString('es-VE')}
                  </p>
                </div>

                {typeof item.latitude === 'number' && typeof item.longitude === 'number' && (
                  <a
                    href={`https://google.com{item.latitude},${item.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 self-start sm:self-center"
                  >
                    <MapPin size={14} /> Ver GPS
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
