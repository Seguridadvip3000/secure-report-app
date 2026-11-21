import * as XLSX from 'xlsx';
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
async function construirHojaPorProyecto(
  proyecto: string,
  anio: number,
  mes: number,
  quincena: '1ERA' | '2DA'
) {
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
    esApoyoExterno = false
  ): string => {
    if (!diasCerradosSet.has(fechaISO)) {
      return '';
    }

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

      if (est === 'SERVICIO ESPECIAL MIXTO') {
        return 'RR';
      }
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

    const toca = leTocaGuardiaHoy(grupoBase, turnoBase as any, fechaISO);
    if (!toca) return 'L';
    const trnNorm = String(turnoBase || 'MIXTO').toUpperCase();
    if (trnNorm === 'DIURNO') return 'D';
    if (trnNorm === 'NOCTURNO') return 'N';
    return 'M';
  };
  const construirFilaPersona = (
    idx: number,
    persona: any,
    nacionalidadForzada?: string,
    esApoyoExterno = false
  ) => {
    const { nac, num } = extraerNacionalidadYCedula(persona.cedula);
    const codigosDias: string[] = [];

    let noches = 0;
    let domingos = 0;
    let faltas = 0;
    let justificativos = 0;
    let diasLaborados = 0;
    let redobles = 0;
    let diasLibres = 0;

    diasQuincena.forEach((dia) => {
      const fechaISO = `${anio}-${pad2(mes)}-${pad2(dia)}`;
      const cod = obtenerCodigoDia(
        persona.cedula,
        persona.turno || 'MIXTO',
        (persona.grupo || 'A') as 'A' | 'B' | 'C',
        fechaISO,
        esApoyoExterno
      );
      codigosDias.push(cod);

      const esTrabajado = ['M', 'D', 'N', 'RR', 'R'].includes(cod);
      if (esTrabajado) {
        diasLaborados += 1;
        if (esDomingo(fechaISO)) domingos += 1;
      }
      if (cod === 'N' || cod === 'M' || cod === 'RR') noches += 1;
      if (cod === 'RR') redobles += 2;
      if (cod === 'R') redobles += 1;
      if (cod === 'I') faltas += 1;
      if (cod === 'J' || cod === 'RM') justificativos += 1;
      if (cod === 'L' || cod === 'V') diasLibres += 1;
    });

    return {
      fila: [
        idx + 1,
        persona.nombres || '',
        persona.apellidos || '',
        nacionalidadForzada || nac,
        num,
        ...codigosDias,
        noches,
        domingos,
        faltas,
        justificativos,
        diasLaborados,
        redobles,
        diasLibres,
        persona.cargo || 'OFICIAL',
      ],
      codigosDias,
    };
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

  const hojaRows: any[][] = [
    [`${quincena} QUINCENA DE ${nombreMes} ${anio}`],
    [proyecto.toUpperCase()],
    [],
    encabezadosTabla,
  ];

  const conteoOperativoPorDia = new Array(diasQuincena.length).fill(0);

  activos.forEach((p, i) => {
    const { fila, codigosDias } = construirFilaPersona(i, p);
    hojaRows.push(fila);
    codigosDias.forEach((c, idxDia) => {
      if (['M', 'D', 'N', 'RR', 'R'].includes(c)) conteoOperativoPorDia[idxDia] += 1;
    });
  });

  hojaRows.push([]);
  hojaRows.push(['APOYOS']);
  hojaRows.push(encabezadosTabla);
  apoyosList.forEach((ap, i) => {
    const { fila, codigosDias } = construirFilaPersona(i, ap, 'SI', true);
    hojaRows.push(fila);
    codigosDias.forEach((c, idxDia) => {
      if (['M', 'D', 'N', 'RR', 'R'].includes(c)) conteoOperativoPorDia[idxDia] += 1;
    });
  });

  hojaRows.push([]);
  hojaRows.push(['TRASLADOS']);
  hojaRows.push(encabezadosTabla);
  trasladadosQuincena.forEach((tr, i) => {
    const partes = String(tr.nombre_completo || '').split(' ');
    const { fila } = construirFilaPersona(
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
    hojaRows.push(fila);
  });

  hojaRows.push([]);
  hojaRows.push(['EGRESOS']);
  hojaRows.push(encabezadosTabla);
  egresadosQuincena.forEach((eg, i) => {
    const { fila } = construirFilaPersona(i, eg, 'E', false);
    hojaRows.push(fila);
  });

  hojaRows.push([]);
  hojaRows.push(['', 'TOTAL OPERATIVO POR DÍA', '', '', '', ...conteoOperativoPorDia]);

  return XLSX.utils.aoa_to_sheet(hojaRows);
}

export async function generarExcelRolQuincenal({
  proyecto,
  proyectosLista = [],
  anio,
  mes,
  quincena,
}: ParametrosRolQuincenal) {
  const nombreMes = NOMBRES_MESES[mes - 1] || '';
  const wb = XLSX.utils.book_new();

  if (proyecto === 'TODOS' && proyectosLista.length > 0) {
    for (const proy of proyectosLista) {
      const ws = await construirHojaPorProyecto(proy, anio, mes, quincena);
      const nombrePestana = proy.replace(/[:\\/?*\[\]]/g, '').slice(0, 30) || 'PROYECTO';
      XLSX.utils.book_append_sheet(wb, ws, nombrePestana);
    }
    XLSX.writeFile(wb, `Roles_Guardia_Por_Proyecto_${quincena}_Quincena_${nombreMes}_${anio}.xlsx`);
    return;
  }

  const ws = await construirHojaPorProyecto(proyecto, anio, mes, quincena);
  XLSX.utils.book_append_sheet(wb, ws, `${quincena}_QUINCENA`);
  const nombreArchivo = `Rol_Guardia_${proyecto.replace(/\s+/g, '_')}_${quincena}_Quincena_${nombreMes}_${anio}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
}
