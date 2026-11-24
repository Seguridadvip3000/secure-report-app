import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import { leTocaGuardiaHoy } from '../utils/rotacionGuardia';
import { generarPDFRecibosNomina, ItemReciboNomina } from '../utils/pdfRecibosNomina';
import {
  Receipt,
  Building2,
  CheckCircle2,
  Calculator,
  Printer,
  History,
  Search,
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

export default function NominaRecibosPage() {
  const { currentUser } = useAuth();
  const nombreUsuario = currentUser?.nombre_completo || currentUser?.username || 'Analista';

  const hoy = new Date();
  const [pestana, setPestana] = useState<'GENERAR' | 'HISTORICO'>('GENERAR');
  const [listaProyectos, setListaProyectos] = useState<string[]>([]);
  const [proyecto, setProyecto] = useState<string>('');
  const [anio, setAnio] = useState<number>(hoy.getFullYear());
  const [mes, setMes] = useState<number>(hoy.getMonth() + 1);
  const [quincena, setQuincena] = useState<'1ERA' | '2DA'>(hoy.getDate() <= 15 ? '1ERA' : '2DA');
  const [fechaPago, setFechaPago] = useState<string>(hoy.toLocaleDateString('en-CA'));

  // Tasa referencial empresa para cuotas de botas ($7.5 c/u)
  const [tasaReferencialBs, setTasaReferencialBs] = useState<number>(0);

  // Parámetros editables de devengados
  const [valorDia, setValorDia] = useState<number>(43.33);
  const [bonoNocturnoPorNoche, setBonoNocturnoPorNoche] = useState<number>(13.0);
  const [doceavaHoraPorDia, setDoceavaHoraPorDia] = useState<number>(11.82);
  const [ropaTrabajo1, setRopaTrabajo1] = useState<number>(0);
  const [ropaTintoreria, setRopaTintoreria] = useState<number>(0);
  const [bonoJefeGrupo, setBonoJefeGrupo] = useState<number>(0);
  const [bonoLiderProyecto, setBonoLiderProyecto] = useState<number>(0);
  const [valorDescansoLab, setValorDescansoLab] = useState<number>(0);
  const [valorDescansoNoLab, setValorDescansoNoLab] = useState<number>(0);
  const [valorDia31, setValorDia31] = useState<number>(0);
  const [ropaTrabajo2, setRopaTrabajo2] = useState<number>(0);
  const [alimentacionDiaria, setAlimentacionDiaria] = useState<number>(0);

  // Deducciones base editables
  const [seguroSocialBase, setSeguroSocialBase] = useState<number>(2.4);
  const [paroForzosoBase, setParoForzosoBase] = useState<number>(0);
  const [ahorroHabBase, setAhorroHabBase] = useState<number>(0);
  const [fideicomisoBase, setFideicomisoBase] = useState<number>(0);
  const [polizaApBase, setPolizaApBase] = useState<number>(0);
  const [descuentoPorFalta, setDescuentoPorFalta] = useState<number>(0);

  const [filas, setFilas] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [procesandoPago, setProcesandoPago] = useState<boolean>(false);
  const [nominaPagada, setNominaPagada] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Histórico de nóminas y recibos
  const [historicoRecibos, setHistoricoRecibos] = useState<any[]>([]);
  const [busquedaHistorico, setBusquedaHistorico] = useState<string>('');

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
  const cargarDatosQuincena = async () => {
    if (!proyecto) return;
    setCargando(true);
    setNominaPagada(false);
    setMensaje(null);

    try {
      const ultimoDiaMes = new Date(anio, mes, 0).getDate();
      const diaInicio = quincena === '1ERA' ? 1 : 16;
      const diaFin = quincena === '1ERA' ? 15 : ultimoDiaMes;
      const fechaDesde = `${anio}-${pad2(mes)}-${pad2(diaInicio)}`;
      const fechaHasta = `${anio}-${pad2(mes)}-${pad2(diaFin)}`;

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
        .eq('estado', 'ACTIVO')
        .order('apellidos', { ascending: true });

      const activos = Array.isArray(plantillaData) ? plantillaData : [];

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

      const calculadas = activos.map((p) => {
        const ced = String(p.cedula || '').toUpperCase();
        const cargoUpper = String(p.cargo || 'OFICIAL').toUpperCase();
        let diasLab = 0;
        let noches = 0;
        let domingosLab = 0;
        let descansosNoLab = 0;
        let faltas = 0;
        let tieneDia31 = 0;

        for (let d = diaInicio; d <= diaFin; d++) {
          const fechaISO = `${anio}-${pad2(mes)}-${pad2(d)}`;
          if (!diasCerradosSet.has(fechaISO)) continue;

          const dt = new Date(Date.UTC(anio, mes - 1, d, 12, 0, 0));
          const esDom = dt.getUTCDay() === 0;
          let cod = 'L';

          const marca = asistencias.find(
            (a) => String(a.cedula || '').toUpperCase() === ced && a.fecha === fechaISO
          );

          if (marca) {
            const est = String(marca.estatus || '').toUpperCase();
            const trn = String(marca.turno || p.turno || 'MIXTO').toUpperCase();
            if (
              [
                'PRESENTE',
                'APOYO RECIBIDO',
                'SERVICIO ESPECIAL MIXTO',
                'SERVICIO ESPECIAL DIURNO/NOCTURNO',
                'SERVICIO ESPECIAL PROPIO',
                'SERVICIO ESPECIAL RECIBIDO',
              ].includes(est)
            ) {
              cod = trn === 'DIURNO' ? 'D' : trn === 'NOCTURNO' ? 'N' : 'M';
            } else if (est === 'FALTA INJUSTIFICADA') {
              cod = 'I';
            } else {
              cod = 'L';
            }
          } else if (cargoUpper === 'LIDER') {
            const pNom = String(p.nombres || '').trim().toLowerCase().split(' ').at(0) || '';
            const pApe = String(p.apellidos || '').trim().toLowerCase().split(' ').at(0) || '';
            const marcoQR = logsQr.some((lg: any) => {
              const fLog = new Date(lg.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
              if (fLog !== fechaISO) return false;
              const uName = String(lg.user_name || lg.userName || '').toLowerCase();
              return !uName || (pNom && uName.includes(pNom)) || (pApe && uName.includes(pApe));
            });
            cod = marcoQR ? 'D' : 'L';
          } else {
            const toca = leTocaGuardiaHoy(p.grupo || 'A', p.turno || 'MIXTO', fechaISO);
            cod = toca ? (p.turno === 'DIURNO' ? 'D' : p.turno === 'NOCTURNO' ? 'N' : 'M') : 'L';
          }

          if (['M', 'D', 'N'].includes(cod)) {
            diasLab++;
            if (d === 31) tieneDia31 = 1;
            if (esDom) domingosLab++;
          } else if (cod === 'I') {
            faltas++;
          } else {
            descansosNoLab++;
          }

          if (['M', 'N'].includes(cod)) noches++;
        }

        return {
          ...p,
          diasLab,
          noches,
          domingosLab,
          descansosNoLab,
          faltas,
          tieneDia31,
          otrosExtra: 0,
          descuentoExtra: 0,
        };
      });

      setFilas(calculadas);
    } catch (err) {
      console.error('Error cargando nómina:', err);
    } finally {
      setCargando(false);
    }
  };

  const cargarHistoricoRecibos = async () => {
    setCargando(true);
    try {
      const { data } = await supabase
        .from('recibos_nomina_emitidos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      setHistoricoRecibos(Array.isArray(data) ? data : []);
    } catch {
      setHistoricoRecibos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (pestana === 'GENERAR' && proyecto) {
      cargarDatosQuincena();
    } else if (pestana === 'HISTORICO') {
      cargarHistoricoRecibos();
    }
  }, [pestana, proyecto, anio, mes, quincena]);
  const calcularItemRecibo = (f: any): ItemReciboNomina => {
    const ultimoDiaMes = new Date(anio, mes, 0).getDate();
    const diaInicio = quincena === '1ERA' ? 1 : 16;
    const diaFin = quincena === '1ERA' ? 15 : ultimoDiaMes;
    const periodoDesde = `${anio}-${pad2(mes)}-${pad2(diaInicio)}`;
    const periodoHasta = `${anio}-${pad2(mes)}-${pad2(diaFin)}`;

    const cargoUp = String(f.cargo || 'OFICIAL').toUpperCase();
    const diasLabMonto = f.diasLab * valorDia;
    const bonoNocturnoMonto = f.noches * bonoNocturnoPorNoche;
    const doceavaHoraMonto = f.diasLab * doceavaHoraPorDia;
    const ropaTrabajo1Monto = f.diasLab > 0 ? ropaTrabajo1 : 0;
    const ropaTintoreriaMonto = f.diasLab > 0 ? ropaTintoreria : 0;
    const jefeGrupoMonto =
      cargoUp === 'J. GRUPO' ? bonoJefeGrupo : cargoUp === 'LIDER' ? bonoLiderProyecto : 0;
    const descansoLabMonto = f.domingosLab * valorDescansoLab;
    const descansoNoLabMonto = f.descansosNoLab * valorDescansoNoLab;
    const dia31Monto = f.tieneDia31 * valorDia31;
    const ropaTrabajo2Monto = f.diasLab > 0 ? ropaTrabajo2 : 0;
    const alimentacionMonto = f.diasLab * alimentacionDiaria;
    const otrosMonto = Number(f.otrosExtra || 0);

    const totalDevengado =
      diasLabMonto +
      bonoNocturnoMonto +
      doceavaHoraMonto +
      ropaTrabajo1Monto +
      ropaTintoreriaMonto +
      jefeGrupoMonto +
      descansoLabMonto +
      descansoNoLabMonto +
      dia31Monto +
      ropaTrabajo2Monto +
      alimentacionMonto +
      otrosMonto;

    const cuotasPagadas = Number(f.botas_cuotas_pagadas || 0);
    const cuotasTotales = Number(f.botas_cuotas_totales || 4);
    const tieneCuotaBotasActiva = Boolean(f.botas_nuevas) && cuotasPagadas < cuotasTotales && !f.botas_devueltas;
    const proximaCuotaNum = cuotasPagadas + 1;
    const cuotaBotasMonto = tieneCuotaBotasActiva ? Number((7.5 * tasaReferencialBs).toFixed(2)) : 0;
    const cuotaBotasDetalle = tieneCuotaBotasActiva
      ? `Cuota ${proximaCuotaNum}/${cuotasTotales} ($7.5 x ${tasaReferencialBs})`
      : cuotasPagadas >= cuotasTotales && f.botas_nuevas
      ? 'PAGADAS (4/4)'
      : 'N/A';

    const faltasMonto = f.faltas * descuentoPorFalta;
    const descuentoMonto = Number(f.descuentoExtra || 0);
    const totalDeducciones =
      seguroSocialBase +
      paroForzosoBase +
      ahorroHabBase +
      descuentoMonto +
      fideicomisoBase +
      polizaApBase +
      cuotaBotasMonto +
      faltasMonto;

    const netoPagado = Math.max(0, totalDevengado - totalDeducciones);

    return {
      nombres: f.nombres || '',
      apellidos: f.apellidos || '',
      cedula: f.cedula || '',
      cargo: f.cargo || 'OFICIAL DE SEGURIDAD',
      fechaPago,
      periodoDesde,
      periodoHasta,
      diasLaboradosCount: f.diasLab,
      descansoNoLabCount: f.descansosNoLab,
      diasLaboradosBase: valorDia,
      diasLaboradosMonto: diasLabMonto,
      bonoNocturnoBase: bonoNocturnoPorNoche,
      bonoNocturnoCant: f.noches,
      bonoNocturnoMonto,
      doceavaHoraBase: doceavaHoraPorDia,
      doceavaHoraMonto,
      ropaTrabajo1Cant: f.diasLab > 0 ? 1 : 0,
      ropaTrabajo1Monto,
      ropaTintoreriaCant: f.diasLab > 0 ? 1 : 0,
      ropaTintoreriaMonto,
      jefeGrupoCant: jefeGrupoMonto > 0 ? 1 : 0,
      jefeGrupoMonto,
      descansoLabCant: f.domingosLab,
      descansoLabMonto,
      descansoNoLabCant: f.descansosNoLab,
      descansoNoLabMonto,
      dia31Cant: f.tieneDia31,
      dia31Monto,
      ropaTrabajo2Cant: f.diasLab > 0 ? 1 : 0,
      ropaTrabajo2Monto,
      alimentacionCant: f.diasLab,
      alimentacionMonto,
      otrosMonto,
      totalDevengado,
      seguroSocialBase,
      seguroSocialMonto: seguroSocialBase,
      paroForzosoBase,
      paroForzosoMonto: paroForzosoBase,
      ahorroHabitacionalBase: ahorroHabBase,
      ahorroHabitacionalMonto: ahorroHabBase,
      descuentoBase: descuentoMonto,
      descuentoMonto,
      fideicomisoBase,
      fideicomisoMonto: fideicomisoBase,
      polizaApBase,
      polizaApMonto: polizaApBase,
      cuotaBotasDetalle,
      cuotaBotasMonto,
      faltasBase: faltasMonto,
      faltasMonto,
      totalDeducciones,
      netoPagado,
    };
  };

  const marcarNominaPagadaYEmitirRecibos = async () => {
    if (filas.length === 0) return;

    const hayBotasPendientes = filas.some(
      (f) => f.botas_nuevas && Number(f.botas_cuotas_pagadas || 0) < 4 && !f.botas_devueltas
    );
    if (hayBotasPendientes && tasaReferencialBs <= 0) {
      alert('⚠️ Hay personal con cuotas de botas nuevas pendientes ($7.5). Ingrese la Tasa Referencial Empresa (Bs/$) antes de pagar la nómina.');
      return;
    }

    setProcesandoPago(true);
    try {
      const items = filas.map(calcularItemRecibo);
      const totalNetoQuincena = items.reduce((acc, it) => acc + it.netoPagado, 0);

      const { data: nominaInsertada } = await supabase
        .from('nominas_pagadas')
        .insert([
          {
            proyecto,
            anio,
            mes,
            quincena,
            fecha_pago: fechaPago,
            tasa_bcv: tasaReferencialBs,
            total_neto_bs: totalNetoQuincena,
            pagado_por: nombreUsuario,
          },
        ])
        .select()
        .single();

      if (nominaInsertada?.id) {
        const rowsRecibos = items.map((it) => ({
          nomina_id: nominaInsertada.id,
          proyecto,
          anio,
          mes,
          quincena,
          fecha_pago: fechaPago,
          cedula: it.cedula,
          nombre_completo: `${it.nombres} ${it.apellidos}`,
          cargo: it.cargo,
          neto_pagado: it.netoPagado,
          recibo_json: it,
        }));
        await supabase.from('recibos_nomina_emitidos').insert(rowsRecibos);
      }

      for (const f of filas) {
        const cuotasPrev = Number(f.botas_cuotas_pagadas || 0);
        const cuotasTot = Number(f.botas_cuotas_totales || 4);
        if (f.botas_nuevas && cuotasPrev < cuotasTot && !f.botas_devueltas) {
          const nuevaCuota = cuotasPrev + 1;
          const montoDescontado = Number((7.5 * tasaReferencialBs).toFixed(2));

          await supabase
            .from('plantilla_proyectos')
            .update({ botas_cuotas_pagadas: nuevaCuota })
            .eq('id', f.id);

          await supabase.from('historial_dotacion_oficial').insert([
            {
              cedula: f.cedula,
              nombre_completo: `${f.nombres} ${f.apellidos}`,
              proyecto,
              tipo_evento: 'DESCUENTO CUOTA BOTAS',
              detalle: `Cuota ${nuevaCuota}/${cuotasTot} ($7.5 a tasa ${tasaReferencialBs} Bs/$) en ${quincena} Quincena ${NOMBRES_MESES[mes - 1]} ${anio}`,
              monto_bs: montoDescontado,
              registrado_por: nombreUsuario,
            },
          ]);

          if (nuevaCuota >= cuotasTot) {
            await supabase.from('notificaciones').insert([
              {
                titulo: '🥾 Última Cuota de Botas Descontada (4/4)',
                mensaje: `El oficial ${f.nombres} ${f.apellidos} (C.I. ${f.cedula}) de ${proyecto} ha completado el pago total de sus botas nuevas (Cuota 4/4).`,
                tipo: 'DOTACION_BOTAS',
                roles_destino: ['analista', 'operaciones', 'rrhh', 'administrador'],
                leida: false,
              },
            ]);
          }
        }
      }

      setNominaPagada(true);
      setMensaje(
        `✅ Nómina de ${proyecto} (${quincena} Quincena ${NOMBRES_MESES[mes - 1]} ${anio}) marcada como PAGADA y archivada en Histórico. Emitiendo ${items.length} recibos PDF...`
      );
      await generarPDFRecibosNomina(`${proyecto}_${quincena}_${NOMBRES_MESES[mes - 1]}_${anio}`, items);
      await cargarDatosQuincena();
    } catch (err) {
      console.error('Error procesando pago de nómina:', err);
    } finally {
      setProcesandoPago(false);
    }
  };
