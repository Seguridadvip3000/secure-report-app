import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { RefreshCw } from 'lucide-react';
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

// Función para cambiar el color del pin según tus roles reales de la organización
const crearIconoPersonalizado = (role: string) => {
  let color = 'blue'; // Por defecto OPERACIONES
  const rolMinuscula = role.toLowerCase();
  
  if (rolMinuscula === 'directiva') color = 'red';
  if (rolMinuscula === 'lider') color = 'green';

  return new L.Icon({
    iconUrl: `https://githubusercontent.com{color}.png`,
    shadowUrl: 'https://cloudflare.com',
    iconSize:,
    iconAnchor:,
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

interface Custodio {
  id: string;
  nombre_completo: string;
  role: string;
  proyectos?: { nombre_proyecto: string } | any;
  latitude?: number;
  longitude?: number;
  bateria?: number;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function SeguimientoRutasPage() {
  const [custodios, setCustodios] = useState<Custodio[]>([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const centroCaracas: [number, number] = [10.4914, -66.8486];

  const cargarDatos = async () => {
    setLoading(true);
    // Consulta con tus roles exactos mapeados en la base de datos
    const { data: usersData } = await supabase
      .from('users')
      .select('id, nombre_completo, role, proyectos(nombre_proyecto)')
      .in('role', ['LIDER', 'OPERACIONES', 'DIRECTIVA', 'lider', 'operaciones', 'directiva']);

    const { data: locationsData } = await supabase
      .from('user_locations')
      .select('user_id, latitude, longitude, bateria')
      .order('updated_at', { ascending: false });

    if (usersData) {
      const listaCombinada = usersData.map((user: any) => {
        const ultimaLoc = locationsData?.find((loc) => loc.user_id === user.id);
        return {
          ...user,
          latitude: ultimaLoc?.latitude,
          longitude: ultimaLoc?.longitude,
          bateria: ultimaLoc?.bateria,
        };
      });
      setCustodios(listaCombinada);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();

    const canalUbicaciones = supabase
      .channel('cambios-ubicacion-en-vivo')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_locations' },
        (payload) => {
          setCustodios((prev) =>
            prev.map((c) =>
              c.id === payload.new.user_id
                ? { ...c, latitude: payload.new.latitude, longitude: payload.new.longitude, bateria: payload.new.bateria }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalUbicaciones);
    };
  }, []);

  const listaFiltrada = custodios.filter((c) => {
    const coincideTexto = c.nombre_completo.toLowerCase().includes(filtroTexto.toLowerCase());
    const coincideRol = rolSeleccionado ? c.role.toLowerCase() === rolSeleccionado.toLowerCase() : true;
    return coincideTexto && coincideRol;
  });

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
          placeholder="Buscar custodio por nombre..."
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
            
            {listaFiltrada.map((custodio) => (
              custodio.latitude && custodio.longitude ? (
                <Marker 
                  key={custodio.id} 
                  position={[custodio.latitude, custodio.longitude]}
                  icon={crearIconoPersonalizado(custodio.role)}
                >
                  <Popup>
                    <div style={{ fontSize: '13px' }}>
                      <strong style={{ color: '#0070f3' }}>{custodio.nombre_completo}</strong><br />
                      <strong>Rol:</strong> {custodio.role.toUpperCase()}<br />
                      <strong>Ruta:</strong> {custodio.proyectos?.nombre_proyecto || 'Zona Operativa Registrada 1'}<br />
                      {custodio.bateria && <span><strong>Batería:</strong> {custodio.bateria}%</span>}
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}
          </MapContainer>
        </div>

        {/* PANEL LATERAL */}
        <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '15px', maxHeight: '500px', overflowY: 'auto' }}>
          <h4 style={{ margin: '0 0 10px 0', borderBottom: '2px solid #f1f3f5', paddingBottom: '8px' }}>Monitoreo ({listaFiltrada.length})</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {listaFiltrada.map((c) => (
              <li key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f3f5' }}>
                <div style={{ fontWeight: 'bold' }}>{c.nombre_completo}</div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  {c.role.toUpperCase()} | {c.proyectos?.nombre_proyecto || 'Zona Operativa 1'}
                </div>
                {c.latitude ? (
                  <span style={{ fontSize: '11px', color: '#28a745', background: '#d4edda', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>En Ruta</span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#dc3545', background: '#f8d7da', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>Sin señal GPS</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
