import { Report, User } from '../types';

// Nota: Con el nuevo sistema de autenticación de Supabase,
// los usuarios se gestionan completamente a través de Supabase Auth.
// Estos datos iniciales son solo para referencia y no se usan en producción.

export const initialUsers: User[] = [];

export const initialReports: Report[] = [
  {
    id: '1',
    fechaHora: '2026-01-15T08:30:00',
    proyecto: 'ESTACIONAMIENTO CCCT',
    tituloNovedad: 'Daño a las instalaciones',
    desarrollo: 'Se detectó daño en la cerradura electrónica de la puerta principal del estacionamiento. La puerta no cierra correctamente y queda entreabierta, lo que representa un riesgo de seguridad para los vehículos estacionados.',
    evidencias: [],
    ubicacionGPS: { lat: 10.4806, lng: -66.8738, address: 'CCCT, Chuao, Caracas' },
    quienReporta: 'Carlos Martínez',
    createdBy: 'user-002',
    status: 'aprobado',
    createdAt: '2026-01-15T08:35:00',
    notes: 'Se contactó al técnico para reparación',
    approvedByOperaciones: 'user-004',
    approvedAtOperaciones: '2026-01-15T09:00:00',
    visibleForClient: true,
    emailEnviadoA: 'ana@cliente.com',
    emailEnviadoAt: '2026-01-15T09:05:00',
  },
  {
    id: '2',
    fechaHora: '2026-01-14T22:15:00',
    proyecto: 'COMERCIO CCCT',
    tituloNovedad: 'Sospechoso',
    desarrollo: 'Se observó a una persona sin identificación merodeando el área de estacionamiento subterráneo nivel -2 durante más de 20 minutos. Se le solicitó identificación pero no portaba credencial. La persona se retiró al ser confrontada.',
    evidencias: [],
    ubicacionGPS: { lat: 10.4808, lng: -66.8740, address: 'Estacionamiento N2, CCCT' },
    quienReporta: 'Luis Pérez',
    createdBy: 'user-003',
    status: 'aprobado',
    createdAt: '2026-01-14T22:20:00',
    notes: 'Se revisaron cámaras y se identificó al individuo',
    approvedByOperaciones: 'user-004',
    approvedAtOperaciones: '2026-01-14T23:00:00',
    visibleForClient: true,
    emailEnviadoA: 'ana@cliente.com',
    emailEnviadoAt: '2026-01-14T23:05:00',
  },
  {
    id: '3',
    fechaHora: '2026-01-15T10:00:00',
    proyecto: 'CC VIZCAYA',
    tituloNovedad: 'Falla del sistema de seguridad (CCTV/Alarmas)',
    desarrollo: 'La cámara CCTV-07 del pasillo del tercer piso no está transmitiendo imagen. Se verificó la conexión y parece ser un problema de hardware. Se requiere mantenimiento urgente.',
    evidencias: [],
    ubicacionGPS: { lat: 10.4850, lng: -66.8600, address: 'CC Vizcaya, Piso 3' },
    quienReporta: 'Luis Pérez',
    createdBy: 'user-003',
    status: 'pendiente',
    createdAt: '2026-01-15T10:05:00',
    visibleForClient: false,
  },
];
