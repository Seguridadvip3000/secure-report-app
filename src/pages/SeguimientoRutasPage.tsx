import React from 'react';

export default function SeguimientoRutasPage() {
  return (
    <div className="p-6 bg-white rounded-xl shadow-md max-w-4xl mx-auto mt-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800">
          Monitoreo de Rutas en Tiempo Real
        </h2>
      </div>
      <p className="text-slate-600 mb-6">
        Panel de control exclusivo para la Directiva de Seguridad Vip 3000 C.A.
      </p>
      
      {/* Vista de mapa temporal de contingencia */}
      <div className="w-full h-96 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center text-slate-500">
        <span className="text-4xl mb-2">📍</span>
        <p className="font-semibold text-slate-700">Sistema GPS de Rutas Conectado</p>
        <p className="text-sm text-slate-400 mt-1">Coordenadas base: Caracas (10.4806, -66.9036)</p>
      </div>
    </div>
  );
}