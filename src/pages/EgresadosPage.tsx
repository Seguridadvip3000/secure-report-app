import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import {
  UserMinus,
  Search,
  Building2,
  Download,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

export default function EgresadosPage() {
  const { currentUser } = useAuth();
  const rolActual = (currentUser?.role || '').toLowerCase();
  const puedeEditarElegibilidad = ['rrhh', 'recursos_humanos', 'directiva', 'administrador', 'admin'].includes(rolActual);

  const [egresados, setEgresados] = useState<any[]>([]);
  const [listaProyectos, setListaProyectos] = useState<string[]>([]);
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);

  const consultarEgresados = async () => {
    setCargando(true);
    try {
      let query = supabase
        .from('egresados_empresa')
        .select('*')
        .order('fecha_egreso', { ascending: false });

      if (proyectoFiltro !== 'TODOS') {
        query = query.eq('proyecto_egreso', proyectoFiltro);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      setEgresados(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando egresados:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const cargarProy = async () => {
      const setP = new Set<string>(Array.isArray(PROYECTOS) ? PROYECTOS : []);
      const { data } = await supabase.from('projects').select('*');
      if (Array.isArray(data)) {
        data.forEach((p: any) => {
          const val = p?.nombre || p?.name || p?.proyecto;
          if (val) setP.add(String(val).trim());
        });
      }
      setListaProyectos(Array.from(setP).sort());
    };
    cargarProy();
  }, []);

  useEffect(() => {
    consultarEgresados();
  }, [proyectoFiltro]);

  const cambiarElegibilidad = async (idReg: string, nuevoEstado: 'ELEGIBLE' | 'NO ELEGIBLE') => {
    if (!puedeEditarElegibilidad) return;
    const obs = window.prompt(`Observación de RRHH para marcar como ${nuevoEstado}:`, '');
    if (obs === null) return;

    await supabase
      .from('egresados_empresa')
      .update({
        elegible_reingreso: nuevoEstado,
        observacion_rrhh: obs.trim(),
      })
      .eq('id', idReg);

    await consultarEgresados();
  };

  const filtrados = egresados.filter((e) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      String(e.cedula || '').toLowerCase().includes(q) ||
      String(e.nombres || '').toLowerCase().includes(q) ||
      String(e.apellidos || '').toLowerCase().includes(q)
    );
  });

  const exportarPDFEgresados = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, 10, pageWidth - margin * 2, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('BASE DE DATOS MAESTRA DE EGRESADOS — SEGURIDAD VIP 3000 C.A.', margin + 5, 21);

    let y = 36;
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CÉDULA | NOMBRES Y APELLIDOS | PROYECTO | INGRESO | EGRESO | MOTIVO | EGRESADO POR | REINGRESO', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    filtrados.forEach((eg) => {
      if (y > 195) {
        doc.addPage();
        y = 20;
      }
      const linea = `${eg.cedula} | ${eg.nombres} ${eg.apellidos} | ${eg.proyecto_egreso} | Ing: ${eg.fecha_ingreso || 'N/A'} | Egr: ${eg.fecha_egreso} | ${eg.motivo_egreso} | Por: ${eg.egresado_por} | ${eg.elegible_reingreso}`;
      doc.text(linea.slice(0, 145), margin, y);
      y += 6;
    });

    doc.save(`Base_Datos_Egresados_VIP3000.pdf`);
  };

  const exportarExcelEgresados = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('EGRESADOS_EMPRESA');
    ws.addRow([
      'CÉDULA',
      'NOMBRES',
      'APELLIDOS',
      'CARGO',
      'PROYECTO EGRESO',
      'FECHA INGRESO',
      'FECHA EGRESO',
      'MOTIVO EGRESO',
      'EGRESADO POR',
      'ELEGIBILIDAD REINGRESO',
    ]);
    filtrados.forEach((eg) => {
      ws.addRow([
        eg.cedula,
        eg.nombres,
        eg.apellidos,
        eg.cargo || 'OFICIAL',
        eg.proyecto_egreso,
        eg.fecha_ingreso || 'N/A',
        eg.fecha_egreso,
        eg.motivo_egreso,
        eg.egresado_por,
        eg.elegible_reingreso,
      ]);
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Base_Datos_Egresados_VIP3000.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-red-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
            Control de Recursos Humanos y Seguridad
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <UserMinus className="text-red-600" size={26} /> Base de Datos de Egresados de la Empresa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Historial consolidado de egresos por proyecto, fechas de ingreso/egreso, motivos y control de elegibilidad para reingreso.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-xl text-center">
          <div className="text-[11px] font-bold text-red-700 uppercase">Total Egresados</div>
          <div className="text-xl font-black text-red-900">{filtrados.length}</div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3 flex-1">
          <div className="w-full sm:w-64">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Building2 size={14} /> Proyecto de Egreso
            </label>
            <select
              value={proyectoFiltro}
              onChange={(e) => setProyectoFiltro(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
            >
              <option value="TODOS">TODOS LOS PROYECTOS</option>
              {listaProyectos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-72">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Buscar Cédula o Nombre</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Cédula o nombre..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportarExcelEgresados}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} /> Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={exportarPDFEgresados}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} /> PDF Egresados
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        {cargando ? (
          <p className="text-center text-slate-500 py-8 text-sm">Consultando egresados...</p>
        ) : filtrados.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">No hay egresados registrados para los filtros actuales.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtrados.map((eg) => (
              <div key={eg.id} className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">
                      {eg.nombres} {eg.apellidos}
                    </span>
                    <span className="text-xs font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">
                      C.I. {eg.cedula}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                      {eg.proyecto_egreso}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                        eg.elegible_reingreso === 'ELEGIBLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {eg.elegible_reingreso}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Fecha Ingreso: <strong>{eg.fecha_ingreso || 'No registrada'}</strong> • Fecha Egreso:{' '}
                    <strong>{eg.fecha_egreso}</strong> • Procesado por: <strong>{eg.egresado_por}</strong>
                  </p>
                  <p className="text-xs text-red-800 font-semibold">
                    Motivo del Egreso: {eg.motivo_egreso}
                    {eg.observacion_rrhh ? ` • Nota RRHH: ${eg.observacion_rrhh}` : ''}
                  </p>
                </div>

                {puedeEditarElegibilidad && (
                  <div className="flex gap-1.5 self-start lg:self-center">
                    <button
                      type="button"
                      onClick={() => cambiarElegibilidad(eg.id, 'ELEGIBLE')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={13} /> Elegible
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarElegibilidad(eg.id, 'NO ELEGIBLE')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-800 border border-red-300 hover:bg-red-100 flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldAlert size={13} /> No Elegible
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
