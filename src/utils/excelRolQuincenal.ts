import ExcelJS from 'exceljs';
import { supabase } from '../lib/supabase';
import { leTocaGuardiaHoy } from './rotacionGuardia';

export interface ParametrosRolQuincenal {
  proyecto: string;
  proyectosLista?: string[];
  anio: number;
  mes: number;
  quincena: '1ERA' | '2DA';
}

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

const extraerNacionalidadYCedula = (cedulaRaw: string) => {
  const limpia = String(cedulaRaw || '').trim().toUpperCase();
  if (limpia.startsWith('V-') || limpia.startsWith('E-')) {
    return { nac: limpia.charAt(0), num: limpia.slice(2) };
  }
  return { nac: 'V', num: limpia };
};

const esDomingo = (fechaISO: string) => {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.getUTCDay() === 0;
};

const colLetra = (indiceUno: number): string => {
  let n = indiceUno;
  let letra = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letra = String.fromCharCode(65 + rem) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
};

const cargarLogoArrayBuffer = async (): Promise<ArrayBuffer | null> => {
  try {
    const resp = await fetch('/logo-vip3000.jpg');
    if (!resp.ok) return null;
    return await resp.arrayBuffer();
  } catch {
    return null;
  }
};

const BORDE_FINO: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};
async function construirHojaExcelJS(
  wb: ExcelJS.Workbook,
  nombreHoja: string,
  proyecto: string,
  anio: number,
  mes: number,
  quincena: '1ERA' | '2DA',
  logoId: number | null
) {
  const ws = wb.addWorksheet(nombreHoja, {
    views: [{ state: 'frozen', xSplit: 5, ySplit: 5 }],
  });

  const ultimoDiaMes = new Date(anio, mes, 0).getDate();
  const diaInicio = quincena === '1ERA' ? 1 : 16;
  const diaFin = quincena === '1ERA' ? 15 : ultimoDiaMes;

  const diasQuincena: number[] = [];
  for (let d = diaInicio; d <= diaFin; d++) {
    diasQuincena.push(d);
  }

  const fechaDesde = `${anio}-${pad2(mes)}-${pad2(diaInicio)}`;
  const fechaHasta = `${anio}-${pad2(mes)}-${pad2(diaFin)}`;
  const nombreMes = NOMBRES_MESES[mes - 1] || '';

  const { data: cierresData } = await supabase
    .from('cierres_asistencia_diaria')
    .select('fecha')
    .eq('proyecto', proyecto)
    .eq('cerrado', true)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta);

  const diasCerradosSet = new Set<string>(
    (Array.isArray(cierresData) ? cierresData : []).map((c: any) => String(c.fecha))
  );

  const { data: plantillaData } = await supabase
    .from('plantilla_proyectos')
    .select('*')
    .eq('proyecto', proyecto)
    .order('apellidos', { ascending: true });

  const plantillaAll = Array.isArray(plantillaData) ? plantillaData : [];

  const { data: asistData } = await supabase
    .from('asistencias_diarias_oficiales')
    .select('*')
    .eq('proyecto', proyecto)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta);

  const asistencias = Array.isArray(asistData) ? asistData : [];

  const { data: movsData } = await supabase
    .from('movimientos_plantilla')
    .select('*')
    .eq('proyecto', proyecto)
    .gte('created_at', `${fechaDesde}T00:00:00`)
    .lte('created_at', `${fechaHasta}T23:59:59`);

  const movimientos = Array.isArray(movsData) ? movsData : [];

  const { data: logsQrData } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('project_name', proyecto)
    .gte('created_at', `${fechaDesde}T00:00:00`)
    .lte('created_at', `${fechaHasta}T23:59:59`);

  const logsQr = Array.isArray(logsQrData) ? logsQrData : [];

  const cedulasActivas = new Set<string>();
  const activos = plantillaAll.filter((p) => {
    if (p.estado === 'ACTIVO') {
      cedulasActivas.add(String(p.cedula).toUpperCase());
      return true;
    }
    return false;
  });

  const egresadosQuincena = plantillaAll.filter(
    (p) =>
      p.estado === 'INACTIVO' &&
      p.tipo_ultimo_movimiento === 'EGRESO' &&
      p.fecha_egreso &&
      String(p.fecha_egreso).slice(0, 10) >= fechaDesde &&
      String(p.fecha_egreso).slice(0, 10) <= fechaHasta
  );

  const trasladadosQuincena = movimientos.filter(
    (m) => m.tipo_movimiento === 'TRASLADO ENVIADO' || m.tipo_movimiento === 'TRASLADO RECIBIDO'
  );

  const apoyosMap = new Map<string, any>();
  asistencias.forEach((a) => {
    const ced = String(a.cedula).toUpperCase();
    if (
      !cedulasActivas.has(ced) &&
      ['APOYO RECIBIDO', 'SERVICIO ESPECIAL RECIBIDO'].includes(String(a.estatus).toUpperCase())
    ) {
      if (!apoyosMap.has(ced)) {
        const partes = String(a.nombre_completo || '').split(',');
        apoyosMap.set(ced, {
          cedula: ced,
          apellidos: (partes.at(0) || '').trim(),
          nombres: (partes.at(1) || partes.at(0) || '').trim(),
          cargo: a.cargo || 'OFICIAL',
          turno: a.turno || 'MIXTO',
          grupo: a.grupo || 'A',
        });
      }
    }
  });
  const apoyosList = Array.from(apoyosMap.values());

  const obtenerCodigoDia = (
    cedula: string,
    turnoBase: string,
    grupoBase: 'A' | 'B' | 'C',
    fechaISO: string,
    esApoyoExterno = false,
    cargoBase = 'OFICIAL',
    nombresBase = '',
    apellidosBase = ''
  ): string => {
    if (!diasCerradosSet.has(fechaISO)) return '';

    const ced = cedula.toUpperCase();
    const marcasDia = asistencias.filter(
      (a) => String(a.cedula).toUpperCase() === ced && a.fecha === fechaISO
    );

    const movEgreso = movimientos.find(
      (m) =>
        String(m.cedula).toUpperCase() === ced &&
        m.tipo_movimiento === 'EGRESO' &&
        String(m.created_at).slice(0, 10) === fechaISO
    );
    if (movEgreso) return 'E';

    const movTraslado = movimientos.find(
      (m) =>
        String(m.cedula).toUpperCase() === ced &&
        (m.tipo_movimiento === 'TRASLADO ENVIADO' || m.tipo_movimiento === 'TRASLADO RECIBIDO') &&
        String(m.created_at).slice(0, 10) === fechaISO
    );
    if (movTraslado) return 'T';

    if (marcasDia.length > 0) {
      const est = String(marcasDia.at(0)?.estatus || '').toUpperCase();
      const trn = String(marcasDia.at(0)?.turno || turnoBase || 'MIXTO').toUpperCase();

      if (est === 'SERVICIO ESPECIAL MIXTO') return 'RR';
      if (
        [
          'SERVICIO ESPECIAL DIURNO/NOCTURNO',
          'SERVICIO ESPECIAL PROPIO',
          'SERVICIO ESPECIAL RECIBIDO',
        ].includes(est)
      ) {
        return trn === 'MIXTO' ? 'RR' : 'R';
      }
      if (est === 'PRESENTE' || est === 'APOYO RECIBIDO') {
        if (trn === 'DIURNO') return 'D';
        if (trn === 'NOCTURNO') return 'N';
        return 'M';
      }
      if (est === 'FALTA INJUSTIFICADA') return 'I';
      if (est === 'FALTA JUSTIFICADA' || est === 'PERMISO') return 'J';
      if (est === 'VACACIONES') return 'V';
      if (est === 'REPOSO MEDICO' || est === 'BAJA POR SALUD') return 'RM';
      if (est === 'DESCANSO') return 'L';
    }

    if (esApoyoExterno) return '';

    // Líder de Proyecto (DIURNO 12x2): se toma de su marcación QR (attendance_logs), y días sin marca son Libre ('L')
    if (String(cargoBase || '').toUpperCase() === 'LIDER') {
      const primerNombre = String(nombresBase || '').trim().toLowerCase().split(' ').at(0) || '';
      const primerApellido = String(apellidosBase || '').trim().toLowerCase().split(' ').at(0) || '';
      const tuvoMarcaQR = logsQr.some((lg: any) => {
        const fechaLog = new Date(lg.created_at).toLocaleDateString('en-CA', {
          timeZone: 'America/Caracas',
        });
        if (fechaLog !== fechaISO) return false;
        const uName = String(lg.user_name || lg.userName || lg.nombre_completo || '').toLowerCase();
        if (!uName) return true;
        return (
          (primerNombre && uName.includes(primerNombre)) ||
          (primerApellido && uName.includes(primerApellido))
        );
      });
      return tuvoMarcaQR ? 'D' : 'L';
    }

    const toca = leTocaGuardiaHoy(grupoBase, turnoBase as any, fechaISO);
    if (!toca) return 'L';
    const trnNorm = String(turnoBase || 'MIXTO').toUpperCase();
    if (trnNorm === 'DIURNO') return 'D';
    if (trnNorm === 'NOCTURNO') return 'N';
    return 'M';
  };
  const encabezadosTabla = [
    'Nro.',
    'NOMBRES',
    'APELLIDOS',
    'NACIONALIDAD',
    'CEDULA',
    ...diasQuincena.map((d) => String(d)),
    'NOCHES',
    'DOMINGOS',
    'FALTAS',
    'JUSTIFICATIVO',
    'DIAS LABORADOS',
    'REDOBLES',
    'DIAS LIBRES',
    'CARGOS',
  ];

  const totalCols = encabezadosTabla.length;

  ws.columns = [
    { width: 8 },
    { width: 22 },
    { width: 22 },
    { width: 13 },
    { width: 13 },
    ...diasQuincena.map(() => ({ width: 5.5 })),
    { width: 9 },
    { width: 10 },
    { width: 8 },
    { width: 14 },
    { width: 15 },
    { width: 10 },
    { width: 12 },
    { width: 22 },
  ];

  ws.getRow(1).height = 24;
  ws.getRow(2).height = 22;
  ws.getRow(3).height = 18;

  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= totalCols; c++) {
      ws.getCell(r, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' },
      };
    }
  }

  if (logoId !== null) {
    ws.addImage(logoId, {
      tl: { col: 0.15, row: 0.15 },
      ext: { width: 68, height: 68 },
    });
  }

  ws.getCell(1, 3).value = `ROL DE GUARDIA — ${quincena} QUINCENA DE ${nombreMes} ${anio}`;
  ws.getCell(1, 3).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };

  ws.getCell(2, 3).value = `PROYECTO: ${proyecto.toUpperCase()}   •   SEGURIDAD VIP 3000 C.A.`;
  ws.getCell(2, 3).font = { bold: true, size: 10.5, color: { argb: 'FF93C5FD' } };

  let filaActual = 5;

  const escribirCabecera = () => {
    const row = ws.getRow(filaActual);
    row.height = 24;
    encabezadosTabla.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 9, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
      cell.border = BORDE_FINO;
    });
    filaActual++;
  };

  const escribirBannerSeccion = (titulo: string) => {
    filaActual++;
    const row = ws.getRow(filaActual);
    row.height = 21;
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    }
    row.getCell(1).value = titulo;
    row.getCell(1).font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    filaActual++;
    escribirCabecera();
  };

  const aplicarColorCodigo = (cell: ExcelJS.Cell, cod: string, esDom: boolean) => {
    let bg = esDom ? 'FFFEF9C3' : 'FFFFFFFF';
    let fg = 'FF0F172A';

    if (['M', 'D', 'N'].includes(cod)) {
      bg = 'FFDCFCE7';
      fg = 'FF166534';
    } else if (['RR', 'R'].includes(cod)) {
      bg = 'FFDBEAFE';
      fg = 'FF1E40AF';
    } else if (cod === 'L') {
      bg = 'FFF8FAFC';
      fg = 'FF64748B';
    } else if (['I', 'E'].includes(cod)) {
      bg = 'FFFEE2E2';
      fg = 'FF991B1B';
    } else if (['J', 'RM', 'V', 'T'].includes(cod)) {
      bg = 'FFFEF3C7';
      fg = 'FF92400E';
    }

    cell.font = { bold: true, size: 9.5, color: { argb: fg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { horizontal: 'center', vertical: 'center' };
    cell.border = BORDE_FINO;
  };

  const colPrimerDia = colLetra(6);
  const colUltimoDia = colLetra(6 + diasQuincena.length - 1);

  const escribirPersona = (
    idx: number,
    persona: any,
    nacionalidadForzada?: string,
    esApoyoExterno = false
  ) => {
    const r = filaActual;
    const row = ws.getRow(r);
    row.height = 19;
    const { nac, num } = extraerNacionalidadYCedula(persona.cedula);

    const setTexto = (col: number, val: any, centrar = false) => {
      const cell = row.getCell(col);
      cell.value = val;
      cell.font = { size: 9, bold: centrar };
      cell.alignment = { horizontal: centrar ? 'center' : 'left', vertical: 'center' };
      cell.border = BORDE_FINO;
    };

    setTexto(1, idx + 1, true);
    setTexto(2, persona.nombres || '');
    setTexto(3, persona.apellidos || '');
    setTexto(4, nacionalidadForzada || nac, true);
    setTexto(5, num, true);

    let noches = 0;
    let domingos = 0;
    let faltas = 0;
    let justificativos = 0;
    let diasLaborados = 0;
    let redobles = 0;
    let diasLibres = 0;

    diasQuincena.forEach((dia, iDia) => {
      const fechaISO = `${anio}-${pad2(mes)}-${pad2(dia)}`;
      const esDom = esDomingo(fechaISO);
      const cod = obtenerCodigoDia(
        persona.cedula,
        persona.turno || 'MIXTO',
        (persona.grupo || 'A') as 'A' | 'B' | 'C',
        fechaISO,
        esApoyoExterno,
        persona.cargo || 'OFICIAL',
        persona.nombres || '',
        persona.apellidos || ''
      );
      const cell = row.getCell(6 + iDia);
      cell.value = cod;
      aplicarColorCodigo(cell, cod, esDom);

      if (['M', 'D', 'N', 'RR', 'R'].includes(cod)) {
        diasLaborados++;
        if (esDom) domingos++;
      }
      if (['M', 'N', 'RR'].includes(cod)) noches++;
      if (cod === 'RR') redobles += 2;
      if (cod === 'R') redobles += 1;
      if (cod === 'I') faltas++;
      if (['J', 'RM'].includes(cod)) justificativos++;
      if (['L', 'V'].includes(cod)) diasLibres++;
    });

    const cBase = 6 + diasQuincena.length;
    const rango = `${colPrimerDia}${r}:${colUltimoDia}${r}`;

    const setFormula = (col: number, formula: string, result: number) => {
      const cell = row.getCell(col);
      cell.value = { formula, result };
      cell.font = { size: 9, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'center' };
      cell.border = BORDE_FINO;
    };

    setFormula(cBase, `COUNTIF(${rango},"M")+COUNTIF(${rango},"N")+COUNTIF(${rango},"RR")`, noches);
    setTexto(cBase + 1, domingos, true);
    setFormula(cBase + 2, `COUNTIF(${rango},"I")`, faltas);
    setFormula(cBase + 3, `COUNTIF(${rango},"J")+COUNTIF(${rango},"RM")`, justificativos);
    setFormula(
      cBase + 4,
      `COUNTIF(${rango},"M")+COUNTIF(${rango},"D")+COUNTIF(${rango},"N")+COUNTIF(${rango},"RR")+COUNTIF(${rango},"R")`,
      diasLaborados
    );
    setFormula(cBase + 5, `(COUNTIF(${rango},"RR")*2)+COUNTIF(${rango},"R")`, redobles);
    setFormula(cBase + 6, `COUNTIF(${rango},"L")+COUNTIF(${rango},"V")`, diasLibres);
    setTexto(cBase + 7, persona.cargo || 'OFICIAL');

    filaActual++;
  };

  escribirCabecera();
  const filasActivosInicio = filaActual;
  activos.forEach((p, i) => escribirPersona(i, p));
  const filasActivosFin = Math.max(filasActivosInicio, filaActual - 1);

  escribirBannerSeccion('APOYOS RECIBIDOS');
  apoyosList.forEach((ap, i) => escribirPersona(i, ap, 'SI', true));

  escribirBannerSeccion('TRASLADOS');
  trasladadosQuincena.forEach((tr, i) => {
    const partes = String(tr.nombre_completo || '').split(' ');
    escribirPersona(
      i,
      {
        cedula: tr.cedula,
        nombres: partes.slice(0, 2).join(' '),
        apellidos: partes.slice(2).join(' ') || partes.at(0) || '',
        cargo: tr.cargo || 'OFICIAL',
        turno: tr.turno || 'MIXTO',
        grupo: tr.grupo || 'A',
      },
      'SI',
      true
    );
  });

  escribirBannerSeccion('EGRESOS');
  egresadosQuincena.forEach((eg, i) => escribirPersona(i, eg, 'E', false));

  filaActual++;
  const rowTotal = ws.getRow(filaActual);
  rowTotal.height = 22;
  for (let c = 1; c <= totalCols; c++) {
    const cell = rowTotal.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.font = { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'center' };
    cell.border = BORDE_FINO;
  }
  rowTotal.getCell(2).value = 'TOTAL OPERATIVO POR DÍA';

  diasQuincena.forEach((_, iDia) => {
    const letraCol = colLetra(6 + iDia);
    const rng = `${letraCol}${filasActivosInicio}:${letraCol}${filasActivosFin}`;
    rowTotal.getCell(6 + iDia).value = {
      formula: `COUNTIF(${rng},"M")+COUNTIF(${rng},"D")+COUNTIF(${rng},"N")+COUNTIF(${rng},"RR")+COUNTIF(${rng},"R")`,
      result: 0,
    };
  });
}
async function construirHojaPortadaNomina(
  wb: ExcelJS.Workbook,
  proyecto: string,
  anio: number,
  mes: number,
  quincena: '1ERA' | '2DA',
  logoId: number | null
) {
  const ws = wb.addWorksheet('PORTADA_NOMINA');
  const ultimoDiaMes = new Date(anio, mes, 0).getDate();
  const diaInicio = quincena === '1ERA' ? 1 : 16;
  const diaFin = quincena === '1ERA' ? 15 : ultimoDiaMes;
  const fechaDesde = `${anio}-${pad2(mes)}-${pad2(diaInicio)}`;
  const fechaHasta = `${anio}-${pad2(mes)}-${pad2(diaFin)}`;
  const nombreMes = NOMBRES_MESES[mes - 1] || '';

  const { data: plantillaData } = await supabase
    .from('plantilla_proyectos')
    .select('*')
    .eq('proyecto', proyecto)
    .eq('estado', 'ACTIVO')
    .order('apellidos', { ascending: true });

  const activos = Array.isArray(plantillaData) ? plantillaData : [];

  ws.columns = [
    { width: 6 },
    { width: 22 },
    { width: 22 },
    { width: 6 },
    { width: 13 },
    { width: 20 },
    { width: 14 },
    { width: 20 },
    { width: 13 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 15 },
    { width: 14 },
    { width: 15 },
    { width: 14 },
    { width: 16 },
  ];

  for (let r = 1; r <= 3; r++) {
    ws.getRow(r).height = 22;
    for (let c = 1; c <= 21; c++) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    }
  }
  if (logoId !== null) {
    ws.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 64, height: 64 } });
  }
  ws.getCell(1, 3).value = `PORTADA DE NÓMINA — ${quincena} QUINCENA DE ${nombreMes} ${anio}`;
  ws.getCell(1, 3).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  ws.getCell(2, 3).value = `PROYECTO: ${proyecto.toUpperCase()}   •   PERÍODO: ${fechaDesde} AL ${fechaHasta}`;
  ws.getCell(2, 3).font = { bold: true, size: 10, color: { argb: 'FF93C5FD' } };

  ws.getCell(5, 2).value = 'PARÁMETROS DE PAGO EDITABLES (ANALISTA / RRHH)';
  ws.getCell(5, 2).font = { bold: true, size: 10, color: { argb: 'FF1E3A8A' } };

  const parametros = [
    ['Valor Día Laborado (Bs):', 0, 'Bono Alimentación Diario (Bs):', 0],
    ['Bono Ropa Tintorería (Bs):', 0, 'Bono Ropa Trabajo I (Bs):', 0],
    ['Bono Jefe de Grupo (Bs):', 0, 'Bono Nocturno por Noche (Bs):', 0],
    ['Valor Domingo / Feriado (Bs):', 0, 'Póliza A.P. Deducción (Bs):', 0],
    ['Bono Líder de Proyecto (Bs):', 0, 'Otros Bonos / Ajustes (Bs):', 0],
  ];

  parametros.forEach((par, i) => {
    const r = 6 + i;
    ws.getCell(r, 2).value = par[0];
    ws.getCell(r, 2).font = { bold: true, size: 9 };
    const cVal1 = ws.getCell(r, 3);
    cVal1.value = par[1];
    cVal1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
    cVal1.border = BORDE_FINO;

    ws.getCell(r, 5).value = par[2];
    ws.getCell(r, 5).font = { bold: true, size: 9 };
    const cVal2 = ws.getCell(r, 6);
    cVal2.value = par[3];
    cVal2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
    cVal2.border = BORDE_FINO;
  });

  const headersNomina = [
    'Nº',
    'NOMBRES',
    'APELLIDOS',
    'NAC',
    'CÉDULA',
    'CARGO',
    'FECHA INGRESO',
    'ANTIGÜEDAD',
    'DÍAS LAB.',
    'BONO TINTORERÍA',
    'BONO ROPA I',
    'ALIMENTACIÓN',
    'BONO CARGO',
    'DOMINGOS',
    'BONO NOCTURNO',
    'FALTAS',
    'JUSTIF.',
    'REDOBLES',
    'DÍAS LIBRES',
    'PÓLIZA A.P.',
    'TOTAL DEVENGADO (Bs)',
  ];

  const rowHead = ws.getRow(13);
  rowHead.height = 24;
  headersNomina.forEach((h, idx) => {
    const cell = rowHead.getCell(idx + 1);
    cell.value = h;
    cell.font = { bold: true, size: 8.5, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    cell.border = BORDE_FINO;
  });

  const cantDias = diaFin - diaInicio + 1;
  const colNochesRol = colLetra(6 + cantDias);
  const colDomingosRol = colLetra(6 + cantDias + 1);
  const colFaltasRol = colLetra(6 + cantDias + 2);
  const colJustifRol = colLetra(6 + cantDias + 3);
  const colDiasLabRol = colLetra(6 + cantDias + 4);
  const colRedoblesRol = colLetra(6 + cantDias + 5);
  const colLibresRol = colLetra(6 + cantDias + 6);

  activos.forEach((p, idx) => {
    const r = 14 + idx;
    const filaRol = 6 + idx;
    const row = ws.getRow(r);
    row.height = 19;
    const { nac, num } = extraerNacionalidadYCedula(p.cedula);
    const fechaIng = p.fecha_ingreso ? String(p.fecha_ingreso).slice(0, 10) : '';

    let antigTexto = 'N/A';
    if (fechaIng) {
      const f1 = new Date(fechaIng);
      const f2 = new Date(fechaHasta);
      const diffDias = Math.max(0, Math.floor((f2.getTime() - f1.getTime()) / (1000 * 60 * 60 * 24)));
      const anios = Math.floor(diffDias / 365);
      const meses = Math.floor((diffDias % 365) / 30);
      const dias = (diffDias % 365) % 30;
      antigTexto = `${anios} Año(s), ${meses} mes(es), ${dias} día(s)`;
    }

    const setC = (c: number, val: any, formula?: string) => {
      const cell = row.getCell(c);
      cell.value = formula ? { formula, result: 0 } : val;
      cell.font = { size: 8.5, bold: c === 21 };
      cell.border = BORDE_FINO;
      cell.alignment = { horizontal: c <= 3 || c === 6 ? 'left' : 'center', vertical: 'center' };
    };

    const hojaRolRef = `${quincena}_QUINCENA`;
    setC(1, idx + 1);
    setC(2, p.nombres || '');
    setC(3, p.apellidos || '');
    setC(4, nac);
    setC(5, num);
    setC(6, p.cargo || 'OFICIAL');
    setC(7, fechaIng);
    setC(8, antigTexto);
    setC(9, 0, `${hojaRolRef}!${colDiasLabRol}${filaRol}`);
    setC(10, 0, `I${r}*$C$7`);
    setC(11, 0, `I${r}*$F$7`);
    setC(12, 0, `I${r}*$F$6`);
    setC(13, 0, `IF(F${r}="J. GRUPO",$C$8,IF(F${r}="LIDER",$C$10,0))`);
    setC(14, 0, `${hojaRolRef}!${colDomingosRol}${filaRol}`);
    setC(15, 0, `${hojaRolRef}!${colNochesRol}${filaRol}*$F$8`);
    setC(16, 0, `${hojaRolRef}!${colFaltasRol}${filaRol}`);
    setC(17, 0, `${hojaRolRef}!${colJustifRol}${filaRol}`);
    setC(18, 0, `${hojaRolRef}!${colRedoblesRol}${filaRol}`);
    setC(19, 0, `${hojaRolRef}!${colLibresRol}${filaRol}`);
    setC(20, 0, `$F$9`);
    setC(21, 0, `(I${r}*$C$6)+J${r}+K${r}+L${r}+M${r}+(N${r}*$C$9)+O${r}+$F$10-T${r}`);
  });
}

