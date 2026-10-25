import { Report } from '../types';

export const initialReports: Report[] = [
  {
    id: '1',
    title: 'Puerta principal dañada',
    description: 'Se detectó daño en la cerradura electrónica de la puerta principal del edificio A. La puerta no cierra correctamente y queda entreabierta.',
    category: 'mantenimiento',
    status: 'en_proceso',
    priority: 'alta',
    location: 'Edificio A - Entrada Principal',
    guardName: 'Carlos Martínez',
    date: '2026-01-15T08:30:00',
    createdAt: '2026-01-15T08:35:00',
    notes: 'Se contactó al técnico para reparación'
  },
  {
    id: '2',
    title: 'Persona no identificada en zona restringida',
    description: 'Se observó a una persona sin identificación en el área de estacionamiento subterráneo nivel -2. Se le solicitó identificación pero no portaba credencial.',
    category: 'acceso_no_autorizado',
    status: 'resuelto',
    priority: 'critica',
    location: 'Estacionamiento Subterráneo N2',
    guardName: 'María López',
    date: '2026-01-14T22:15:00',
    createdAt: '2026-01-14T22:20:00',
    notes: 'La persona resultó ser un empleado nuevo sin credencial temporal. Se le escoltó a la oficina de RRHH.'
  },
  {
    id: '3',
    title: 'Cámara CCTV fuera de servicio',
    description: 'La cámara CCTV-07 del pasillo del tercer piso no está transmitiendo imagen. Se verificó la conexión y parece ser un problema de hardware.',
    category: 'mantenimiento',
    status: 'pendiente',
    priority: 'media',
    location: 'Edificio B - Piso 3, Pasillo Central',
    guardName: 'Roberto Sánchez',
    date: '2026-01-15T10:00:00',
    createdAt: '2026-01-15T10:05:00'
  },
  {
    id: '4',
    title: 'Ronda nocturna completada sin novedades',
    description: 'Ronda de seguridad nocturna realizada en todas las áreas. Sin incidentes que reportar. Todas las puertas y accesos verificados.',
    category: 'novedad_rutinaria',
    status: 'resuelto',
    priority: 'baja',
    location: 'Todas las áreas',
    guardName: 'Ana García',
    date: '2026-01-15T04:00:00',
    createdAt: '2026-01-15T04:30:00'
  },
  {
    id: '5',
    title: 'Alarma activada en bodega 3',
    description: 'Se activó la alarma de movimiento en la bodega 3 a las 02:45 AM. Se realizó verificación y se encontró que fue activada por un gato que ingresó por una ventilación.',
    category: 'alerta',
    status: 'resuelto',
    priority: 'alta',
    location: 'Bodega 3 - Ala Norte',
    guardName: 'Pedro Ramírez',
    date: '2026-01-14T02:45:00',
    createdAt: '2026-01-14T02:50:00',
    notes: 'Se selló la ventilación para evitar futuros ingresos de animales.'
  },
  {
    id: '6',
    title: 'Vehículo sospechoso merodeando',
    description: 'Un vehículo tipo camioneta blanca sin placas visibles ha sido visto merodeando la zona norte del perímetro en tres ocasiones durante el turno.',
    category: 'alerta',
    status: 'pendiente',
    priority: 'alta',
    location: 'Perímetro Norte - Zona de carga',
    guardName: 'Luis Hernández',
    date: '2026-01-15T14:20:00',
    createdAt: '2026-01-15T14:25:00'
  },
  {
    id: '7',
    title: 'Falla en sistema de iluminación exterior',
    description: 'Tres postes de iluminación exterior en el área del parking de visitantes no funcionan. Se reporta para mantenimiento urgente ya que reduce la visibilidad nocturna.',
    category: 'mantenimiento',
    status: 'en_proceso',
    priority: 'media',
    location: 'Parking Visitantes - Sector Este',
    guardName: 'Carlos Martínez',
    date: '2026-01-15T18:00:00',
    createdAt: '2026-01-15T18:10:00',
    notes: 'Orden de trabajo #MT-2026-045 generada'
  },
  {
    id: '8',
    title: 'Intento de acceso con credencial vencida',
    description: 'Un empleado intentó acceder al edificio C con credencial vencida desde el 10 de enero. Se le indicó renovar su credencial en administración.',
    category: 'incidente',
    status: 'resuelto',
    priority: 'media',
    location: 'Edificio C - Acceso Principal',
    guardName: 'María López',
    date: '2026-01-15T07:45:00',
    createdAt: '2026-01-15T07:50:00',
    notes: 'Empleado notificado. Credencial en proceso de renovación.'
  }
];
