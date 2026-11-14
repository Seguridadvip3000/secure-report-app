import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { RefreshCw, Battery, BatteryMedium, BatteryLow, Search, Briefcase } from 'lucide-react';
import L from 'leaflet';
import { supabase } from '../lib/supabase';

import 'leaflet/dist/leaflet.css';

const crearIconoPersonalizado = (role: string) => {
  const rolMinuscula = role ? role.toLowerCase() : '';
  let colorFondo = '#0070f3';

  if (rolMinuscula === 'directiva') colorFondo = '#dc3545';
  if (rolMinuscula === 'lider') colorFondo = '#28a745';
  if (rolMinuscula === 'administrador' || rolMinuscula === 'admin') colorFondo = '#f5a623';

  return L.divIcon({
    className: 'custom-pin-gps',
    html: `<div style="
      width: 18px; 
      height: 18px; 
      background-color: ${colorFondo}; 
      border: 3px solid #ffffff; 
      border-radius: 50%; 
      box-shadow: 0px 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: L.point(18, 18),
    iconAnchor: L.point(9, 9),
    popupAnchor: [0, -10]
  });
};

interface Elemento {
  id: string;
  nombre_completo: string;
  role: string;
  proyectos?: string[];
  nombre_proyecto?: string;
  latitude?: number;
  longitude?: number;
  bateria?: number;
  updated_at?: string;
  historial_coordenadas?: [number, number][];
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function SeguimientoRutasPage() {
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [centroMapa, setCentroMapa] = useState<[number, number]>([10.4914, -66.8486]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nombre_completo, role, proyectos');

      if (usersError) throw usersError;

      const { data: locationsData, error: locationsError } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, bateria, updated_at')
        .order('updated_at', { ascending: true });

      if (locationsError) throw locationsError;

      if (usersData) {
        const rolesPermitidos = ['lider', 'operaciones', 'directiva', 'administrador', 'admin'];
        let primerPuntoActivo: [number, number] | null = null;
        
        const listaCombinada = usersData
          .filter((user: any) => user.role && rolesPermitidos.includes(user.role.toLowerCase()))
          .map((user: any) => {
            const posicionesUsuario = locationsData?.filter((loc) => loc.user_id === user.id) || [];
            const ultimaLoc = posicionesUsuario.length > 0 ? posicionesUsuario[posicionesUsuario.length - 1] : null;
            const rolMinuscula = user.role.toLowerCase();

            let nombreProyectoDisplay =
              Array.isArray(user.proyectos) && user.proyectos.length > 0
                ? user.proyectos.join(', ')
                : 'Zona Operativa Asignada';

            if (['administrador', 'admin', 'directiva', 'operaciones'].includes(rolMinuscula)) {
              nombreProyectoDisplay = 'Acceso Global / Todos';
            }

            if (ultimaLoc && typeof ultimaLoc.latitude === 'number' && typeof ultimaLoc.longitude === 'number' && !primerPuntoActivo) {
              primerPuntoActivo = [ultimaLoc.latitude, ultimaLoc.longitude];
            }

            const trazadoRuta = posicionesUsuario
              .filter((loc) => typeof loc.latitude === 'number' && typeof loc.longitude === 'number')
              .map((loc): [number, number] => [loc.latitude, loc.longitude]);
            
            return {
              ...user,
              latitude: ultimaLoc?.latitude,
              longitude: ultimaLoc?.longitude,
              bateria: ultimaLoc?.bateria,
              updated_at: ultimaLoc?.updated_at,
              nombre_proyecto: nombreProyectoDisplay,
              historial_coordenadas: trazadoRuta
            };
          });

        if (primerPuntoActivo) {
          setCentroMapa(primerPuntoActivo);
        }
        setElementos(listaCombinada);
      }
    } catch (err) {
      console.error('Error procesando los datos para el mapa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();

    const canalUbicaciones = supabase
      .channel('cambios-ubicacion-en-vivo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_locations' },
        (payload: any) => {
          if (!payload.new) return;
          setElementos((prev) =>
            prev.map((c) => {
              if (c.id === payload.new.user_id) {
                const nuevaCoord: [number, number] = [payload.new.latitude, payload.new.longitude];
                const nuevoHistorial = c.historial_coordenadas ? [...c.historial_coordenadas, nuevaCoord] : [nuevaCoord];
                return { 
                  ...c, 
                  latitude: payload.new.latitude, 
                  longitude: payload.new.longitude, 
                  bateria: payload.new.bateria,
                  updated_at: payload.new.updated_at,
                  historial_coordenadas: nuevoHistorial
                };
              }
              return c;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalUbicaciones);
    };
  }, []);
  const listaFiltrada = elementos.filter((c) => {
    const coincideTexto = c.nombre_completo ? c.nombre_completo.toLowerCase().includes(filtroTexto.toLowerCase()) : false;
    const coincideProyecto = c.nombre_proyecto ? c.nombre_proyecto.toLowerCase().includes(filtroProyecto.toLowerCase()) : false;
    const coincideRol = rolSeleccionado ? (c.role ? c.role.toLowerCase() === rolSeleccionado.toLowerCase() : false) : true;
    return coincideTexto && coincideProyecto && coincideRol;
  });

  const renderIconoBateria = (porcentaje: number | undefined) => {
    if (porcentaje === undefined) return null;
    if (porcentaje > 50) return <Battery size={16} className="text-green-600 mr-1" />;
    if (porcentaje > 20) return <BatteryMedium size={16} className="text-amber-500 mr-1" />;
    return <BatteryLow size={16} className="text-red-600 mr-1 animate-pulse" />;
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-2xl font-bold text-slate-800">PERSONAL OPERATIVO Y LÍDERES</h2>
          <p className="text-xs md:text-sm text-slate-500">Seguridad Vip 3000 C.A. — Monitoreo GPS en Tiempo Real</p>
        </div>
        <button
          onClick={cargarDatos}
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm flex-shrink-0"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* BARRA SUPERIOR RESPONSIVA CON FILTROS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={16} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar elemento por nombre..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Briefcase size={16} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por proyecto o ruta..."
              value={filtroProyecto}
              onChange={(e) => setFiltroProyecto(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRolSeleccionado(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              !rolSeleccionado ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'
            }`}
          >
            Todos ({elementos.length})
          </button>
          <button
            onClick={() => setRolSeleccionado('directiva')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              rolSeleccionado === 'directiva' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-200'
            }`}
          >
            🔴 Directiva
          </button>
          <button
            onClick={() => setRolSeleccionado('lider')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              rolSeleccionado === 'lider' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-600 border-green-200'
            }`}
          >
            🟢 Líderes
          </button>
          <button
            onClick={() => setRolSeleccionado('operaciones')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              rolSeleccionado === 'operaciones' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-sky-600 border-sky-200'
            }`}
          >
            🔵 Operaciones
          </button>
        </div>
      </div>

      {/* MAPA Y LISTA DE MONITOREO RESPONSIVOS (1 COLUMNA EN MÓVIL, 3 EN PC) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-[380px] md:h-[500px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
          <MapContainer center={centroMapa} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ChangeView center={centroMapa} />
            
            {listaFiltrada.map((elemento) =>
              elemento.historial_coordenadas && elemento.historial_coordenadas.length > 1 ? (
                <Polyline 
                  key={`line-${elemento.id}`} 
                  positions={elemento.historial_coordenadas} 
                  pathOptions={{ color: '#0070f3', weight: 4, opacity: 0.7, dashArray: '5, 10' }} 
                />
              ) : null
            )}

            {listaFiltrada.map((elemento) =>
              typeof elemento.latitude === 'number' && typeof elemento.longitude === 'number' ? (
                <Marker 
                  key={elemento.id} 
                  position={[elemento.latitude, elemento.longitude]}
                  icon={crearIconoPersonalizado(elemento.role)}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <strong className="text-blue-600 text-sm block">{elemento.nombre_completo}</strong>
                      <div><strong>Rol:</strong> {elemento.role?.toUpperCase()}</div>
                      <div><strong>Ruta:</strong> {elemento.nombre_proyecto}</div>
                      {elemento.bateria !== undefined && <div><strong>Batería:</strong> {elemento.bateria}%</div>}
                    </div>
                  </Popup>
                </Marker>
              ) : null
            )}
          </MapContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm max-h-[450px] lg:max-h-[500px] overflow-y-auto">
          <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2.5 mb-2">
            Monitoreo en Vivo ({listaFiltrada.length})
          </h4>
          <ul className="divide-y divide-slate-100">
            {listaFiltrada.map((c) => {
              const tieneGps = typeof c.latitude === 'number' && typeof c.longitude === 'number';
              return (
                <li
                  key={c.id}
                  onClick={() => {
                    if (tieneGps) setCentroMapa([c.latitude!, c.longitude!]);
                  }}
                  className={`py-3 ${tieneGps ? 'cursor-pointer hover:bg-slate-50 rounded-lg px-2' : 'px-2'}`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="font-bold text-slate-800 text-sm truncate">{c.nombre_completo}</div>
                    {c.bateria !== undefined && (
                      <div className="flex items-center text-xs text-slate-500 flex-shrink-0">
                        {renderIconoBateria(c.bateria)}
                        <span>{c.bateria}%</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {c.role?.toUpperCase()} • {c.nombre_proyecto}
                  </div>
                  {tieneGps ? (
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        ● En Ruta ({c.latitude!.toFixed(4)}, {c.longitude!.toFixed(4)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block mt-1.5">
                      Sin señal GPS
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