export async function generarExcelRolQuincenal({
  proyecto,
  proyectosLista = [],
  anio,
  mes,
  quincena,
}: ParametrosRolQuincenal) {
  const nombreMes = NOMBRES_MESES[mes - 1] || '';
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Seguridad VIP 3000 C.A.';
  wb.created = new Date();

  const logoBuffer = await cargarLogoArrayBuffer();
  const logoId = logoBuffer ? wb.addImage({ buffer: logoBuffer, extension: 'jpeg' }) : null;

  if (proyecto === 'TODOS' && proyectosLista.length > 0) {
    for (const proy of proyectosLista) {
      const nombrePestana = proy.replace(/[:\\/?*\[\]]/g, '').slice(0, 30) || 'PROYECTO';
      await construirHojaExcelJS(wb, nombrePestana, proy, anio, mes, quincena, logoId);
    }
  } else {
    await construirHojaExcelJS(wb, `${quincena}_QUINCENA`, proyecto, anio, mes, quincena, logoId);
    await construirHojaPortadaNomina(wb, proyecto, anio, mes, quincena, logoId);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    proyecto === 'TODOS'
      ? `Roles_Guardia_Por_Proyecto_${quincena}_Quincena_${nombreMes}_${anio}.xlsx`
      : `Rol_Guardia_y_Nomina_${proyecto.replace(/\s+/g, '_')}_${quincena}_Quincena_${nombreMes}_${anio}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
