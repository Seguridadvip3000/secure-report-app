import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generarPDFFiniquitoVacaciones } from '../utils/pdfFiniquitosOficiales';
import { Palmtree, FileText, Calculator, Search } from 'lucide-react';

const MESES_ES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

const fmtFechaDDMMYYYY = (iso: string) => {
  if (!iso || !iso.includes('-')) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const fmtBs = (n: number) =>
  Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function VacacionesPage() {
  const [plantilla, setPlantilla] = useState<any[]>([]);
  const [vacacionesMarcadas, setVacacionesMarcadas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [trabajadorId, setTrabajadorId] = useState('');

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cedula, setCedula] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [periodoAnio, setPeriodoAnio] = useState('2025/2026');
  const [fechaNotificacion, setFechaNotificacion] = useState(
    new Date().toLocaleDateString('es-VE', { month: '2-digit', year: 'numeric' })
  );
  const [fechaSolicitud, setFechaSolicitud] = useState(
    new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
  const [gerenteRRHH, setGerenteRRHH] = useState('Yenire Paredes');

  const [sueldoMensual, setSueldoMensual] = useState<number>(130);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [fechaReintegro, setFechaReintegro] = useState<string>('');

  const [diasDisfruteBase, setDiasDisfruteBase] = useState<number>(15);
  const [diasDisfruteAdicionales, setDiasDisfruteAdicionales] = useState<number>(0);
  const [diasBonoBase, setDiasBonoBase] = useState<number>(15);
  const [diasBonoAdicionales, setDiasBonoAdicionales] = useState<number>(0);

  const [textoSabados, setTextoSabados] = useState<string>('');
  const [textoDomingos, setTextoDomingos] = useState<string>('');
  const [cantidadFeriadosAdicionales, setCantidadFeriadosAdicionales] = useState<number>(0);
  const [textoFeriadosAdicionales, setTextoFeriadosAdicionales] = useState<string>('');

  const [montoVacaciones, setMontoVacaciones] = useState<number>(0);
  const [montoBonoVacacional, setMontoBonoVacacional] = useState<number>(0);
  const [montoFeriadosDescanso, setMontoFeriadosDescanso] = useState<number>(0);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: pData } = await supabase
        .from('plantilla_proyectos')
        .select('*')
        .eq('estado', 'ACTIVO')
        .order('apellidos', { ascending: true });

      setPlantilla(Array.isArray(pData) ? pData : []);

      const { data: vData } = await supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .eq('estatus', 'VACACIONES')
        .order('fecha', { ascending: false })
        .limit(40);

      setVacacionesMarcadas(Array.isArray(vData) ? vData : []);
    };
    cargarDatos();
  }, []);
  const seleccionarTrabajador = (id: string) => {
    setTrabajadorId(id);
    const tr = plantilla.find((p) => String(p.id) === String(id));
    if (!tr) return;

    setNombreCompleto(`${tr.nombres || ''} ${tr.apellidos || ''}`.trim());
    setCedula(String(tr.cedula || ''));
    const fIng = tr.fecha_firma_contrato || tr.fecha_ingreso || '';
    setFechaIngreso(fIng ? fmtFechaDDMMYYYY(fIng) : '');

    if (fIng && fIng.includes('-')) {
      const inicio = new Date(`${fIng}T12:00:00`);
      const hoy = new Date();
      const aniosCumplidos = Math.max(
        1,
        Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      );
      const adicionales = Math.max(0, aniosCumplidos - 1);
      setDiasDisfruteBase(15);
      setDiasDisfruteAdicionales(adicionales);
      setDiasBonoBase(15);
      setDiasBonoAdicionales(adicionales);
    }
  };

  const recalcularPeriodoYMontos = (
    inicioISO: string,
    dBase: number,
    dAdic: number,
    bBase: number,
    bAdic: number,
    feriadosAdic: number,
    sueldo: number
  ) => {
    const salarioDiario = sueldo / 30;
    const totalDiasVac = dBase + dAdic;
    const totalDiasBono = bBase + bAdic;

    setMontoVacaciones(Number((totalDiasVac * salarioDiario).toFixed(2)));
    setMontoBonoVacacional(Number((totalDiasBono * salarioDiario).toFixed(2)));

    if (!inicioISO) return;

    const cursor = new Date(`${inicioISO}T12:00:00`);
    let habilesContados = 0;
    const sabsPorMes: Record<string, string[]> = {};
    const domsPorMes: Record<string, string[]> = {};
    let totalDescansos = 0;

    while (habilesContados < totalDiasVac) {
      const diaSem = cursor.getDay();
      const diaNum = String(cursor.getDate()).padStart(2, '0');
      const mesNom = MESES_ES[cursor.getMonth()];

      if (diaSem === 6) {
        sabsPorMes[mesNom] = [...(sabsPorMes[mesNom] || []), diaNum];
        totalDescansos++;
      } else if (diaSem === 0) {
        domsPorMes[mesNom] = [...(domsPorMes[mesNom] || []), diaNum];
        totalDescansos++;
      } else {
        habilesContados++;
      }
      if (habilesContados < totalDiasVac) {
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Sumar días adicionales por feriados dentro del período
    for (let i = 0; i < feriadosAdic; i++) {
      cursor.setDate(cursor.getDate() + 1);
      while (cursor.getDay() === 0 || cursor.getDay() === 6) {
        const diaNum = String(cursor.getDate()).padStart(2, '0');
        const mesNom = MESES_ES[cursor.getMonth()];
        if (cursor.getDay() === 6) sabsPorMes[mesNom] = [...(sabsPorMes[mesNom] || []), diaNum];
        if (cursor.getDay() === 0) domsPorMes[mesNom] = [...(domsPorMes[mesNom] || []), diaNum];
        totalDescansos++;
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const finISO = cursor.toLocaleDateString('en-CA');
    setFechaFin(finISO);

    const reintegro = new Date(cursor);
    reintegro.setDate(reintegro.getDate() + 1);
    while (reintegro.getDay() === 0 || reintegro.getDay() === 6) {
      reintegro.setDate(reintegro.getDate() + 1);
    }
    setFechaReintegro(reintegro.toLocaleDateString('en-CA'));

    const formatearMapa = (mapa: Record<string, string[]>) =>
      Object.entries(mapa)
        .map(([m, dias]) => `${dias.join(', ')} DE ${m}`)
        .join(' Y ');

    setTextoSabados(formatearMapa(sabsPorMes));
    setTextoDomingos(formatearMapa(domsPorMes));
    setMontoFeriadosDescanso(Number(((totalDescansos + feriadosAdic) * salarioDiario).toFixed(2)));
  };

  useEffect(() => {
    recalcularPeriodoYMontos(
      fechaInicio,
      diasDisfruteBase,
      diasDisfruteAdicionales,
      diasBonoBase,
      diasBonoAdicionales,
      cantidadFeriadosAdicionales,
      sueldoMensual
    );
  }, [
    fechaInicio,
    diasDisfruteBase,
    diasDisfruteAdicionales,
    diasBonoBase,
    diasBonoAdicionales,
    cantidadFeriadosAdicionales,
    sueldoMensual,
  ]);

  const totalPagar = Number(
    (Number(montoVacaciones || 0) + Number(montoBonoVacacional || 0) + Number(montoFeriadosDescanso || 0)).toFixed(2)
  );

  const emitirPDF = async () => {
    if (!nombreCompleto.trim() || !cedula.trim()) {
      alert('Seleccione o ingrese los datos del trabajador antes de emitir el finiquito.');
      return;
    }
    await generarPDFFiniquitoVacaciones({
      nombreCompleto,
      cedula,
      periodoAnio,
      fechaNotificacion,
      fechaSolicitud,
      fechaInicio: fmtFechaDDMMYYYY(fechaInicio),
      fechaFin: fmtFechaDDMMYYYY(fechaFin),
      fechaReintegro: fmtFechaDDMMYYYY(fechaReintegro),
      fechaIngreso,
      sueldoMensual,
      diasDisfruteBase,
      diasDisfruteAdicionales,
      diasBonoBase,
      diasBonoAdicionales,
      textoSabados,
      textoDomingos,
      cantidadFeriadosAdicionales,
      textoFeriadosAdicionales,
      montoVacaciones,
      montoBonoVacacional,
      montoFeriadosDescanso,
      totalPagar,
      gerenteRRHH,
    });
  };
  const plantillaFiltrada = plantilla.filter((p) =>
    !busqueda.trim()
      ? true
      : `${p.cedula} ${p.nombres} ${p.apellidos} ${p.proyecto}`
          .toLowerCase()
          .includes(busqueda.toLowerCase().trim())
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-emerald-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Gestión de Beneficios LOTTT — RRHH y Analista
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <Palmtree className="text-emerald-600" size={26} /> Vacaciones y Finiquito Oficial
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Calcula disfrute, días adicionales por antigüedad, bono vacacional, fines de semana, feriados y emite la notificación + solicitud oficial en PDF.
          </p>
        </div>

        <button
          type="button"
          onClick={emitirPDF}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer self-start md:self-center"
        >
          <FileText size={16} /> Emitir Finiquito Vacaciones PDF
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
          <Calculator size={16} className="text-emerald-600" /> 1. Selección de Trabajador y Datos del Período
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Buscar en Plantilla Activa</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Cédula, nombre o proyecto..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Seleccionar Trabajador</label>
            <select
              value={trabajadorId}
              onChange={(e) => seleccionarTrabajador(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <option value="">-- Seleccione un trabajador de la plantilla --</option>
              {plantillaFiltrada.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellidos}, {p.nombres} — C.I. {p.cedula} ({p.proyecto})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Nombre y Apellido Completo</label>
            <input
              type="text"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Cédula de Identidad</label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Fecha de Ingreso (DD/MM/AAAA)</label>
            <input
              type="text"
              value={fechaIngreso}
              onChange={(e) => setFechaIngreso(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Año Correspondiente</label>
            <input
              type="text"
              value={periodoAnio}
              onChange={(e) => setPeriodoAnio(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-blue-800 mb-1">Sueldo Mensual Base (Bs)</label>
            <input
              type="number"
              step="0.01"
              value={sueldoMensual}
              onChange={(e) => setSueldoMensual(Number(e.target.value))}
              className="w-full border border-blue-300 bg-blue-50/40 rounded-xl px-3 py-2 font-black"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Fecha Notificación (MM/AAAA)</label>
            <input
              type="text"
              value={fechaNotificacion}
              onChange={(e) => setFechaNotificacion(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Fecha Carta Solicitud</label>
            <input
              type="text"
              value={fechaSolicitud}
              onChange={(e) => setFechaSolicitud(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
            />
          </div>
        </div>
      </div>
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-sm font-black text-slate-800 uppercase">
          2. Días de Disfrute, Bono Vacacional, Feriados y Montos (Editable)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full border border-emerald-400 bg-emerald-50/30 rounded-xl px-2.5 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Fecha Reintegro</label>
            <input
              type="date"
              value={fechaReintegro}
              onChange={(e) => setFechaReintegro(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Días Disfrute</label>
            <input
              type="number"
              value={diasDisfruteBase}
              onChange={(e) => setDiasDisfruteBase(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Días Adic. Disfrute</label>
            <input
              type="number"
              value={diasDisfruteAdicionales}
              onChange={(e) => setDiasDisfruteAdicionales(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Días Bono Vac.</label>
            <input
              type="number"
              value={diasBonoBase}
              onChange={(e) => setDiasBonoBase(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Días Adic. Bono</label>
            <input
              type="number"
              value={diasBonoAdicionales}
              onChange={(e) => setDiasBonoAdicionales(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-xl px-2.5 py-2 font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Sábados en el Período</label>
            <input
              type="text"
              value={textoSabados}
              onChange={(e) => setTextoSabados(e.target.value)}
              placeholder="Ej: 19, 26 DE DICIEMBRE"
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Domingos en el Período</label>
            <input
              type="text"
              value={textoDomingos}
              onChange={(e) => setTextoDomingos(e.target.value)}
              placeholder="Ej: 20, 27 DE DICIEMBRE"
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Cant. Feriados Adicionales</label>
            <input
              type="number"
              value={cantidadFeriadosAdicionales}
              onChange={(e) => setCantidadFeriadosAdicionales(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Detalle Feriados Adicionales</label>
            <input
              type="text"
              value={textoFeriadosAdicionales}
              onChange={(e) => setTextoFeriadosAdicionales(e.target.value)}
              placeholder="Ej: 24, 25, 30, 31 DE DICIEMBRE 2026"
              className="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-2">
          <div>
            <label className="block font-bold text-blue-800 mb-1">Monto Vacaciones (Bs)</label>
            <input
              type="number"
              step="0.01"
              value={montoVacaciones}
              onChange={(e) => setMontoVacaciones(Number(e.target.value))}
              className="w-full border border-blue-300 bg-blue-50/40 rounded-xl px-3 py-2 font-black"
            />
          </div>
          <div>
            <label className="block font-bold text-indigo-800 mb-1">Monto Bono Vacacional (Bs)</label>
            <input
              type="number"
              step="0.01"
              value={montoBonoVacacional}
              onChange={(e) => setMontoBonoVacacional(Number(e.target.value))}
              className="w-full border border-indigo-300 bg-indigo-50/40 rounded-xl px-3 py-2 font-black"
            />
          </div>
          <div>
            <label className="block font-bold text-amber-800 mb-1">Feriados y Descanso (Bs)</label>
            <input
              type="number"
              step="0.01"
              value={montoFeriadosDescanso}
              onChange={(e) => setMontoFeriadosDescanso(Number(e.target.value))}
              className="w-full border border-amber-300 bg-amber-50/40 rounded-xl px-3 py-2 font-black"
            />
          </div>
          <div className="bg-slate-900 text-white rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total a Cancelar</span>
            <span className="text-lg font-black text-emerald-400">Bs. {fmtBs(totalPagar)}</span>
          </div>
        </div>

        <div className="pt-1">
          <label className="block text-xs font-bold text-slate-600 mb-1">Gerente de RRHH (Carta Solicitud)</label>
          <input
            type="text"
            value={gerenteRRHH}
            onChange={(e) => setGerenteRRHH(e.target.value)}
            className="w-full sm:w-72 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
          />
        </div>
      </div>

      {vacacionesMarcadas.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
          <h3 className="text-xs font-black text-slate-700 uppercase">
            Últimos Registros Marcados como VACACIONES en Asistencia
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {vacacionesMarcadas.slice(0, 9).map((v) => (
              <div key={v.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">{v.nombre_completo}</div>
                <div className="text-[11px] text-slate-500">
                  C.I. {v.cedula} • {v.proyecto} • {v.fecha}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
