import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ShieldCheck, LogOut, MapPin, RefreshCw, Search, User } from 'lucide-react';

export default function SupervisionesPage() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargarSupervisiones = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supervisiones_operaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (err) {
      console.error('Error cargando supervisiones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSupervisiones();
  }, []);

  const filtrados = registros.filter(
    (r) =>
      (r.nombre_operaciones || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.proyecto_detectado || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.lider_asociado || '').toLowerCase().includes(busqueda.toLowerCase())
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
              <ShieldCheck className="text-purple-600" /> Supervisiones de Operaciones
            </h1>
            <p className="text-xs md:text-sm text-slate-500">Historial de Visitas e Inspecciones por Ubicación GPS</p>
          </div>
        </div>

        <button
          onClick={cargarSupervisiones}
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
          placeholder="Buscar por supervisor, proyecto o líder asociado..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando registros de supervisión...</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No hay supervisiones registradas por Operaciones todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((item) => {
            const esInicio = item.tipo === 'INICIO';
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        esInicio ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {esInicio ? <ShieldCheck size={12} /> : <LogOut size={12} />}
                      {esInicio ? 'INICIO SUPERVISIÓN' : 'FIN SUPERVISIÓN'}
                    </span>
                    <span className="font-bold text-slate-900 text-sm md:text-base">{item.nombre_operaciones}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Proyecto Detectado: <strong className="text-blue-700">{item.proyecto_detectado}</strong>
                  </p>
                  {item.lider_asociado && (
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <User size={12} className="text-slate-400" /> Líder en sitio: <strong>{item.lider_asociado}</strong>
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Fecha y hora: {new Date(item.created_at).toLocaleString('es-VE')}
                  </p>
                </div>

                {typeof item.latitude === 'number' && typeof item.longitude === 'number' && (
                  <a
                    href={`https://google.com{item.latitude},${item.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100 self-start sm:self-center"
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
