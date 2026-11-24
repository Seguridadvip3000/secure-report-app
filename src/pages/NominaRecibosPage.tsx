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
  const fmtBs = (n: number) =>
    Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const recibosFiltrados = historicoRecibos.filter((r) => {
    const q = busquedaHistorico.toLowerCase().trim();
    if (!q) return true;
    return `${r.cedula} ${r.nombre_completo} ${r.proyecto}`.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-emerald-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Nómina Quincenal, Cuotas de Dotación y Recibos
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <Receipt className="text-emerald-600" size={26} /> Portada de Nómina y Recibos de Pago
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Descuenta automáticamente cuotas de botas nuevas ($7.5 x Tasa Empresa), archiva cada quincena pagada y emite los recibos oficiales con logo corporativo.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPestana('GENERAR')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
              pestana === 'GENERAR' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Liquidar Quincena
          </button>
          <button
            type="button"
            onClick={() => setPestana('HISTORICO')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              pestana === 'HISTORICO' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <History size={15} /> Archivo Histórico
          </button>
        </div>
      </div>

      {pestana === 'HISTORICO' ? (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-800">
              Archivo Histórico de Recibos Pagados ({recibosFiltrados.length})
            </h2>
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={busquedaHistorico}
                onChange={(e) => setBusquedaHistorico(e.target.value)}
                placeholder="Buscar por cédula, nombre o proyecto..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {cargando ? (
            <p className="text-center text-slate-500 py-8 text-sm">Cargando archivo histórico...</p>
          ) : recibosFiltrados.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">No hay recibos pagados registrados aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b">
                    <th className="p-2.5">Fecha Pago</th>
                    <th className="p-2.5">Período</th>
                    <th className="p-2.5">Proyecto</th>
                    <th className="p-2.5">Trabajador</th>
                    <th className="p-2.5 text-right">Neto Pagado (Bs)</th>
                    <th className="p-2.5 text-center">Reimprimir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recibosFiltrados.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono">{r.fecha_pago}</td>
                      <td className="p-2.5 font-bold">
                        {r.quincena} {NOMBRES_MESES[(r.mes || 1) - 1]} {r.anio}
                      </td>
                      <td className="p-2.5">{r.proyecto}</td>
                      <td className="p-2.5 font-bold">
                        {r.nombre_completo} <span className="font-mono text-slate-500">({r.cedula})</span>
                      </td>
                      <td className="p-2.5 text-right font-black text-emerald-700">{fmtBs(r.neto_pagado)}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            generarPDFRecibosNomina(`${r.cedula}_${r.quincena}_${r.anio}`, [r.recibo_json])
                          }
                          className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1"
                        >
                          <Printer size={12} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {mensaje && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold">
              {mensaje}
            </div>
          )}

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
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
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Quincena</label>
              <select
                value={quincena}
                onChange={(e) => setQuincena(e.target.value as '1ERA' | '2DA')}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="1ERA">1ERA QUINCENA (01-15)</option>
                <option value="2DA">2DA QUINCENA (16-Fin)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fecha de Pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-blue-800 uppercase mb-1">
                Tasa Empresa (Bs/$) *
              </label>
              <input
                type="number"
                step="0.01"
                value={tasaReferencialBs}
                onChange={(e) => setTasaReferencialBs(Number(e.target.value))}
                placeholder="Ej: 45.50"
                className="w-full border-2 border-blue-400 bg-blue-50/60 rounded-xl px-3 py-2 text-xs font-black text-blue-900"
              />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                <Calculator size={16} className="text-blue-600" /> Parámetros de Devengado y Deducciones (Bs)
              </h2>
              <button
                type="button"
                onClick={marcarNominaPagadaYEmitirRecibos}
                disabled={filas.length === 0 || cargando || procesandoPago}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <CheckCircle2 size={16} />
                {procesandoPago ? 'Procesando Pago...' : 'Marcar Nómina Pagada y Emitir Recibos'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Valor Día Lab.</label>
                <input type="number" step="0.01" value={valorDia} onChange={(e) => setValorDia(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Bono Nocturno/Noche</label>
                <input type="number" step="0.01" value={bonoNocturnoPorNoche} onChange={(e) => setBonoNocturnoPorNoche(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Doceava Hora/Día</label>
                <input type="number" step="0.01" value={doceavaHoraPorDia} onChange={(e) => setDoceavaHoraPorDia(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Ropa Trabajo I</label>
                <input type="number" step="0.01" value={ropaTrabajo1} onChange={(e) => setRopaTrabajo1(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Ropa Tintorería</label>
                <input type="number" step="0.01" value={ropaTintoreria} onChange={(e) => setRopaTintoreria(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Bono Jefe Grupo</label>
                <input type="number" step="0.01" value={bonoJefeGrupo} onChange={(e) => setBonoJefeGrupo(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Bono Líder Proyecto</label>
                <input type="number" step="0.01" value={bonoLiderProyecto} onChange={(e) => setBonoLiderProyecto(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Descanso/Fer. Lab.</label>
                <input type="number" step="0.01" value={valorDescansoLab} onChange={(e) => setValorDescansoLab(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Descanso/Fer. No Lab.</label>
                <input type="number" step="0.01" value={valorDescansoNoLab} onChange={(e) => setValorDescansoNoLab(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Día 31</label>
                <input type="number" step="0.01" value={valorDia31} onChange={(e) => setValorDia31(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Ropa Trabajo 2</label>
                <input type="number" step="0.01" value={ropaTrabajo2} onChange={(e) => setRopaTrabajo2(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Alimentación/Día</label>
                <input type="number" step="0.01" value={alimentacionDiaria} onChange={(e) => setAlimentacionDiaria(Number(e.target.value))} className="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-red-700 mb-1">Seguro Social (Ded.)</label>
                <input type="number" step="0.01" value={seguroSocialBase} onChange={(e) => setSeguroSocialBase(Number(e.target.value))} className="w-full border border-red-200 bg-red-50/40 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-red-700 mb-1">Paro Forzoso (Ded.)</label>
                <input type="number" step="0.01" value={paroForzosoBase} onChange={(e) => setParoForzosoBase(Number(e.target.value))} className="w-full border border-red-200 bg-red-50/40 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-red-700 mb-1">Ahorro Hab. (Ded.)</label>
                <input type="number" step="0.01" value={ahorroHabBase} onChange={(e) => setAhorroHabBase(Number(e.target.value))} className="w-full border border-red-200 bg-red-50/40 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-red-700 mb-1">Fideicomiso (Ded.)</label>
                <input type="number" step="0.01" value={fideicomisoBase} onChange={(e) => setFideicomisoBase(Number(e.target.value))} className="w-full border border-red-200 bg-red-50/40 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-red-700 mb-1">Póliza A.P. (Ded.)</label>
                <input type="number" step="0.01" value={polizaApBase} onChange={(e) => setPolizaApBase(Number(e.target.value))} className="w-full border border-red-200 bg-red-50/40 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold text-red-700 mb-1">Desc. por Falta</label>
                <input type="number" step="0.01" value={descuentoPorFalta} onChange={(e) => setDescuentoPorFalta(Number(e.target.value))} className="w-full border border-red-200 bg-red-50/40 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
            <h2 className="text-sm font-black text-slate-800 uppercase mb-3">
              Resumen de Nómina del Proyecto ({filas.length} trabajadores)
            </h2>

            {cargando ? (
              <p className="text-center text-slate-500 py-8 text-sm">Calculando días y devengados...</p>
            ) : filas.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">No hay personal activo en este proyecto.</p>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="p-2.5">Personal</th>
                    <th className="p-2.5">Cargo</th>
                    <th className="p-2.5 text-center">Días</th>
                    <th className="p-2.5 text-center">Cuota Botas</th>
                    <th className="p-2.5 text-center">Otros (Bs)</th>
                    <th className="p-2.5 text-center">Desc. Extra</th>
                    <th className="p-2.5 text-right">Devengado</th>
                    <th className="p-2.5 text-right">Deducciones</th>
                    <th className="p-2.5 text-right">Neto a Pagar</th>
                    <th className="p-2.5 text-center">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.map((f, idx) => {
                    const rec = calcularItemRecibo(f);
                    return (
                      <tr key={f.id || idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">
                          {f.nombres} {f.apellidos}
                          <div className="text-[11px] font-mono text-slate-500">C.I. {f.cedula}</div>
                        </td>
                        <td className="p-2.5 font-semibold text-teal-800">{f.cargo || 'OFICIAL'}</td>
                        <td className="p-2.5 text-center font-black">{f.diasLab}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[11px]">
                            {rec.cuotaBotasDetalle}
                          </span>
                          {rec.cuotaBotasMonto > 0 && (
                            <div className="text-[11px] text-red-700 font-bold">-{fmtBs(rec.cuotaBotasMonto)}</div>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={f.otrosExtra}
                            onChange={(e) => {
                              const copia = [...filas];
                              copia[idx] = { ...f, otrosExtra: Number(e.target.value) };
                              setFilas(copia);
                            }}
                            className="w-20 border border-slate-300 rounded px-1.5 py-1 text-right font-semibold"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={f.descuentoExtra}
                            onChange={(e) => {
                              const copia = [...filas];
                              copia[idx] = { ...f, descuentoExtra: Number(e.target.value) };
                              setFilas(copia);
                            }}
                            className="w-20 border border-slate-300 rounded px-1.5 py-1 text-right font-semibold"
                          />
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-800">{fmtBs(rec.totalDevengado)}</td>
                        <td className="p-2.5 text-right font-bold text-red-700">{fmtBs(rec.totalDeducciones)}</td>
                        <td className="p-2.5 text-right font-black text-emerald-700">{fmtBs(rec.netoPagado)}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => generarPDFRecibosNomina(`${f.cedula}_${f.apellidos}`, [rec])}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 cursor-pointer"
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
