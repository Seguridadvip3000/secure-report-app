import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { RefreshCw, Battery, BatteryMedium, BatteryLow } from 'lucide-react';
import L from 'leaflet';
import { supabase } from '../lib/supabase';

import 'leaflet/dist/leaflet.css';

// CORRECCIÓN DEFINITIVA DE ICONOS PARA VERCEL (CDN Oficial)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cloudflare.com',
  iconRetinaUrl: 'https://cloudflare.com',
  shadowUrl: 'https://cloudflare.com',
});

// Función para cambiar el color del pin según tus roles reales con tamaños definidos
const crearIconoPersonalizado = (role: string) => {
  const rolMinuscula = role ? role.toLowerCase() : '';
  let colorFondo = '#0070f3'; // Azul por defecto (OPERACIONES)

  if (rolMinuscula === 'directiva') colorFondo = '#dc3545'; // Rojo
  if (rolMinuscula === 'lider') colorFondo = '#28a745';    // Verde
  if (rolMinuscula === 'administrador') colorFondo = '#f5a623'; // Dorado/Amarillo

  // Generamos un pin moderno y circular mediante HTML puro para evitar errores de carga de imágenes
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
  proyecto_id?: string;
  nombre_proyecto?: string;
  latitude?: number;
  longitude?: number;
  bateria?: number;
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
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const centroCaracas: [number, number] = [10.4914, -66.8486];

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. SOLICITAMOS LOS USUARIOS DIRECTAMENTE
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nombre_completo, role');

      if (usersError) throw usersError;

      // 2. CARGAMOS EL HISTÓRICO DE UBICACIONES ORDENADO CRONOLÓGICAMENTE
      const { data: locationsData, error: locationsError } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, bateria, updated_at')
        .order('updated_at', { ascending: true });

      if (locationsError) throw locationsError;

      if (usersData) {
        const rolesPermitidos = ['lider', 'operaciones', 'directiva', 'administrador'];
        
        const listaCombinada = usersData
          .filter((user: any) => user.role && rolesPermitidos.includes(user.role.toLowerCase()))
          .map((user: any) => {
            const posicionesUsuario = locationsData?.filter((loc) => loc.user_id === user.id) || [];
            const ultimaLoc = posicionesUsuario.length > 0 ? posicionesUsuario[posicionesUsuario.length - 1] : null;
            const rolMinuscula = user.role.toLowerCase();

            let nombreProyectoDisplay = 'Zona Operativa Asignada';
            if (['administrador', 'directiva', 'operaciones'].includes(rolMinuscula)) {
              nombreProyectoDisplay = 'Acceso Global / Todos';
            }

            const trazadoRuta = posicionesUsuario.map((loc): [number, number] => [loc.latitude, loc.longitude]);
            
            return {
              ...user,
              latitude: ultimaLoc?.latitude,
              longitude: ultimaLoc?.longitude,
              bateria: ultimaLoc?.bateria, // Sincronización del nivel de energía
              nombre_proyecto: nombreProyectoDisplay,
              historial_coordenadas: trazadoRuta
            };
          });

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
        { event: 'INSERT', schema: 'public', table: 'user_locations' },
        (payload) => {
          setElementos((prev) =>
            prev.map((c) => {
              if (c.id === payload.new.user_id) {
                const nuevaCoord: [number, number] = [payload.new.latitude, payload.new.longitude];
                const nuevoHistorial = c.historial_coordenadas ? [...c.historial_coordenadas, nuevaCoord] : [nuevaCoord];
                return { 
                  ...c, 
                  latitude: payload.new.latitude, 
                  longitude: payload.new.longitude, 
                  bateria: payload.new.bateria, // Actualización en vivo mediante WebSocket
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
    const coincideRol = rolSeleccionado ? (c.role ? c.role.toLowerCase() === rolSeleccionado.toLowerCase() : false) : true;
    return coincideTexto && coincideRol;
  });
  // Función auxiliar para renderizar el icono de batería adecuado según el porcentaje
  const renderIconoBateria = (porcentaje: number | undefined) => {
    if (porcentaje === undefined) return null;
    if (porcentaje > 50) return <Battery size={16} color="#28a745" style={{ marginRight: '4px' }} />;
    if (porcentaje > 20) return <BatteryMedium size={16} color="#f5a623" style={{ marginRight: '4px' }} />;
    return <BatteryLow size={16} color="#dc3545" style={{ marginRight: '4px' }} className="animate-pulse" />;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: '#333', margin: 0 }}>PERSONAL OPERATIVO Y LÍDERES</h2>
          <small style={{ color: '#666' }}>Seguridad Vip 3000 C.A. — Monitoreo en Tiempo Real</small>
        </div>
        <button onClick={cargarDatos} style={{ padding: '10px', borderRadius: '5px', cursor: 'pointer', background: '#fff', border: '1px solid #ccc' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* BARRA SUPERIOR DE FILTROS ACTUALIZADA */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#f8f9fa', padding: '15px', borderRadius: '10px', border: '1px solid #e9ecef', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar elemento por nombre..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          style={{ padding: '10px', width: '280px', borderRadius: '6px', border: '1px solid #ced4da' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setRolSeleccionado(null)} style={{ padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #0070f3', background: !rolSeleccionado ? '#0070f3' : '#fff', color: !rolSeleccionado ? '#fff' : '#0070f3' }}>
            Todos
          </button>
          <button onClick={() => setRolSeleccionado('directiva')} style={{ padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #dc3545', background: rolSeleccionado === 'directiva' ? '#dc3545' : '#fff', color: rolSeleccionado === 'directiva' ? '#fff' : '#dc3545' }}>
            🔴 Directiva
          </button>
          <button onClick={() => setRolSeleccionado('lider')} style={{ padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #28a745', background: rolSeleccionado === 'lider' ? '#28a745' : '#fff', color: rolSeleccionado === 'lider' ? '#fff' : '#28a745' }}>
            🟢 Líderes
          </button>
          <button onClick={() => setRolSeleccionado('operaciones')} style={{ padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #0070f3', background: rolSeleccionado === 'operaciones' ? '#0070f3' : '#fff', color: rolSeleccionado === 'operaciones' ? '#fff' : '#0070f3' }}>
            🔵 Operaciones
          </button>
        </div>
      </div>

      {/* MAPA Y LISTADO */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
          <MapContainer center={centroCaracas} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
            <TileLayer
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ChangeView center={centroCaracas} />
            
            {/* RENDERIZADO DE LÍNEAS DE RECORRIDO (POLYLINE) */}
            {listaFiltrada.map((elemento) => (
              elemento.historial_coordenadas && elemento.historial_coordenadas.length > 1 ? (
                <Polyline 
                  key={`line-${elemento.id}`} 
                  positions={elemento.historial_coordenadas} 
                  pathOptions={{ color: '#0070f3', weight: 4, opacity: 0.7, dashArray: '5, 10' }} 
                />
              ) : null
            ))}

            {/* RENDERIZADO DE MARCADORES */}
            {listaFiltrada.map((elemento) => (
              elemento.latitude && elemento.longitude ? (
                <Marker 
                  key={elemento.id} 
                  position={[elemento.latitude, elemento.longitude]}
                  icon={crearIconoPersonalizado(elemento.role)}
                >
                  <Popup>
                    <div style={{ fontSize: '13px' }}>
                      <strong style={{ color: '#0070f3' }}>{elemento.nombre_completo}</strong><br />
                      <strong>Rol:</strong> {elemento.role ? elemento.role.toUpperCase() : ''}<br />
                      <strong>Ruta:</strong> {elemento.nombre_proyecto}<br />
                      {elemento.bateria !== undefined && <span><strong>Batería:</strong> {elemento.bateria}%</span>}
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}
          </MapContainer>
        </div>

        {/* PANEL LATERAL CON BATERÍA INTEGRADA */}
        <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '15px', maxHeight: '500px', overflowY: 'auto' }}>
          <h4 style={{ margin: '0 0 10px 0', borderBottom: '2px solid #f1f3f5', paddingBottom: '8px' }}>Monitoreo ({listaFiltrada.length})</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {listaFiltrada.map((c) => (
              <li key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f3f5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold' }}>{c.nombre_completo}</div>
                  {c.bateria !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#6c757d' }}>
                      {renderIconoBateria(c.bateria)}
                      <span>{c.bateria}%</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                  {c.role ? c.role.toUpperCase() : ''} | {c.nombre_proyecto}
                </div>
                {c.latitude ? (
                  <span style={{ fontSize: '11px', color: '#28a745', background: '#d4edda', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>En Ruta</span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#dc3545', background: '#f8d7da', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>Sin señal GPS</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
