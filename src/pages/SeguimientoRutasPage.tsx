import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { RefreshCw, Navigation, Compass, User, AlertCircle } from 'lucide-react';
import L from 'leaflet';
import { supabase } from '@/lib/supabaseClient';

import 'leaflet/dist/leaflet.css';

// CORRECCIÓN SINTÁCTICA: Usando objetos L.point para evitar conflictos de formato de corchetes
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com',
  shadowUrl: 'https://unpkg.com',
  iconSize: L.point(25, 41),
  iconAnchor: L.point(12, 41),
  popupAnchor: [1, -34],
});

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

interface UnidadCustodio {
  id: string;
  nombre: string; // Mapeado a 'nombre_completo' de Supabase
  rol: string;    // Mapeado a 'role' de Supabase
  rutaAsignada: string;
  coordenadas: [number, number];
  ultimaActualizacion: string;
  estado: 'En Ruta' | 'Detenido' | 'Alerta';
  bateria: number;
}
export default function SeguimientoRutasPage() {
  const [unidades, setUnidades] = useState<UnidadCustodio[]>([]);
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadCustodio | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.4806, -66.9036]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [loading, setLoading] = useState(true);

  // EFECTO 1: Consulta automática a la tabla 'users' filtrando los roles operativos en minúsculas
  useEffect(() => {
    async function cargarPersonalSistemas() {
      try {
        setLoading(true);
        
        // Consulta estructurada con coincidencia exacta de minúsculas
        const { data, error } = await supabase
          .from('users') 
          .select('id, nombre_completo, role')
          .in('role', ['lider', 'operaciones', 'supervisor', 'administrador']); 

        if (error) throw error;

        if (data) {
          const transformados: UnidadCustodio[] = data.map((user, index) => {
            // Puntos geográficos distribuidos en Caracas para la simulación inicial
            const lats = [10.4960, 10.4761, 10.4965, 10.4810, 10.4880];
            const lngs = [-66.8491, -66.8654, -66.8845, -66.9030, -66.8200];
            const pos = index % lats.length;

            const estados: ('En Ruta' | 'Detenido' | 'Alerta')[] = ['En Ruta', 'Detenido', 'En Ruta'];
            const estadoFinal = estados[index % estados.length];

            return {
              id: user.id || `USR-${index + 1}`,
              nombre: user.nombre_completo || 'Usuario sin Nombre',
              rol: user.role || 'Sin Rol',
              rutaAsignada: `Zona Operativa Registrada ${index + 1}`,
              coordenadas: [lats[pos] + (Math.random() - 0.5) * 0.005, lngs[pos] + (Math.random() - 0.5) * 0.005],
              ultimaActualizacion: 'Sincronizado',
              estado: estadoFinal,
              bateria: Math.floor(Math.random() * (100 - 45 + 1)) + 45,
            };
          });

          setUnidades(transformados);
          if (transformados.length > 0) {
            setSelectedUnidad(transformados[0]);
            setMapCenter(transformados[0].coordenadas);
          }
        }
      } catch (err) {
        console.error('Error al mapear personal desde Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    cargarPersonalSistemas();
  }, []);

  // EFECTO 2: Movimiento simulado de coordenadas en calle
  useEffect(() => {
    if (!isSimulating || unidades.length === 0) return;

    const interval = setInterval(() => {
      setUnidades(prevUnidades =>
        prevUnidades.map(u => {
          if (u.estado === 'Detenido') return u;
          const deltaLat = (Math.random() - 0.5) * 0.0015;
          const deltaLng = (Math.random() - 0.5) * 0.0015;
          const newCoords: [number, number] = [u.coordenadas[0] + deltaLat, u.coordenadas[1] + deltaLng];
          
          const updated = {
            ...u,
            coordenadas: newCoords,
            ultimaActualizacion: 'En tiempo real'
          };

          if (selectedUnidad && u.id === selectedUnidad.id) {
            setSelectedUnidad(updated);
          }
          return updated;
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulating, selectedUnidad?.id, unidades.length]);

  const handleFocusUnidad = (unidad: UnidadCustodio) => {
    setSelectedUnidad(unidad);
    setMapCenter(unidad.coordenadas);
  };
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="text-blue-600" /> Monitoreo de Rutas en Tiempo Real
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Panel de control exclusivo para la Directiva de Seguridad Vip 3000 C.A.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 ${
              isSimulating ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <RefreshCw size={14} className={isSimulating ? 'animate-spin' : ''} />
            {isSimulating ? 'GPS Activo (Simulando)' : 'GPS Pausado'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[500px] bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-center space-y-2">
            <RefreshCw className="animate-spin text-blue-600 mx-auto" size={32} />
            <p className="text-sm text-slate-500 font-medium">Sincronizando tabla de usuarios desde Supabase...</p>
          </div>
        </div>
      ) : unidades.length === 0 ? (
        <div className="flex items-center justify-center h-[500px] bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-center space-y-2 max-w-sm p-4">
            <AlertCircle className="text-amber-500 mx-auto" size={40} />
            <p className="text-sm font-semibold text-slate-800">Sin personal activo en el sistema</p>
            <p className="text-xs text-slate-500">Asegúrate de que existan registros en la tabla 'users' cuyo valor en 'role' coincida con lider, operaciones, supervisor o administrador.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wider uppercase flex items-center gap-1.5">
              <User size={16} className="text-slate-400" /> Personal Operativo y Líderes
            </h2>
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
              {unidades.map(u => (
                <div
                  key={u.id}
                  onClick={() => handleFocusUnidad(u)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm bg-white ${
                    selectedUnidad?.id === u.id 
                      ? 'border-blue-500 ring-2 ring-blue-500/10' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{u.nombre}</h3>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600 font-mono mt-0.5">{u.rol}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.estado === 'En Ruta' ? 'bg-green-50 text-green-700 border border-green-200' :
                      u.estado === 'Alerta' ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {u.estado}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                    <Navigation size={12} className="text-slate-400 rotate-45" /> {u.rutaAsignada}
                  </p>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    <span>🔋 Batería: <span className="font-medium text-slate-600">{u.bateria}%</span></span>
                    <span>{u.ultimaActualizacion}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="lg:col-span-2 flex flex-col h-[550px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 px-4 py-3 text-white flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <span>Servidor OpenStreetMap Conectado</span>
              </div>
              {selectedUnidad && (
                <span className="text-slate-400 font-mono">
                  Lat: {selectedUnidad.coordenadas[0].toFixed(4)} | Lng: {selectedUnidad.coordenadas[1].toFixed(4)}
                </span>
              )}
            </div>

            <div className="flex-1 z-10 relative">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <ChangeView center={mapCenter} />

                {unidades.map(u => (
                  <Marker 
                    key={u.id} 
                    position={u.coordenadas} 
                    icon={defaultIcon}
                  >
                    <Popup>
                      <div className="p-1 space-y-1 max-w-[200px]">
                        <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-1">{u.nombre}</h4>
                        <p className="text-xs text-slate-600"><b>Rol:</b> <span className="capitalize">{u.rol}</span></p>
                        <p className="text-xs text-slate-600"><b>Ruta:</b> {u.rutaAsignada}</p>
                        <p className="text-xs text-slate-600"><b>Estado:</b> <span className={u.estado === 'Alerta' ? 'text-red-600 font-bold' : 'text-slate-700'}>{u.estado}</span></p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
