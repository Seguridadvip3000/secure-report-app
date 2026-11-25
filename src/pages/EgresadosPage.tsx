import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import {
  UserMinus,
  Search,
  FileSpreadsheet,
  FileText,
  Calculator,
  X,
  History,
} from 'lucide-react';

const cargarLogoBase64 = async (): Promise<string | null> => {
  try {
    const resp = await fetch('/logo-vip3000.jpg');
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const fmtBs = (n: number) =>
  Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function EgresadosPage() {
  const { currentUser } = useAuth();
  const puedeLiquidar = ['analista', 'rrhh', 'recursos_humanos', 'directiva', 'administrador', 'admin'].includes(
    (currentUser?.role || '').toLowerCase()
  );

  const [egresados, setEgresados] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroElegibilidad, setFiltroElegibilidad] = useState<string>('TODOS');
  const [cargando, setCargando] = useState(false);

  const [egresadoLiquidar, setEgresadoLiquidar] = useState<any | null>(null);
  const [historialDotacion, setHistorialDotacion] = useState<any[]>([]);
  const [infoBotasPlantilla, setInfoBotasPlantilla] = useState<any | null>(null);

  const [salarioDiarioBase, setSalarioDiarioBase] = useState<number>(43.33);
  const [diasAntiguedad, setDiasAntiguedad] = useState<number>(0);
  const [diasVacaciones, setDiasVacaciones] = useState<number>(0);
  const [diasBonoVacacional, setDiasBonoVacacional] = useState<number>(0);
  const [diasUtilidades, setDiasUtilidades] = useState<number>(0);
  const [diasPendientesPago, setDiasPendientesPago] = useState<number>(0);
  const [otrosDevengadosLiq, setOtrosDevengadosLiq] = useState<number>(0);

  const [cuotasBotasPendientes, setCuotasBotasPendientes] = useState<number>(0);
  const [tasaEmpresaLiq, setTasaEmpresaLiq] = useState<number>(0);
  const [otrasDeduccionesLiq, setOtrasDeduccionesLiq] = useState<number>(0);

  const cargarEgresados = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('egresados_empresa')
        .select('*')
        .order('fecha_egreso', { ascending: false });

      if (error) throw error;
      setEgresados(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando egresados:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEgresados();
  }, []);

  const actualizarElegibilidad = async (id: string, nuevoEstado: string) => {
    try {
      await supabase
        .from('egresados_empresa')
        .update({ elegible_reingreso: nuevoEstado })
        .eq('id', id);
      await cargarEgresados();
    } catch (err) {
      console.error('Error actualizando elegibilidad:', err);
    }
  };
  const abrirCalculadoraLiquidacion = async (eg: any) => {
    if (!puedeLiquidar) return;
    setEgresadoLiquidar(eg);
    setHistorialDotacion([]);
    setInfoBotasPlantilla(null);

    let diasTotales = 0;
    if (eg.fecha_ingreso && eg.fecha_egreso) {
      const f1 = new Date(eg.fecha_ingreso);
      const f2 = new Date(eg.fecha_egreso);
      diasTotales = Math.max(1, Math.round((f2.getTime() - f1.getTime()) / (1000 * 60 * 60 * 24)));
    }
    const mesesAprox = diasTotales / 30;

    setSalarioDiarioBase(43.33);
    setDiasAntiguedad(Number((mesesAprox * 5).toFixed(2)));
    setDiasVacaciones(Number(((mesesAprox / 12) * 15).toFixed(2)));
    setDiasBonoVacacional(Number(((mesesAprox / 12) * 15).toFixed(2)));
    setDiasUtilidades(Number(((mesesAprox / 12) * 30).toFixed(2)));
    setDiasPendientesPago(0);
    setOtrosDevengadosLiq(0);
    setOtrasDeduccionesLiq(0);

    try {
      const ced = String(eg.cedula || '').toUpperCase();
      const { data: histData } = await supabase
        .from('historial_dotacion_oficial')
        .select('*')
        .eq('cedula', ced)
        .order('created_at', { ascending: false });

      setHistorialDotacion(Array.isArray(histData) ? histData : []);

      const { data: plantData } = await supabase
        .from('plantilla_proyectos')
        .select('*')
        .eq('cedula', ced)
        .order('created_at', { ascending: false })
        .limit(1);

      const regPlant = Array.isArray(plantData) && plantData.length > 0 ? plantData.at(0) : null;
      setInfoBotasPlantilla(regPlant);

      if (regPlant?.botas_nuevas && !regPlant?.botas_devueltas) {
        const pag = Number(regPlant.botas_cuotas_pagadas || 0);
        const tot = Number(regPlant.botas_cuotas_totales || 4);
        setCuotasBotasPendientes(Math.max(0, tot - pag));
      } else {
        setCuotasBotasPendientes(0);
      }
    } catch {}
  };

  const calcularTotalesLiquidacion = () => {
    const montoAntiguedad = diasAntiguedad * salarioDiarioBase;
    const montoVacaciones = diasVacaciones * salarioDiarioBase;
    const montoBonoVac = diasBonoVacacional * salarioDiarioBase;
    const montoUtilidades = diasUtilidades * salarioDiarioBase;
    const montoDiasPend = diasPendientesPago * salarioDiarioBase;
    const totalAsignaciones =
      montoAntiguedad +
      montoVacaciones +
      montoBonoVac +
      montoUtilidades +
      montoDiasPend +
      Number(otrosDevengadosLiq || 0);

    const montoBotasDescuento = cuotasBotasPendientes * 7.5 * tasaEmpresaLiq;
    const totalDeducciones = montoBotasDescuento + Number(otrasDeduccionesLiq || 0);
    const netoLiquidacion = Math.max(0, totalAsignaciones - totalDeducciones);

    return {
      montoAntiguedad,
      montoVacaciones,
      montoBonoVac,
      montoUtilidades,
      montoDiasPend,
      totalAsignaciones,
      montoBotasDescuento,
      totalDeducciones,
      netoLiquidacion,
    };
  };
  const descargarPDFLiquidacion = async () => {
    if (!egresadoLiquidar || !puedeLiquidar) return;
    const tot = calcularTotalesLiquidacion();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const logo = await cargarLogoBase64();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 216, 28, 'F');
    if (logo) {
      try {
        doc.addImage(logo, 'JPEG', 12, 4, 20, 20);
      } catch {}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SEGURIDAD VIP 3000 C.A. — RIF: J-29491549-3', 38, 12);
    doc.setFontSize(10);
    doc.setTextColor(147, 197, 253);
    doc.text('PLANILLA DE LIQUIDACIÓN DE PRESTACIONES SOCIALES', 38, 19);

    let y = 38;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.text(`TRABAJADOR: ${egresadoLiquidar.nombres} ${egresadoLiquidar.apellidos}`, 14, y);
    doc.text(`C.I.: ${egresadoLiquidar.cedula}`, 150, y);
    y += 6;
    doc.text(`CARGO: ${egresadoLiquidar.cargo || 'OFICIAL'}`, 14, y);
    doc.text(`PROYECTO EGRESO: ${egresadoLiquidar.proyecto_egreso || ''}`, 95, y);
    y += 6;
    doc.text(`FECHA INGRESO: ${egresadoLiquidar.fecha_ingreso || 'N/A'}`, 14, y);
    doc.text(`FECHA EGRESO: ${egresadoLiquidar.fecha_egreso || 'N/A'}`, 95, y);
    y += 6;
    doc.text(`SALARIO DIARIO BASE: Bs. ${fmtBs(salarioDiarioBase)}`, 14, y);
    y += 8;

    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, 188, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('ASIGNACIONES / CONCEPTOS DEVENGADOS', 16, y + 4.2);
    doc.text('DÍAS', 135, y + 4.2, { align: 'right' });
    doc.text('MONTO (Bs)', 199, y + 4.2, { align: 'right' });
    y += 10;

    const filasAsig: [string, string, string][] = [
      ['Garantía de Prestaciones Sociales / Antigüedad', String(diasAntiguedad), fmtBs(tot.montoAntiguedad)],
      ['Vacaciones Vencidas / Fraccionadas', String(diasVacaciones), fmtBs(tot.montoVacaciones)],
      ['Bono Vacacional Fraccionado', String(diasBonoVacacional), fmtBs(tot.montoBonoVac)],
      ['Utilidades Fraccionadas', String(diasUtilidades), fmtBs(tot.montoUtilidades)],
      ['Días Laborados Pendientes de Pago', String(diasPendientesPago), fmtBs(tot.montoDiasPend)],
      ['Otros Devengados / Bonificaciones', '-', fmtBs(otrosDevengadosLiq)],
    ];

    doc.setFont('helvetica', 'normal');
    filasAsig.forEach(([c, d, m]) => {
      doc.text(c, 16, y);
      doc.text(d, 135, y, { align: 'right' });
      doc.text(m, 199, y, { align: 'right' });
      y += 6;
    });

    doc.setFont('helvetica', 'bold');
    doc.line(14, y - 2, 202, y - 2);
    doc.text('TOTAL ASIGNACIONES', 16, y + 2);
    doc.text(`Bs. ${fmtBs(tot.totalAsignaciones)}`, 199, y + 2, { align: 'right' });
    y += 10;

    doc.setFillColor(254, 226, 226);
    doc.rect(14, y, 188, 6, 'F');
    doc.text('DEDUCCIONES Y SOLVENCIA DE DOTACIÓN', 16, y + 4.2);
    doc.text('MONTO (Bs)', 199, y + 4.2, { align: 'right' });
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(
      `Cuotas de Botas Pendientes (${cuotasBotasPendientes} cuota(s) x $7.5 x ${tasaEmpresaLiq} Bs/$)`,
      16,
      y
    );
    doc.text(fmtBs(tot.montoBotasDescuento), 199, y, { align: 'right' });
    y += 6;
    doc.text('Otras Deducciones / Adelantos', 16, y);
    doc.text(fmtBs(otrasDeduccionesLiq), 199, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.line(14, y - 2, 202, y - 2);
    doc.text('TOTAL DEDUCCIONES', 16, y + 2);
    doc.text(`Bs. ${fmtBs(tot.totalDeducciones)}`, 199, y + 2, { align: 'right' });
    y += 12;

    doc.setFillColor(220, 252, 231);
    doc.rect(14, y - 3, 188, 9, 'F');
    doc.setFontSize(11);
    doc.setTextColor(22, 101, 52);
    doc.text('NETO TOTAL A PAGAR POR LIQUIDACIÓN:', 16, y + 3);
    doc.text(`Bs. ${fmtBs(tot.netoLiquidacion)}`, 199, y + 3, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    y += 18;
    const obsTexto = doc.splitTextToSize(`Observaciones y Solvencia: ${egresadoLiquidar.motivo_egreso || ''}`, 185);
    doc.text(obsTexto, 14, y);

    doc.line(25, 248, 85, 248);
    doc.text('RRHH / Administración', 55, 253, { align: 'center' });

    doc.line(125, 248, 190, 248);
    doc.text('Recibí Conforme (Trabajador)', 157, 253, { align: 'center' });

    doc.save(`Liquidacion_${egresadoLiquidar.cedula}_${egresadoLiquidar.apellidos}.pdf`);
  };

  const filtrados = egresados.filter((eg) => {
    if (filtroElegibilidad !== 'TODOS' && (eg.elegible_reingreso || 'ELEGIBLE') !== filtroElegibilidad) {
      return false;
    }
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return `${eg.cedula} ${eg.nombres} ${eg.apellidos} ${eg.proyecto_egreso} ${eg.motivo_egreso}`
      .toLowerCase()
      .includes(q);
  });

  const exportarExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('EGRESADOS_EMPRESA');
    ws.columns = [
      { header: 'CÉDULA', key: 'cedula', width: 15 },
      { header: 'NOMBRES', key: 'nombres', width: 22 },
      { header: 'APELLIDOS', key: 'apellidos', width: 22 },
      { header: 'CARGO', key: 'cargo', width: 16 },
      { header: 'PROYECTO EGRESO', key: 'proyecto_egreso', width: 22 },
      { header: 'FECHA INGRESO', key: 'fecha_ingreso', width: 15 },
      { header: 'FECHA EGRESO', key: 'fecha_egreso', width: 15 },
      { header: 'MOTIVO Y SOLVENCIA', key: 'motivo_egreso', width: 45 },
      { header: 'ELEGIBILIDAD', key: 'elegible_reingreso', width: 18 },
    ];
    ws.getRow(1).font = { bold: true };
    filtrados.forEach((eg) => ws.addRow(eg));
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Base_Datos_Egresados_VIP3000_${new Date().toLocaleDateString('en-CA')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const logo = await cargarLogoBase64();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 280, 24, 'F');
    if (logo) {
      try {
        doc.addImage(logo, 'JPEG', 10, 3, 18, 18);
      } catch {}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SEGURIDAD VIP 3000 C.A. — BASE DE DATOS DE PERSONAL EGRESADO', 33, 14);

    let y = 32;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    filtrados.forEach((eg, i) => {
      if (y > 195) {
        doc.addPage();
        y = 18;
      }
      doc.text(
        `${i + 1}. ${eg.cedula} | ${eg.nombres} ${eg.apellidos} | ${eg.proyecto_egreso || ''} | Egreso: ${
          eg.fecha_egreso || ''
        } | ${eg.elegible_reingreso || 'ELEGIBLE'} | ${eg.motivo_egreso || ''}`,
        10,
        y
      );
      y += 6;
    });
    doc.save(`Egresados_VIP3000_${new Date().toLocaleDateString('en-CA')}.pdf`);
  };
  const totLiq = calcularTotalesLiquidacion();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-red-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
            Histórico Corporativo {puedeLiquidar ? 'y Liquidaciones' : 'de Personal'}
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <UserMinus className="text-red-600" size={26} /> Base de Datos de Egresados de la Empresa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro unificado de bajas, solvencia de uniforme/carnet/botas y elegibilidad de reingreso.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportarExcel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={16} /> Exportar Excel
          </button>
          <button
            type="button"
            onClick={exportarPDF}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cédula, nombre, proyecto o motivo..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm"
          />
        </div>

        <select
          value={filtroElegibilidad}
          onChange={(e) => setFiltroElegibilidad(e.target.value)}
          className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <option value="TODOS">Todos los Egresados ({egresados.length})</option>
          <option value="ELEGIBLE">Elegibles para Reingreso</option>
          <option value="CONDICIONADO">Condicionados (Verificar Solvencia)</option>
          <option value="NO ELEGIBLE">No Elegibles (Bloqueados)</option>
        </select>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        {cargando ? (
          <p className="text-center text-slate-500 py-8 text-sm">Cargando base de datos de egresados...</p>
        ) : filtrados.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">No hay egresados registrados.</p>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="p-3">Cédula</th>
                <th className="p-3">Nombres y Apellidos</th>
                <th className="p-3">Proyecto Egreso</th>
                <th className="p-3">Fecha Egreso</th>
                <th className="p-3">Motivo y Solvencia</th>
                <th className="p-3">Reingreso</th>
                {puedeLiquidar && <th className="p-3 text-center">Liquidación</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((eg) => (
                <tr key={eg.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-slate-800">{eg.cedula}</td>
                  <td className="p-3 font-bold text-slate-800">
                    {eg.nombres} {eg.apellidos}
                    <div className="text-[11px] font-normal text-slate-500">{eg.cargo || 'OFICIAL'}</div>
                  </td>
                  <td className="p-3 font-semibold text-blue-800">{eg.proyecto_egreso || '-'}</td>
                  <td className="p-3">{eg.fecha_egreso || '-'}</td>
                  <td className="p-3 max-w-xs">{eg.motivo_egreso || '-'}</td>
                  <td className="p-3">
                    <select
                      value={eg.elegible_reingreso || 'ELEGIBLE'}
                      onChange={(e) => actualizarElegibilidad(eg.id, e.target.value)}
                      className={`px-2.5 py-1 rounded-lg font-bold border ${
                        eg.elegible_reingreso === 'NO ELEGIBLE'
                          ? 'bg-red-50 text-red-800 border-red-300'
                          : eg.elegible_reingreso === 'CONDICIONADO'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      <option value="ELEGIBLE">ELEGIBLE</option>
                      <option value="CONDICIONADO">CONDICIONADO</option>
                      <option value="NO ELEGIBLE">NO ELEGIBLE</option>
                    </select>
                  </td>
                  {puedeLiquidar && (
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => abrirCalculadoraLiquidacion(eg)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Calculator size={13} /> Liquidar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {puedeLiquidar && egresadoLiquidar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Calculator className="text-blue-600" size={20} /> Cálculo de Liquidación Editable
                </h3>
                <p className="text-xs text-slate-500">
                  <strong>
                    {egresadoLiquidar.nombres} {egresadoLiquidar.apellidos}
                  </strong>{' '}
                  • C.I. {egresadoLiquidar.cedula} • Egreso: {egresadoLiquidar.fecha_egreso}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEgresadoLiquidar(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {infoBotasPlantilla?.botas_nuevas && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  infoBotasPlantilla.botas_devueltas ||
                  Number(infoBotasPlantilla.botas_cuotas_pagadas || 0) >= 4
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                🥾 <strong>Estado de Botas Nuevas:</strong>{' '}
                {infoBotasPlantilla.botas_devueltas
                  ? 'Botas devueltas al egresar (0 cuotas por descontar).'
                  : Number(infoBotasPlantilla.botas_cuotas_pagadas || 0) >= 4
                  ? 'Botas pagadas al 100% (4/4 cuotas).'
                  : `Pagó ${infoBotasPlantilla.botas_cuotas_pagadas || 0}/4 cuotas. Quedan ${cuotasBotasPendientes} cuota(s) de $7.5 pendientes por descontar.`}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Salario Diario Base (Bs)</label>
                <input
                  type="number"
                  step="0.01"
                  value={salarioDiarioBase}
                  onChange={(e) => setSalarioDiarioBase(Number(e.target.value))}
                  className="w-full border border-blue-300 bg-blue-50/40 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Días Antigüedad</label>
                <input
                  type="number"
                  step="0.01"
                  value={diasAntiguedad}
                  onChange={(e) => setDiasAntiguedad(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Días Vacaciones</label>
                <input
                  type="number"
                  step="0.01"
                  value={diasVacaciones}
                  onChange={(e) => setDiasVacaciones(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Días Bono Vacacional</label>
                <input
                  type="number"
                  step="0.01"
                  value={diasBonoVacacional}
                  onChange={(e) => setDiasBonoVacacional(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Días Utilidades</label>
                <input
                  type="number"
                  step="0.01"
                  value={diasUtilidades}
                  onChange={(e) => setDiasUtilidades(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Días Pendientes Pago</label>
                <input
                  type="number"
                  step="0.01"
                  value={diasPendientesPago}
                  onChange={(e) => setDiasPendientesPago(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Otros Devengados (Bs)</label>
                <input
                  type="number"
                  step="0.01"
                  value={otrosDevengadosLiq}
                  onChange={(e) => setOtrosDevengadosLiq(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-red-700 mb-1">Cuotas Botas Pend.</label>
                <input
                  type="number"
                  value={cuotasBotasPendientes}
                  onChange={(e) => setCuotasBotasPendientes(Number(e.target.value))}
                  className="w-full border border-red-200 bg-red-50/40 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-red-700 mb-1">Tasa Empresa (Bs/$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={tasaEmpresaLiq}
                  onChange={(e) => setTasaEmpresaLiq(Number(e.target.value))}
                  className="w-full border border-red-200 bg-red-50/40 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-red-700 mb-1">Otras Deducciones (Bs)</label>
                <input
                  type="number"
                  step="0.01"
                  value={otrasDeduccionesLiq}
                  onChange={(e) => setOtrasDeduccionesLiq(Number(e.target.value))}
                  className="w-full border border-red-200 bg-red-50/40 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400">Asignaciones:</span>{' '}
                <strong className="text-blue-300">Bs. {fmtBs(totLiq.totalAsignaciones)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Deducciones:</span>{' '}
                <strong className="text-red-300">Bs. {fmtBs(totLiq.totalDeducciones)}</strong>
              </div>
              <div className="text-base font-black text-emerald-400">
                NETO LIQUIDACIÓN: Bs. {fmtBs(totLiq.netoLiquidacion)}
              </div>
            </div>

            {historialDotacion.length > 0 && (
              <div className="border-t pt-3 space-y-1.5 max-h-36 overflow-y-auto">
                <div className="text-xs font-black text-slate-700 uppercase flex items-center gap-1">
                  <History size={14} /> Trazabilidad de Dotación y Cuotas del Oficial
                </div>
                {historialDotacion.map((h) => (
                  <div key={h.id} className="text-[11px] bg-slate-50 px-2.5 py-1.5 rounded border flex justify-between">
                    <span>
                      <strong>[{h.tipo_evento}]</strong> {h.detalle}
                    </span>
                    <span className="text-slate-400">{new Date(h.created_at).toLocaleDateString('es-VE')}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEgresadoLiquidar(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={descargarPDFLiquidacion}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FileText size={15} /> Emitir Planilla Liquidación PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
