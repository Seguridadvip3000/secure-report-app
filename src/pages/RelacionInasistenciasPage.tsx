import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import { leTocaGuardiaHoy } from '../utils/rotacionGuardia';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import {
  FileSpreadsheet,
  FileText,
  Building2,
  Save,
  ClipboardList,
} from 'lucide-react';

const NOMBRES_MESES = [
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

const pad2 = (n: number) => String(n).padStart(2, '0');

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

interface FilaDiaInasistencia {
  dia: number;
  plazaDiurna: number;
  plazaNocturna: number;
  asistDiurna: number;
  asistNocturna: number;
  faltasDiurnas: number;
  faltasNocturnas: number;
  totalFaltas: number;
}

export default function RelacionInasistenciasPage() {
  const { currentUser } = useAuth();
  const usuarioNombre = currentUser?.nombre_completo || currentUser?.username || 'Operaciones';
  const rolActual = (currentUser?.role || '').toLowerCase();
  const puedeEditarTodo = ['directiva', 'administrador', 'admin'].includes(rolActual);

  const hoy = new Date();
  const [listaProyectos, setListaProyectos] = useState<string[]>([]);
  const [proyecto, setProyecto] = useState<string>('');
  const [anio, setAnio] = useState<number>(hoy.getFullYear());
  const [mes, setMes] = useState<number>(hoy.getMonth() + 1);

  const [plazaDiurnaConfig, setPlazaDiurnaConfig] = useState<number>(0);
  const [plazaNocturnaConfig, setPlazaNocturnaConfig] = useState<number>(0);
  const [guardandoPlazas, setGuardandoPlazas] = useState<boolean>(false);

  const [filas1ra, setFilas1ra] = useState<FilaDiaInasistencia[]>([]);
  const [filas2da, setFilas2da] = useState<FilaDiaInasistencia[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [modoEdicionTotal, setModoEdicionTotal] = useState<boolean>(false);
  const [modalExportarFormato, setModalExportarFormato] = useState<'EXCEL' | 'PDF' | null>(null);

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
      const arr = Array.from(setP).sort();
      setListaProyectos(arr);
      if (arr.length > 0 && !proyecto) setProyecto(arr.at(0) || '');
    };
    cargarProy();
  }, []);
  const cargarRelacionMes = async () => {
    if (!proyecto) return;
    setCargando(true);
    setMensaje(null);

    try {
      const ultimoDiaMes = new Date(anio, mes, 0).getDate();
      const fechaDesde = `${anio}-${pad2(mes)}-01`;
      const fechaHasta = `${anio}-${pad2(mes)}-${pad2(ultimoDiaMes)}`;

      const { data: cierresData } = await supabase
        .from('cierres_asistencia_diaria')
        .select('fecha, cerrado')
        .eq('proyecto', proyecto)
        .eq('cerrado', true)
        .gte('fecha', fechaDesde)
        .lte('fecha', fechaHasta);

      const diasCerradosSet = new Set<string>(
        (Array.isArray(cierresData) ? cierresData : []).map((c: any) => String(c.fecha))
      );

      const { data: configData } = await supabase
        .from('plazas_proyecto_config')
        .select('*')
        .eq('proyecto', proyecto)
        .maybeSingle();

      const { data: plantillaData } = await supabase
        .from('plantilla_proyectos')
        .select('*')
        .eq('proyecto', proyecto)
        .eq('estado', 'ACTIVO');

      const activos = Array.isArray(plantillaData) ? plantillaData : [];

      let pDiurna = configData?.plazas_diurnas ?? 0;
      let pNocturna = configData?.plazas_nocturnas ?? 0;

      if (!configData && activos.length > 0) {
        const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
        activos.forEach((of) => {
          const cargoUp = String(of.cargo || 'OFICIAL').toUpperCase();
          const trnUp = String(of.turno || 'MIXTO').toUpperCase();
          if (cargoUp === 'LIDER') {
            pDiurna += 1;
          } else if (leTocaGuardiaHoy(of.grupo || 'A', of.turno || 'MIXTO', hoyISO)) {
            if (trnUp === 'DIURNO') pDiurna += 1;
            else pNocturna += 1;
          }
        });
      }

      setPlazaDiurnaConfig(pDiurna);
      setPlazaNocturnaConfig(pNocturna);

      const { data: asistData } = await supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .eq('proyecto', proyecto)
        .gte('fecha', fechaDesde)
        .lte('fecha', fechaHasta);

      const asistencias = Array.isArray(asistData) ? asistData : [];

      const { data: logsQrData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('project_name', proyecto)
        .gte('created_at', `${fechaDesde}T00:00:00`)
        .lte('created_at', `${fechaHasta}T23:59:59`);

      const logsQr = Array.isArray(logsQrData) ? logsQrData : [];

      const estatusAsistentes = [
        'PRESENTE',
        'APOYO RECIBIDO',
        'SERVICIO ESPECIAL MIXTO',
        'SERVICIO ESPECIAL DIURNO/NOCTURNO',
        'SERVICIO ESPECIAL PROPIO',
        'SERVICIO ESPECIAL RECIBIDO',
      ];

      const q1: FilaDiaInasistencia[] = [];
      const q2: FilaDiaInasistencia[] = [];

      for (let d = 1; d <= ultimoDiaMes; d++) {
        const fechaISO = `${anio}-${pad2(mes)}-${pad2(d)}`;
        const diaCerradoPorAnalista = diasCerradosSet.has(fechaISO);

        if (!diaCerradoPorAnalista) {
          const filaPendiente: FilaDiaInasistencia = {
            dia: d,
            plazaDiurna: pDiurna,
            plazaNocturna: pNocturna,
            asistDiurna: 0,
            asistNocturna: 0,
            faltasDiurnas: 0,
            faltasNocturnas: 0,
            totalFaltas: 0,
          };
          if (d <= 15) q1.push(filaPendiente);
          else q2.push(filaPendiente);
          continue;
        }

        const marcasDia = asistencias.filter((a) => a.fecha === fechaISO);

        let asistDiurna = 0;
        let asistNocturna = 0;
        let liderYaContadoEnDia = false;

        marcasDia.forEach((m) => {
          const est = String(m.estatus || '').toUpperCase();
          if (!estatusAsistentes.includes(est)) return;

          const cargoUp = String(m.cargo || 'OFICIAL').toUpperCase();
          const turnoUp = String(m.turno || 'MIXTO').toUpperCase();

          if (cargoUp === 'LIDER') {
            liderYaContadoEnDia = true;
            asistDiurna += 1;
          } else if (turnoUp === 'DIURNO') {
            asistDiurna += 1;
          } else {
            asistNocturna += 1;
          }
        });

        if (!liderYaContadoEnDia) {
          const logsDia = logsQr.filter((lg: any) => {
            const fLog = new Date(lg.created_at).toLocaleDateString('en-CA', {
              timeZone: 'America/Caracas',
            });
            return fLog === fechaISO;
          });
          if (logsDia.length > 0) {
            asistDiurna += 1;
          }
        }

        const faltasDiurnas = pDiurna - asistDiurna;
        const faltasNocturnas = pNocturna - asistNocturna;
        const totalFaltas = faltasDiurnas + faltasNocturnas;

        const fila: FilaDiaInasistencia = {
          dia: d,
          plazaDiurna: pDiurna,
          plazaNocturna: pNocturna,
          asistDiurna,
          asistNocturna,
          faltasDiurnas,
          faltasNocturnas,
          totalFaltas,
        };

        if (d <= 15) q1.push(fila);
        else q2.push(fila);
      }

      setFilas1ra(q1);
      setFilas2da(q2);
    } catch (err) {
      console.error('Error cargando relación de inasistencias:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (proyecto) cargarRelacionMes();
  }, [proyecto, anio, mes]);

  const guardarConfigPlazas = async () => {
    if (!proyecto) return;
    setGuardandoPlazas(true);
    try {
      await supabase.from('plazas_proyecto_config').upsert(
        [
          {
            proyecto,
            plazas_diurnas: plazaDiurnaConfig,
            plazas_nocturnas: plazaNocturnaConfig,
            updated_by: usuarioNombre,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'proyecto' }
      );
      setMensaje(`✅ Plazas contratadas de ${proyecto} guardadas (${plazaDiurnaConfig} Diurnas / ${plazaNocturnaConfig} Nocturnas-Mixtas).`);
      await cargarRelacionMes();
    } catch (err) {
      console.error('Error guardando plazas:', err);
    } finally {
      setGuardandoPlazas(false);
    }
  };

  const actualizarCeldaDia = (
    quincena: '1RA' | '2DA',
    indexFila: number,
    campo: 'plazaDiurna' | 'plazaNocturna' | 'asistDiurna' | 'asistNocturna',
    nuevoValor: number
  ) => {
    const setter = quincena === '1RA' ? setFilas1ra : setFilas2da;
    setter((prev) =>
      prev.map((fila, idx) => {
        if (idx !== indexFila) return fila;
        const actualizada = { ...fila, [campo]: nuevoValor };
        actualizada.faltasDiurnas = actualizada.plazaDiurna - actualizada.asistDiurna;
        actualizada.faltasNocturnas = actualizada.plazaNocturna - actualizada.asistNocturna;
        actualizada.totalFaltas = actualizada.faltasDiurnas + actualizada.faltasNocturnas;
        return actualizada;
      })
    );
  };
    const exportarExcelInasistencias = async (alcance: '1RA' | '2DA' | 'MES') => {
    setModalExportarFormato(null);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(proyecto.slice(0, 28) || 'INASISTENCIAS', {
      views: [{ showGridLines: true }],
    });

    ws.columns = [
      { width: 10 },
      { width: 15 },
      { width: 15 },
      { width: 16 },
      { width: 17 },
      { width: 15 },
      { width: 16 },
      { width: 15 },
    ];

    try {
      const respLogo = await fetch('/logo-vip3000.jpg');
      if (respLogo.ok) {
        const arrayBuf = await respLogo.arrayBuffer();
        const imageId = wb.addImage({
          buffer: arrayBuf,
          extension: 'jpeg',
        });
        ws.addImage(imageId, {
          tl: { col: 0.2, row: 0.2 },
          ext: { width: 85, height: 75 },
        });
      }
    } catch {}

    ws.getRow(1).height = 24;
    ws.getRow(2).height = 22;
    ws.getRow(3).height = 22;
    ws.getRow(4).height = 14;

    ws.mergeCells('C1:H1');
    ws.getCell('C1').value = 'SEGURIDAD VIP 3000 C.A. — RIF: J-29491549-3';
    ws.getCell('C1').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell('C1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    ws.getCell('C1').alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('C2:H2');
    ws.getCell('C2').value = 'RELACIÓN DE INASISTENCIAS (FALTAS ADMINISTRATIVAS)';
    ws.getCell('C2').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF93C5FD' } };
    ws.getCell('C2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    ws.getCell('C2').alignment = { vertical: 'middle', horizontal: 'center' };

    const etiquetaAlcance =
      alcance === '1RA' ? '1RA QUINCENA' : alcance === '2DA' ? '2DA QUINCENA' : 'MES COMPLETO';

    ws.mergeCells('C3:H3');
    ws.getCell('C3').value = `PROYECTO: ${proyecto.toUpperCase()}   |   ${etiquetaAlcance} — ${NOMBRES_MESES[mes - 1]} ${anio}`;
    ws.getCell('C3').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    ws.getCell('C3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    ws.getCell('C3').alignment = { vertical: 'middle', horizontal: 'center' };

    const bordeFino: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };

    const escribirBloqueQuincena = (tituloQuincena: string, filas: FilaDiaInasistencia[]) => {
      const rBanner = ws.addRow([`${tituloQuincena} QUINCENA ${NOMBRES_MESES[mes - 1]} ${anio}`]);
      const idxBanner = rBanner.number;
      ws.mergeCells(`A${idxBanner}:H${idxBanner}`);
      rBanner.height = 22;
      const cellBanner = ws.getCell(`A${idxBanner}`);
      cellBanner.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cellBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cellBanner.alignment = { vertical: 'middle', horizontal: 'center' };

      const rH1 = ws.addRow(['Día', 'PLAZA', '', 'ASISTENTES', '', 'Faltas', '', 'TOTAL']);
      const rH2 = ws.addRow(['', 'Diurnas', 'Nocturna', 'Diurna', 'Nocturna', 'Diurnas', 'Nocturnas', '']);
      const n1 = rH1.number;
      const n2 = rH2.number;

      ws.mergeCells(`A${n1}:A${n2}`);
      ws.mergeCells(`B${n1}:C${n1}`);
      ws.mergeCells(`D${n1}:E${n1}`);
      ws.mergeCells(`F${n1}:G${n1}`);
      ws.mergeCells(`H${n1}:H${n2}`);

      [rH1, rH2].forEach((row) => {
        row.height = 20;
        row.eachCell((cell) => {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = bordeFino;
        });
      });

      filas.forEach((f) => {
        const r = ws.addRow([
          f.dia,
          f.plazaDiurna,
          f.plazaNocturna,
          f.asistDiurna,
          f.asistNocturna,
          f.faltasDiurnas,
          f.faltasNocturnas,
          f.totalFaltas,
        ]);
        r.height = 18;
        r.eachCell((cell, colNum) => {
          cell.font = { name: 'Calibri', size: 10, bold: colNum === 1 || colNum === 8 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = bordeFino;
          if (colNum >= 6 && Number(cell.value || 0) > 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
          }
        });
      });

      const sumaTotal = filas.reduce((acc, x) => acc + x.totalFaltas, 0);
      const rTot = ws.addRow(['', '', '', '', '', '', `TOTAL ${tituloQuincena}:`, sumaTotal]);
      rTot.height = 21;
      rTot.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
        cell.alignment = { vertical: 'middle', horizontal: colNum === 7 ? 'right' : 'center' };
        if (colNum >= 7) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          cell.border = bordeFino;
        }
      });

      ws.addRow([]);
    };

    if (alcance === '1RA' || alcance === 'MES') escribirBloqueQuincena('1RA', filas1ra);
    if (alcance === '2DA' || alcance === 'MES') escribirBloqueQuincena('2DA', filas2da);

    // Bloque de firmas inferior izquierda (Entrega) y derecha (Recibido Cliente)
    ws.addRow([]);
    const rTitFirmas = ws.addRow([
      'ENTREGADO POR (SEGURIDAD VIP 3000 C.A.)',
      '',
      '',
      '',
      'RECIBIDO CONFORME (CLIENTE)',
      '',
      '',
      '',
    ]);
    const fTit = rTitFirmas.number;
    ws.mergeCells(`A${fTit}:D${fTit}`);
    ws.mergeCells(`E${fTit}:H${fTit}`);
    rTitFirmas.height = 20;
    ['A', 'E'].forEach((col) => {
      const c = ws.getCell(`${col}${fTit}`);
      c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const lineasFirmas: [string, string][] = [
      ['Nombre: ____________________________________', 'Nombre: ____________________________________'],
      ['Cargo:  ____________________________________', 'Firma:  ____________________________________'],
      ['Fecha:  ____________________________________', 'Fecha:  ____________________________________'],
      ['Firma:  ____________________________________', 'Sello:  ____________________________________'],
    ];

    lineasFirmas.forEach(([izq, der]) => {
      const rL = ws.addRow([izq, '', '', '', der, '', '', '']);
      const nL = rL.number;
      ws.mergeCells(`A${nL}:D${nL}`);
      ws.mergeCells(`E${nL}:H${nL}`);
      rL.height = 22;
      ws.getCell(`A${nL}`).font = { name: 'Calibri', size: 10 };
      ws.getCell(`A${nL}`).alignment = { vertical: 'bottom', horizontal: 'left' };
      ws.getCell(`E${nL}`).font = { name: 'Calibri', size: 10 };
      ws.getCell(`E${nL}`).alignment = { vertical: 'bottom', horizontal: 'left' };
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relacion_Inasistencias_${proyecto.replace(/\s+/g, '_')}_${alcance}_${NOMBRES_MESES[mes - 1]}_${anio}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

    const exportarPDFInasistencias = async (alcance: '1RA' | '2DA' | 'MES') => {
    setModalExportarFormato(null);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const logo = await cargarLogoBase64();

    const etiquetaAlcance =
      alcance === '1RA' ? '1RA QUINCENA' : alcance === '2DA' ? '2DA QUINCENA' : 'MES COMPLETO';

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 216, 25, 'F');
    if (logo) {
      try {
        doc.addImage(logo, 'JPEG', 12, 3.5, 18, 18);
      } catch {}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SEGURIDAD VIP 3000 C.A. — RELACIÓN DE INASISTENCIAS', 35, 11);
    doc.setFontSize(9.5);
    doc.setTextColor(147, 197, 253);
    doc.text(`Proyecto: ${proyecto}  |  ${etiquetaAlcance} — ${NOMBRES_MESES[mes - 1]} ${anio}`, 35, 18);

    let y = 32;
    const dibujarTablaQuincena = (titulo: string, filas: FilaDiaInasistencia[]) => {
      if (y > 215) {
        doc.addPage();
        y = 18;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${titulo} ${NOMBRES_MESES[mes - 1]} ${anio}`, 14, y);
      y += 4;

      doc.setFillColor(226, 232, 240);
      doc.rect(14, y, 188, 6, 'F');
      doc.setFontSize(7.5);
      doc.text('Día', 18, y + 4);
      doc.text('PLAZA Diur.', 42, y + 4, { align: 'right' });
      doc.text('PLAZA Noct.', 68, y + 4, { align: 'right' });
      doc.text('ASIST. Diur.', 95, y + 4, { align: 'right' });
      doc.text('ASIST. Noct.', 122, y + 4, { align: 'right' });
      doc.text('Faltas Diur.', 148, y + 4, { align: 'right' });
      doc.text('Faltas Noct.', 175, y + 4, { align: 'right' });
      doc.text('TOTAL', 199, y + 4, { align: 'right' });
      y += 8;

      doc.setFont('helvetica', 'normal');
      filas.forEach((f) => {
        doc.text(String(f.dia), 18, y);
        doc.text(String(f.plazaDiurna), 42, y, { align: 'right' });
        doc.text(String(f.plazaNocturna), 68, y, { align: 'right' });
        doc.text(String(f.asistDiurna), 95, y, { align: 'right' });
        doc.text(String(f.asistNocturna), 122, y, { align: 'right' });
        doc.text(String(f.faltasDiurnas), 148, y, { align: 'right' });
        doc.text(String(f.faltasNocturnas), 175, y, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(String(f.totalFaltas), 199, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 4.3;
      });

      const totQ = filas.reduce((a, b) => a + b.totalFaltas, 0);
      doc.setFont('helvetica', 'bold');
      doc.line(14, y - 2, 202, y - 2);
      doc.text(`TOTAL FALTAS ${titulo}:`, 150, y + 2, { align: 'right' });
      doc.text(String(totQ), 199, y + 2, { align: 'right' });
      y += 9;
    };

    if (alcance === '1RA' || alcance === 'MES') dibujarTablaQuincena('1RA QUINCENA', filas1ra);
    if (alcance === '2DA' || alcance === 'MES') dibujarTablaQuincena('2DA QUINCENA', filas2da);

    // Bloque de firmas inferior izquierda (Entrega) y derecha (Recibido Cliente)
    if (y > 220) {
      doc.addPage();
      y = 22;
    } else {
      y += 6;
    }

    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, 86, 6, 'F');
    doc.rect(116, y, 86, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('ENTREGADO POR (SEGURIDAD VIP 3000)', 57, y + 4.2, { align: 'center' });
    doc.text('RECIBIDO CONFORME (CLIENTE)', 159, y + 4.2, { align: 'center' });
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const camposIzq = ['Nombre:', 'Cargo:', 'Fecha:', 'Firma:'];
    const camposDer = ['Nombre:', 'Firma:', 'Fecha:', 'Sello:'];

    for (let i = 0; i < 4; i++) {
      doc.text(camposIzq[i], 14, y);
      doc.line(30, y, 98, y);

      doc.text(camposDer[i], 116, y);
      doc.line(132, y, 200, y);
      y += 8;
    }

    doc.save(`Relacion_Inasistencias_${proyecto.replace(/\s+/g, '_')}_${alcance}_${NOMBRES_MESES[mes - 1]}_${anio}.pdf`);
  };
  const renderTablaQuincena = (titulo: '1RA' | '2DA', filas: FilaDiaInasistencia[]) => {
    const totalQ = filas.reduce((acc, x) => acc + x.totalFaltas, 0);
    return (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase">
              {titulo} {NOMBRES_MESES[mes - 1]} {anio} — {proyecto}
            </h3>
            <p className="text-[11px] text-slate-500">
              Diurno incluye Líder QR + Diurnos • Nocturno incluye Nocturnos + Mixtos + 24X24.
            </p>
          </div>
          <span className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-black">
            TOTAL FALTAS: {totalQ}
          </span>
        </div>

        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
              <th className="p-2 border">Día</th>
              <th className="p-2 border bg-blue-50">PLAZA Diurnas</th>
              <th className="p-2 border bg-indigo-50">PLAZA Nocturna</th>
              <th className="p-2 border bg-emerald-50">ASIST. Diurna</th>
              <th className="p-2 border bg-teal-50">ASIST. Nocturna</th>
              <th className="p-2 border bg-amber-50">Faltas Diurnas</th>
              <th className="p-2 border bg-orange-50">Faltas Nocturnas</th>
              <th className="p-2 border bg-slate-200 font-black">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filas.map((f, idx) => (
              <tr key={f.dia} className="hover:bg-slate-50">
                <td className="p-1.5 border font-bold">{f.dia}</td>
                <td className="p-1 border">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.plazaDiurna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'plazaDiurna', Number(e.target.value))}
                      className="w-12 text-center border border-blue-400 rounded py-0.5 font-bold bg-blue-50"
                    />
                  ) : (
                    f.plazaDiurna
                  )}
                </td>
                <td className="p-1 border">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.plazaNocturna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'plazaNocturna', Number(e.target.value))}
                      className="w-12 text-center border border-indigo-400 rounded py-0.5 font-bold bg-indigo-50"
                    />
                  ) : (
                    f.plazaNocturna
                  )}
                </td>
                <td className="p-1 border font-semibold text-emerald-800">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.asistDiurna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'asistDiurna', Number(e.target.value))}
                      className="w-12 text-center border border-emerald-400 rounded py-0.5 font-bold bg-emerald-50"
                    />
                  ) : (
                    f.asistDiurna
                  )}
                </td>
                <td className="p-1 border font-semibold text-teal-800">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.asistNocturna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'asistNocturna', Number(e.target.value))}
                      className="w-12 text-center border border-teal-400 rounded py-0.5 font-bold bg-teal-50"
                    />
                  ) : (
                    f.asistNocturna
                  )}
                </td>
                <td className={`p-1.5 border font-bold ${f.faltasDiurnas > 0 ? 'text-red-600 bg-red-50' : ''}`}>
                  {f.faltasDiurnas}
                </td>
                <td className={`p-1.5 border font-bold ${f.faltasNocturnas > 0 ? 'text-red-600 bg-red-50' : ''}`}>
                  {f.faltasNocturnas}
                </td>
                <td className={`p-1.5 border font-black ${f.totalFaltas > 0 ? 'text-red-700 bg-red-100' : 'bg-slate-50'}`}>
                  {f.totalFaltas}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-amber-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Control Administrativo de Faltas — Operaciones, Directiva y Administración
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <ClipboardList className="text-amber-600" size={26} /> Relación de Inasistencias por Proyecto
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Refleja los días cerrados por la analista comparando plazas contratadas vs. asistencia real (Diurna con Líder QR y Nocturna/Mixta).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {puedeEditarTodo && (
            <button
              type="button"
              onClick={() => setModoEdicionTotal(!modoEdicionTotal)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                modoEdicionTotal
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              {modoEdicionTotal ? '✅ Finalizar Edición' : '✏️ Editar Celdas (Directiva)'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalExportarFormato('EXCEL')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={16} /> Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => setModalExportarFormato('PDF')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
          {mensaje}
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Building2 size={13} /> Proyecto
          </label>
          <select
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          >
            {listaProyectos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mes</label>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          >
            {NOMBRES_MESES.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Año</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Plazas Diurnas</label>
          <input
            type="number"
            value={plazaDiurnaConfig}
            onChange={(e) => setPlazaDiurnaConfig(Number(e.target.value))}
            className="w-full border border-blue-300 bg-blue-50/50 rounded-xl px-3 py-2 text-xs font-black"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Plazas Noct./Mixtas</label>
          <div className="flex gap-1.5">
            <input
              type="number"
              value={plazaNocturnaConfig}
              onChange={(e) => setPlazaNocturnaConfig(Number(e.target.value))}
              className="w-full border border-indigo-300 bg-indigo-50/50 rounded-xl px-3 py-2 text-xs font-black"
            />
            <button
              type="button"
              onClick={guardarConfigPlazas}
              disabled={guardandoPlazas}
              title="Guardar Plazas Contratadas"
              className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shrink-0"
            >
              <Save size={15} />
            </button>
          </div>
        </div>
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 py-8 text-sm">Calculando relación de inasistencias...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {renderTablaQuincena('1RA', filas1ra)}
          {renderTablaQuincena('2DA', filas2da)}
        </div>
      )}

      {modalExportarFormato && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800">
              Exportar Relación en {modalExportarFormato}
            </h3>
            <p className="text-xs text-slate-600">
              Seleccione qué período de <strong>{proyecto}</strong> ({NOMBRES_MESES[mes - 1]} {anio}) desea descargar:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  modalExportarFormato === 'EXCEL'
                    ? exportarExcelInasistencias('1RA')
                    : exportarPDFInasistencias('1RA')
                }
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                1RA Quincena (Días 01 al 15)
              </button>
              <button
                type="button"
                onClick={() =>
                  modalExportarFormato === 'EXCEL'
                    ? exportarExcelInasistencias('2DA')
                    : exportarPDFInasistencias('2DA')
                }
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
              >
                2DA Quincena (Días 16 al Fin de Mes)
              </button>
              <button
                type="button"
                onClick={() =>
                  modalExportarFormato === 'EXCEL'
                    ? exportarExcelInasistencias('MES')
                    : exportarPDFInasistencias('MES')
                }
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
              >
                Todo el Mes (1RA y 2DA Quincena)
              </button>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setModalExportarFormato(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
