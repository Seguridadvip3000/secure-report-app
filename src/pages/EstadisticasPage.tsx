import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PROYECTOS, TITULOS_NOVEDAD } from '../data/constants';
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import {
  ArrowLeft,
  BarChart3,
  Filter,
  Calendar,
  FileText,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react';

interface ReporteStats {
  id: string;
  titulo_novedad: string;
  proyecto: string;
  quien_reporta?: string;
  status: string;
  created_at: string;
}

type FiltroPeriodo = 'general' | 'semana' | 'mes' | 'rango';

const limpiarTextoProyecto = (valor: string): string => {
  if (!valor) return 'Sin Proyecto';
  let limpio = valor.trim();
  if (limpio.startsWith('[') && limpio.endsWith(']')) {
    try {
      const parsed = JSON.parse(limpio);
      if (Array.isArray(parsed) && parsed.length > 0) return String(parsed.at(0)).trim();
    } catch {
      limpio = limpio.replace(/^\[["']?|["']?\]$/g, '');
    }
  }
  return limpio.replace(/^["']+|["']+$/g, '').trim() || 'Sin Proyecto';
};

const cargarLogoBase64 = (): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch {}
      resolve('');
    };
    img.onerror = () => resolve('');
    img.src = '/logo-vip3000.jpg';
  });
};

const generarImagenGraficoBarras = (
  tituloGrafico: string,
  datos: { nombre: string; cantidad: number }[],
  total: number,
  colorBarra: string
): string => {
  const canvas = document.createElement('canvas');
  const ancho = 900;
  const altoFila = 46;
  const altoCabecera = 65;
  const alto = Math.max(220, altoCabecera + datos.length * altoFila + 30);
  canvas.width = ancho;
  canvas.height = alto;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, ancho - 2, alto - 2);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, ancho, 46);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px Arial';
  ctx.fillText(tituloGrafico, 20, 29);

  const maxVal = datos.at(0)?.cantidad || 1;
  const inicioBarraX = 340;
  const anchoMaxBarra = 420;

  datos.forEach((item, i) => {
    const y = altoCabecera + i * altoFila;
    const pct = total > 0 ? Math.round((item.cantidad / total) * 100) : 0;
    const anchoBarra = Math.max(10, Math.round((item.cantidad / maxVal) * anchoMaxBarra));

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px Arial';
    const textoCorto = item.nombre.length > 38 ? item.nombre.slice(0, 35) + '...' : item.nombre;
    ctx.fillText(textoCorto, 20, y + 20);

    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(inicioBarraX, y + 6, anchoMaxBarra, 20);

    ctx.fillStyle = colorBarra;
    ctx.fillRect(inicioBarraX, y + 6, anchoBarra, 20);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(`${item.cantidad} (${pct}%)`, inicioBarraX + anchoMaxBarra + 14, y + 21);
  });

  return canvas.toDataURL('image/png');
};
export default function EstadisticasPage() {
  const navigate = useNavigate();
  const [reportes, setReportes] = useState<ReporteStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);

  const [periodo, setPeriodo] = useState<FiltroPeriodo>('general');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [proyectoFiltro, setProyectoFiltro] = useState('todos');
  const [tituloFiltro, setTituloFiltro] = useState('todos');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id, titulo_novedad, proyecto, quien_reporta, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const normalizados = (data || []).map((r: any) => ({
        ...r,
        proyecto: limpiarTextoProyecto(r.proyecto),
      }));
      setReportes(normalizados);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const reportesFiltrados = useMemo(() => {
    const ahora = new Date();

    return reportes.filter((r) => {
      const fechaRep = new Date(r.created_at);

      if (periodo === 'semana') {
        const hace7Dias = new Date(ahora);
        hace7Dias.setDate(ahora.getDate() - 7);
        if (fechaRep < hace7Dias) return false;
      } else if (periodo === 'mes') {
        if (fechaRep.getMonth() !== ahora.getMonth() || fechaRep.getFullYear() !== ahora.getFullYear()) {
          return false;
        }
      } else if (periodo === 'rango') {
        if (fechaInicio) {
          const inicio = new Date(`${fechaInicio}T00:00:00`);
          if (fechaRep < inicio) return false;
        }
        if (fechaFin) {
          const fin = new Date(`${fechaFin}T23:59:59`);
          if (fechaRep > fin) return false;
        }
      }

      if (proyectoFiltro !== 'todos' && r.proyecto !== proyectoFiltro) {
        return false;
      }

      if (tituloFiltro !== 'todos' && r.titulo_novedad !== tituloFiltro) {
        return false;
      }

      return true;
    });
  }, [reportes, periodo, fechaInicio, fechaFin, proyectoFiltro, tituloFiltro]);

  const metricas = useMemo(() => {
    const total = reportesFiltrados.length;
    const aprobados = reportesFiltrados.filter((r) => r.status === 'aprobado').length;
    const pendientes = reportesFiltrados.filter((r) => r.status === 'pendiente' || r.status === 'en_proceso').length;
    const rechazados = reportesFiltrados.filter((r) => r.status === 'rechazado').length;

    const mapaProyectos: Record<string, number> = {};
    reportesFiltrados.forEach((r) => {
      const proy = r.proyecto || 'Sin Proyecto';
      mapaProyectos[proy] = (mapaProyectos[proy] || 0) + 1;
    });
    const porProyecto = Object.entries(mapaProyectos)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const mapaTitulos: Record<string, number> = {};
    reportesFiltrados.forEach((r) => {
      const tit = r.titulo_novedad || 'Sin Clasificar';
      mapaTitulos[tit] = (mapaTitulos[tit] || 0) + 1;
    });
    const porTitulo = Object.entries(mapaTitulos)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return { total, aprobados, pendientes, rechazados, porProyecto, porTitulo };
  }, [reportesFiltrados]);
  const obtenerEtiquetaPeriodo = () => {
    if (periodo === 'semana') return 'Última Semana (7 días)';
    if (periodo === 'mes') return 'Mes Actual';
    if (periodo === 'rango') return `Rango: ${fechaInicio || 'Inicio'} al ${fechaFin || 'Hoy'}`;
    return 'Nivel General (Histórico Completo)';
  };

  const obtenerSufijoArchivo = () => {
    const proy = proyectoFiltro === 'todos' ? 'General' : proyectoFiltro.replace(/[^a-zA-Z0-9]/g, '_');
    return `${proy}_${new Date().toISOString().slice(0, 10)}`;
  };

  const exportarExcel = async () => {
    if (reportesFiltrados.length === 0) {
      alert('No hay datos filtrados para exportar.');
      return;
    }

    setExportandoExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Seguridad VIP 3000 C.A.';
      const logoBase64 = await cargarLogoBase64();

      const sheet = workbook.addWorksheet('Estadísticas Ejecutivas', {
        views: [{ showGridLines: true }],
      });

      sheet.columns = [
        { width: 44 },
        { width: 22 },
        { width: 22 },
      ];

      sheet.mergeCells('A1:C1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = '      SEGURIDAD VIP 3000 C.A. — INFORME ESTADÍSTICO CORPORATIVO';
      titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).height = 46;

      if (logoBase64) {
        const logoId = workbook.addImage({
          base64: logoBase64.split(',').pop() || '',
          extension: 'png',
        });
        sheet.addImage(logoId, {
          tl: { col: 0.08, row: 0.08 },
          ext: { width: 52, height: 52 },
        });
      }

      sheet.mergeCells('A2:C2');
      const subCell = sheet.getCell('A2');
      subCell.value = `Proyecto: ${proyectoFiltro === 'todos' ? 'TODOS LOS PROYECTOS' : proyectoFiltro.toUpperCase()}  |  Período: ${obtenerEtiquetaPeriodo()}`;
      subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(2).height = 24;

      sheet.addRow([]);
      const headerKPI = sheet.addRow(['INDICADOR OPERATIVO', 'CANTIDAD', 'PORCENTAJE']);
      headerKPI.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      headerKPI.height = 24;

      const kpis = [
        ['Total de Novedades Registradas', metricas.total, '100%'],
        ['Novedades Aprobadas', metricas.aprobados, `${Math.round((metricas.aprobados / metricas.total) * 100)}%`],
        ['Novedades Pendientes / En Revisión', metricas.pendientes, `${Math.round((metricas.pendientes / metricas.total) * 100)}%`],
        ['Novedades Rechazadas', metricas.rechazados, `${Math.round((metricas.rechazados / metricas.total) * 100)}%`],
      ];

      kpis.forEach((fila) => {
        const r = sheet.addRow(fila);
        r.height = 20;
        r.getCell(1).font = { bold: true, size: 10 };
        r.getCell(2).alignment = { horizontal: 'center' };
        r.getCell(3).alignment = { horizontal: 'center' };
        r.eachCell((c) => {
          c.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        });
      });

      sheet.addRow([]);
      const headerTipos = sheet.addRow(['TIPO / TÍTULO DE NOVEDAD', 'INCIDENCIAS', 'PARTICIPACIÓN']);
      headerTipos.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      headerTipos.height = 24;

      metricas.porTitulo.forEach((t) => {
        const r = sheet.addRow([t.nombre, t.cantidad, `${Math.round((t.cantidad / metricas.total) * 100)}%`]);
        r.height = 20;
        r.getCell(2).alignment = { horizontal: 'center' };
        r.getCell(3).alignment = { horizontal: 'center' };
        r.eachCell((c) => {
          c.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        });
      });

      const filaInicioGrafico = sheet.rowCount + 2;
      const imgGraficoTitulos = generarImagenGraficoBarras(
        `GRÁFICO DE INCIDENCIAS POR NOVEDAD — ${proyectoFiltro === 'todos' ? 'GENERAL' : proyectoFiltro}`,
        metricas.porTitulo,
        metricas.total,
        '#dc2626'
      );

      if (imgGraficoTitulos) {
        const imageId1 = workbook.addImage({
          base64: imgGraficoTitulos.split(',').pop() || '',
          extension: 'png',
        });
        sheet.addImage(imageId1, {
          tl: { col: 0, row: filaInicioGrafico },
          ext: { width: 620, height: Math.max(180, metricas.porTitulo.length * 34 + 60) },
        });
      }

      const sheetDetalle = workbook.addWorksheet('Detalle Filtrado');
      sheetDetalle.columns = [
        { width: 24 },
        { width: 28 },
        { width: 38 },
        { width: 26 },
        { width: 16 },
      ];
      const hDet = sheetDetalle.addRow(['FECHA Y HORA', 'PROYECTO', 'TIPO DE NOVEDAD', 'REPORTADO POR', 'ESTADO']);
      hDet.eachCell((c) => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      });
      reportesFiltrados.forEach((r) => {
        sheetDetalle.addRow([
          new Date(r.created_at).toLocaleString('es-VE'),
          r.proyecto,
          r.titulo_novedad,
          r.quien_reporta || 'Personal Operativo',
          (r.status || '').toUpperCase(),
        ]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const nombreArchivo = `Estadisticas_${obtenerSufijoArchivo()}_SeguridadVip3000CA.xlsx`;

      if ((window as any).ReactNativeWebView) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes.at(i) || 0);
        }
        const base64Xlsx = btoa(binary);
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'DOWNLOAD_PDF',
            filename: nombreArchivo,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            base64: base64Xlsx,
          })
        );
      } else {
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Error generando el Excel corporativo.');
    } finally {
      setExportandoExcel(false);
    }
  };
  const exportarPDFEjecutivo = async () => {
    if (reportesFiltrados.length === 0) {
      alert('No hay datos filtrados para generar el informe PDF.');
      return;
    }

    setExportandoPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const ancho = doc.internal.pageSize.getWidth();
      const logoBase64 = await cargarLogoBase64();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, ancho, 36, 'F');

      let margenTextoX = 14;
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 14, 5, 26, 26);
        margenTextoX = 45;
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('SEGURIDAD VIP 3000 C.A.', margenTextoX, 15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('INFORME EJECUTIVO DE ESTADÍSTICAS E INDICADORES OPERATIVOS', margenTextoX, 22);
      doc.setFontSize(8);
      doc.text(`Generado el: ${new Date().toLocaleString('es-VE')}`, margenTextoX, 29);

      let y = 44;
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('PARÁMETROS DEL INFORME:', 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`• Proyecto Analizado: ${proyectoFiltro === 'todos' ? 'Todos los Proyectos' : proyectoFiltro}`, 16, y);
      y += 5;
      doc.text(`• Período Analizado: ${obtenerEtiquetaPeriodo()}`, 16, y);
      y += 5;
      doc.text(`• Tipo de Novedad: ${tituloFiltro === 'todos' ? 'Todas las Novedades' : tituloFiltro}`, 16, y);

      y += 9;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, y, ancho - 28, 16, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`TOTAL: ${metricas.total}`, 20, y + 10);
      doc.setTextColor(22, 163, 74);
      doc.text(`APROBADOS: ${metricas.aprobados}`, 65, y + 10);
      doc.setTextColor(217, 119, 6);
      doc.text(`PENDIENTES: ${metricas.pendientes}`, 118, y + 10);
      doc.setTextColor(220, 38, 38);
      doc.text(`RECHAZADOS: ${metricas.rechazados}`, 165, y + 10);

      y += 24;

      if (proyectoFiltro === 'todos' && metricas.porProyecto.length > 0) {
        const imgProy = generarImagenGraficoBarras(
          'DISTRIBUCIÓN DE NOVEDADES POR PROYECTO',
          metricas.porProyecto,
          metricas.total,
          '#2563eb'
        );
        if (imgProy) {
          const altoImg1 = Math.min(85, Math.max(42, metricas.porProyecto.length * 10 + 18));
          doc.addImage(imgProy, 'PNG', 14, y, ancho - 28, altoImg1);
          y += altoImg1 + 8;
        }
      }

      if (metricas.porTitulo.length > 0) {
        if (y > 195) {
          doc.addPage();
          y = 20;
        }
        const imgTit = generarImagenGraficoBarras(
          `DESGLOSE POR TIPO DE NOVEDAD (${proyectoFiltro === 'todos' ? 'GENERAL' : proyectoFiltro})`,
          metricas.porTitulo,
          metricas.total,
          '#dc2626'
        );
        if (imgTit) {
          const altoImg2 = Math.min(110, Math.max(45, metricas.porTitulo.length * 10 + 18));
          doc.addImage(imgTit, 'PNG', 14, y, ancho - 28, altoImg2);
          y += altoImg2 + 8;
        }
      }

      const nombreArchivo = `Estadisticas_${obtenerSufijoArchivo()}_SeguridadVip3000CA.pdf`;

      if ((window as any).ReactNativeWebView) {
        const pdfBase64 = doc.output('datauristring').split(',').pop();
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'DOWNLOAD_PDF',
            filename: nombreArchivo,
            mimeType: 'application/pdf',
            base64: pdfBase64,
          })
        );
      } else {
        doc.save(nombreArchivo);
      }
    } catch (err) {
      alert('Error generando el PDF ejecutivo.');
    } finally {
      setExportandoPdf(false);
    }
  };

  const maxProyecto = metricas.porProyecto.at(0)?.cantidad || 1;
  const maxTitulo = metricas.porTitulo.at(0)?.cantidad || 1;
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-red-600" /> Estadísticas y Análisis Operativo
            </h1>
            <p className="text-xs md:text-sm text-slate-500">Seguridad VIP 3000 C.A. — Indicadores Ejecutivos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportarExcel}
            disabled={exportandoExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet size={16} /> {exportandoExcel ? 'Generando...' : 'Exportar Excel'}
          </button>
          <button
            onClick={exportarPDFEjecutivo}
            disabled={exportandoPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileDown size={16} /> {exportandoPdf ? 'Generando...' : 'Exportar PDF'}
          </button>
          <button
            onClick={cargarDatos}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 shadow-sm"
            title="Actualizar Datos"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">
          <Filter size={16} className="text-blue-600" /> Filtros de Búsqueda (Aplica a Excel y PDF)
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'general', label: 'Nivel General (Todo)' },
            { id: 'semana', label: 'Última Semana (7 días)' },
            { id: 'mes', label: 'Este Mes' },
            { id: 'rango', label: 'Rango de Fechas' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setPeriodo(btn.id as FiltroPeriodo)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodo === btn.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {periodo === 'rango' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar size={13} /> Fecha Desde:
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar size={13} /> Fecha Hasta:
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin size={13} className="text-blue-600" /> Filtrar por Proyecto
            </label>
            <select
              value={proyectoFiltro}
              onChange={(e) => setProyectoFiltro(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los Proyectos</option>
              {PROYECTOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
              <FileText size={13} className="text-purple-600" /> Filtrar por Título de Novedad
            </label>
            <select
              value={tituloFiltro}
              onChange={(e) => setTituloFiltro(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los Títulos / Novedades</option>
              {TITULOS_NOVEDAD.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Filtrado</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{metricas.total}</p>
          <span className="text-[11px] text-blue-600 font-semibold">Reportes registrados</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Aprobados</p>
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <p className="text-3xl font-black text-green-600 mt-1">{metricas.aprobados}</p>
          <span className="text-[11px] text-slate-400">
            {metricas.total > 0 ? Math.round((metricas.aprobados / metricas.total) * 100) : 0}% del total
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Pendientes</p>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-500 mt-1">{metricas.pendientes}</p>
          <span className="text-[11px] text-slate-400">
            {metricas.total > 0 ? Math.round((metricas.pendientes / metricas.total) * 100) : 0}% del total
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Rechazados</p>
            <XCircle size={16} className="text-red-500" />
          </div>
          <p className="text-3xl font-black text-red-500 mt-1">{metricas.rechazados}</p>
          <span className="text-[11px] text-slate-400">
            {metricas.total > 0 ? Math.round((metricas.rechazados / metricas.total) * 100) : 0}% del total
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          Calculando gráficas estadísticas...
        </div>
      ) : metricas.total === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No se encontraron reportes que coincidan con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin size={18} className="text-blue-600" /> Reportes por Proyecto
            </h3>
            <div className="space-y-3">
              {metricas.porProyecto.map((item) => {
                const porcentajeAncho = Math.max(6, Math.round((item.cantidad / maxProyecto) * 100));
                const porcentajeReal = Math.round((item.cantidad / metricas.total) * 100);
                return (
                  <div key={item.nombre} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate pr-2">{item.nombre}</span>
                      <span className="text-blue-700 flex-shrink-0">{item.cantidad} ({porcentajeReal}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${porcentajeAncho}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText size={18} className="text-red-600" /> Reportes por Tipo / Título de Novedad
            </h3>
            <div className="space-y-3">
              {metricas.porTitulo.map((item) => {
                const porcentajeAncho = Math.max(6, Math.round((item.cantidad / maxTitulo) * 100));
                const porcentajeReal = Math.round((item.cantidad / metricas.total) * 100);
                return (
                  <div key={item.nombre} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate pr-2">{item.nombre}</span>
                      <span className="text-red-700 flex-shrink-0">{item.cantidad} ({porcentajeReal}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${porcentajeAncho}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
