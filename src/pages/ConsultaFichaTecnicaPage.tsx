import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { generarPDFFichaTecnica } from '../utils/pdfFichaTecnica';
import { Search, Download, Printer, UserCheck, AlertCircle } from 'lucide-react';

export default function ConsultaFichaTecnicaPage() {
  const [cedulaQuery, setCedulaQuery] = useState('');
  const [ficha, setFicha] = useState<any | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const buscarFichaPorCedula = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpia = cedulaQuery.replace(/\D/g, '');
    if (!limpia) return;

    setBuscando(true);
    setErrorMsg(null);
    setFicha(null);

    try {
      const { data, error } = await supabase
        .from('aspirantes_reclutamiento')
        .select('*')
        .ilike('cedula', `%${limpia}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) {
        setErrorMsg(`No existe Ficha Técnica registrada para la cédula "${limpia}".`);
        return;
      }
      setFicha(data.at(0));
    } catch (err: any) {
      setErrorMsg('Error consultando ficha: ' + (err?.message || 'Verifique conexión.'));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-blue-600">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          Consulta Operativa y Recursos Humanos
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
          <UserCheck className="text-blue-600" size={26} /> Consulta de Ficha Técnica por Cédula
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ingrese el número de cédula para visualizar la ficha integral, fotografía, contactos de emergencia, cuenta bancaria, tallas y descargar el PDF oficial.
        </p>
      </div>

      <form
        onSubmit={buscarFichaPorCedula}
        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            required
            value={cedulaQuery}
            onChange={(e) => setCedulaQuery(e.target.value)}
            placeholder="Ingrese número de cédula (Ej: 20123456)..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold"
          />
        </div>
        <button
          type="submit"
          disabled={buscando}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-50"
        >
          {buscando ? 'Buscando...' : 'Buscar Ficha Técnica'}
        </button>
      </form>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {ficha && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-4">
              {ficha.foto_carnet_url && (
                <img
                  src={ficha.foto_carnet_url}
                  alt="Foto Carnet"
                  className="w-20 h-24 rounded-xl object-cover border-2 border-slate-300"
                />
              )}
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                  {ficha.estatus_seleccion}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {ficha.nombres} {ficha.apellidos}
                </h2>
                <p className="text-xs text-slate-600">
                  C.I. <strong>{ficha.nacionalidad}-{ficha.cedula}</strong> • RIF: <strong>{ficha.rif || 'N/A'}</strong> • Tel:{' '}
                  <strong>{ficha.telefono_celular || 'N/A'}</strong>
                </p>
                {ficha.proyecto_asignado && (
                  <p className="text-xs text-indigo-800 font-bold mt-0.5">
                    Proyecto: {ficha.proyecto_asignado} • Cargo: {ficha.cargo_asignado} • Horario: {ficha.turno_asignado}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => generarPDFFichaTecnica(ficha, 'DESCARGAR')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Descargar Ficha PDF
              </button>
              <button
                type="button"
                onClick={() => generarPDFFichaTecnica(ficha, 'IMPRIMIR')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} /> Imprimir
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <div className="font-black text-slate-700 uppercase">Ubicación y Emergencias</div>
              <div>Estado / Municipio: <strong>{ficha.estado_residencia} / {ficha.municipio}</strong></div>
              <div>Dirección: <strong>{ficha.direccion_domicilio}</strong></div>
              <div>Punto Referencia: <strong>{ficha.punto_referencia}</strong></div>
              <div>
                Emergencia 1: <strong>{ficha.contacto_emergencia_1_nombre} ({ficha.contacto_emergencia_1_parentesco}) — {ficha.contacto_emergencia_1_telefono}</strong>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <div className="font-black text-slate-700 uppercase">Datos Bancarios, Salud y Dotación</div>
              <div>Banco: <strong>{ficha.banco} ({ficha.tipo_cuenta})</strong></div>
              <div>N° Cuenta: <strong className="font-mono">{ficha.numero_cuenta}</strong></div>
              <div>Grupo Sanguíneo: <strong>{ficha.grupo_sanguineo}</strong> • Alergias: <strong>{ficha.alergias_condiciones}</strong></div>
              <div>
                Tallas: <strong>Camisa {ficha.talla_camisa} | Pantalón {ficha.talla_pantalon} | Botas {ficha.talla_botas} | Estatura {ficha.estatura}m</strong>
              </div>
            </div>
          </div>

          {ficha.foto_cedula_url && (
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-600 uppercase mb-1.5">Cédula de Identidad Digitalizada</div>
              <img
                src={ficha.foto_cedula_url}
                alt="Foto Cédula"
                className="max-h-56 rounded-xl border border-slate-300 object-contain"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
