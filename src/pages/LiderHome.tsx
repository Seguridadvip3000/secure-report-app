import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Importamos el contexto de autenticación
import { AttendanceButton } from '../components/AttendanceButton';

export default function LiderHome() {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Extraemos las dos variables críticas: el usuario y sus datos

  // Validamos el primer proyecto asignado de su arreglo text[] en la base de datos
  const proyectoActual = currentUser?.proyectos && currentUser.proyectos.length > 0 
    ? currentUser.proyectos[0] 
    : 'Sin Proyecto Asignado';

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      {/* Encabezado de Bienvenida Institucional */}
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl font-bold text-slate-800">
          ¡Saludos, {currentUser?.nombre_completo || currentUser?.username || 'Efectivo'}!
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Panel de Control de Guardia - Seguridad Vip 3000 C.A.
        </p>
      </div>

      {/* COMPONENTE INTERACTIVO DE ASISTENCIA (Entrada / Salida con GPS) */}
      <div className="mb-6">
        {currentUser && (
          <AttendanceButton 
            user={{
              id: currentUser.id,
              name: currentUser.nombre_completo || currentUser.username || 'Efectivo',
              role: currentUser.role
            }}
            proyectoActual={proyectoActual}
          />
        )}
      </div>

      {/* Acceso Directo al Formulario de Novedades */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow-md border border-slate-100 text-center">
        <p className="text-sm text-slate-600 mb-3 font-medium">
          ¿Necesitas reportar una novedad o incidencia en tu puesto de control?
        </p>
        <button
          onClick={() => navigate('/nuevo')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm text-sm"
        >
          📝 Crear Nuevo Reporte de Novedad
        </button>
      </div>
    </div>
  );
}