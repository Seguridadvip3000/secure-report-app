import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LiderHome() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirigir directamente al formulario de crear reporte
    navigate('/nuevo');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Redirigiendo al formulario de reporte...</p>
      </div>
    </div>
  );
}
