import { jsPDF } from 'jspdf';

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

export interface DatosFiniquitoVacaciones {
  nombreCompleto: string;
  cedula: string;
  periodoAnio: string;
  fechaNotificacion: string;
  fechaSolicitud: string;
  fechaInicio: string;
  fechaFin: string;
  fechaReintegro: string;
  fechaIngreso: string;
  sueldoMensual: number;
  diasDisfruteBase: number;
  diasDisfruteAdicionales: number;
  diasBonoBase: number;
  diasBonoAdicionales: number;
  textoSabados: string;
  textoDomingos: string;
  cantidadFeriadosAdicionales: number;
  textoFeriadosAdicionales: string;
  montoVacaciones: number;
  montoBonoVacacional: number;
  montoFeriadosDescanso: number;
  totalPagar: number;
  gerenteRRHH?: string;
}

export const generarPDFFiniquitoVacaciones = async (d: DatosFiniquitoVacaciones) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const logo = await cargarLogoBase64();

  const cedulaLimpia = String(d.cedula || '')
    .replace(/^V-?\s*/i, '')
    .trim();

  // ================= HOJA 1: NOTIFICACIÓN Y LIQUIDACIÓN DE VACACIONES =================
  if (logo) {
    try {
      doc.addImage(logo, 'JPEG', 14, 12, 42, 24);
    } catch {}
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SEGURIDAD VIP3000, C.A.', 62, 21);
  doc.setFontSize(10);
  doc.text('RIF: J-29491549-3', 62, 27);

  let y = 44;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Sr. ${d.nombreCompleto.toUpperCase()}`, 14, y);
  y += 5.5;
  doc.text(`C.I V- ${cedulaLimpia}`, 14, y);
  y += 5.5;
  doc.text('Presente. -', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${d.fechaNotificacion}`, 162, y);

  y += 9;
  const parrafoNotif = `Por medio de la presente, se le notifica que las vacaciones correspondientes al año ${d.periodoAnio} quedan autorizadas por la empresa, las mismas serán disfrutadas en el siguiente periodo desde ${d.fechaInicio} hasta ${d.fechaFin} siendo la fecha de reintegro el día ${d.fechaReintegro}.`;
  const lineasNotif = doc.splitTextToSize(parrafoNotif, 188);
  doc.text(lineasNotif, 14, y);
  y += lineasNotif.length * 5 + 4;

  doc.setFont('helvetica', 'bold');
  doc.text(`Sueldo: ${fmtBs(d.sueldoMensual)}`, 14, y);
  y += 5.5;
  doc.text(`Fecha de Ingreso: ${d.fechaIngreso || ''}`, 14, y);
  y += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.text(`Cantidad de Días de Disfrute de Vacaciones: ${d.diasDisfruteBase}`, 14, y);
  y += 5.5;
  doc.text(`Cantidad de Días de Disfrute adicionales de Vacaciones: ${d.diasDisfruteAdicionales}`, 14, y);
  y += 5.5;
  doc.text(`Cantidad de días de Bono Vacacional que se cancelan: ${d.diasBonoBase}`, 14, y);
  y += 5.5;
  doc.text(`Cantidad de días de Bono Vacacional adicionales que se cancelan: ${d.diasBonoAdicionales}`, 14, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Feriados y días Descanso dentro del periodo vacacional:', 14, y);
  y += 5.5;
  doc.setFont('helvetica', 'normal');
  if (d.textoSabados) {
    doc.text(`Sábados ${d.textoSabados}`, 14, y);
    y += 5.2;
  }
  if (d.textoDomingos) {
    doc.text(`Domingos ${d.textoDomingos}`, 14, y);
    y += 5.2;
  }
  doc.text(`Feriados adicionales dentro del periodo vacacional: ${d.cantidadFeriadosAdicionales}`, 14, y);
  y += 5.2;
  if (d.textoFeriadosAdicionales) {
    doc.text(d.textoFeriadosAdicionales, 14, y);
    y += 6;
  }

  y += 2;
  const parrafoPago = `Se cancelan Bs. ${fmtBs(d.montoVacaciones)} por concepto de vacaciones y Bs. ${fmtBs(
    d.montoBonoVacacional
  )} Por concepto de Bono Vacacional, Feriados y días Descanso Bs ${fmtBs(
    d.montoFeriadosDescanso
  )} para un total de Bs. ${fmtBs(d.totalPagar)} cantidades que declara recibir conforme el trabajador.`;
  const lineasPago = doc.splitTextToSize(parrafoPago, 188);
  doc.setFont('helvetica', 'bold');
  doc.text(lineasPago, 14, y);
  y += lineasPago.length * 5 + 10;

  // Firma y dos recuadros de huellas del trabajador (Hoja 1)
  doc.setFont('helvetica', 'normal');
  doc.text('Nombre: ____________________', 14, y + 6);
  doc.text('Firma: ______________________', 14, y + 15);
  doc.text('Huellas:', 118, y + 4);
  doc.rect(136, y - 2, 20, 22);
  doc.rect(160, y - 2, 20, 22);

  y += 28;

  // Tabla institucional de 3 firmas con espacio superior para firmar
  doc.setDrawColor(30, 41, 59);
  doc.rect(14, y, 62, 18);
  doc.rect(76, y, 64, 18);
  doc.rect(140, y, 62, 18);
  doc.line(14, y + 11, 202, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Analista de RRHH', 45, y + 15.8, { align: 'center' });
  doc.text('Gte. De Proyecto', 108, y + 15.8, { align: 'center' });
  doc.text('Recursos Humanos', 171, y + 15.8, { align: 'center' });

  // ================= HOJA 2: CARTA DE SOLICITUD DEL TRABAJADOR =================
  doc.addPage();

  if (logo) {
    try {
      doc.addImage(logo, 'JPEG', 14, 12, 42, 24);
    } catch {}
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SEGURIDAD VIP3000, C.A.', 62, 21);
  doc.setFontSize(10);
  doc.text('RIF: J-29491549-3', 62, 27);

  let y2 = 48;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Sra. ${d.gerenteRRHH || 'Yenire Paredes'}.`, 14, y2);
  doc.setFont('helvetica', 'normal');
  doc.text(`Caracas ${d.fechaSolicitud}`, 152, y2);
  y2 += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Gerencia de Recursos Humanos.', 14, y2);
  y2 += 6;
  doc.text('Presente.-', 14, y2);
  y2 += 12;

  doc.setFont('helvetica', 'normal');
  const parrafoSol = `Yo: ${d.nombreCompleto.toUpperCase()}, C.I ${cedulaLimpia}, solicito a la sociedad Mercantil Seguridad Vip 3000, C.A. El disfrute y pago de mis vacaciones correspondiente al año ${
    d.periodoAnio
  }, en el siguiente periodo desde ${d.fechaInicio} hasta ${
    d.fechaFin
  }, esperando que mi solicitud sea aprobada por su representada.`;
  const lineasSol = doc.splitTextToSize(parrafoSol, 188);
  doc.text(lineasSol, 14, y2);
  y2 += lineasSol.length * 5.5 + 16;

  doc.text('Nombre: ____________________', 14, y2 + 6);
  doc.text('Firma: ______________________', 14, y2 + 15);
  doc.text('Huellas:', 118, y2 + 4);
  doc.rect(136, y2 - 2, 20, 22);
  doc.rect(160, y2 - 2, 20, 22);

  doc.save(`Finiquito_Vacaciones_${cedulaLimpia}_${d.nombreCompleto.replace(/\s+/g, '_')}.pdf`);
};

export interface DatosReciboLiquidacionLOTTT {
  nombresApellidos: string;
  cedula: string;
  fechaIngreso: string;
  fechaEgreso: string;
  tiempoServiciosTexto: string;
  motivo: string;
  cargo: string;
  salarioMensual: number;
  salarioDiario: number;
  salarioOrdinarioDiario: number;
  salarioIntegralDiario: number;
  montoGarantiaPrestaciones: number;
  montoInteresesPrestaciones: number;
  diasVacaciones: number;
  montoVacaciones: number;
  diasBonoVacacional: number;
  montoBonoVacacional: number;
  diasUtilidades: number;
  montoUtilidades: number;
  montoPagoPendiente: number;
  montoDeduccionesBotas: number;
  detalleDeduccionesBotas: string;
  otrasDeducciones: number;
  totalPagar: number;
}

export const generarPDFReciboLiquidacionLOTTT = async (d: DatosReciboLiquidacionLOTTT) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const logo = await cargarLogoBase64();

  // Encabezado con Logo Seguridad VIP 3000 C.A.
  if (logo) {
    try {
      doc.addImage(logo, 'JPEG', 14, 10, 34, 20);
    } catch {}
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SEGURIDAD VIP 3000, C.A.', 54, 17);
  doc.setFontSize(9.5);
  doc.text('RIF: J-29491549-3', 54, 23);

  doc.setFillColor(15, 23, 42);
  doc.rect(14, 34, 188, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('RECIBO DE LIQUIDACIÓN DE PRESTACIONES SOCIALES', 108, 39.5, { align: 'center' });

  let y = 48;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.2);

  const dibujarFilaDato = (etiqueta: string, valor: string, xPos = 14) => {
    doc.setFont('helvetica', 'bold');
    doc.text(etiqueta, xPos, y);
    doc.setFont('helvetica', 'normal');
    doc.text(valor, xPos + 44, y);
  };

  dibujarFilaDato('Nombres y apellidos:', d.nombresApellidos.toUpperCase());
  y += 5.5;
  dibujarFilaDato('Cédula de Identidad:', d.cedula);
  dibujarFilaDato('Cargo:', d.cargo.toUpperCase(), 110);
  y += 5.5;
  dibujarFilaDato('Fecha de Ingreso:', d.fechaIngreso);
  dibujarFilaDato('Fecha de Egreso:', d.fechaEgreso, 110);
  y += 5.5;
  dibujarFilaDato('Tiempo de Servicios:', d.tiempoServiciosTexto);
  dibujarFilaDato('Motivo:', d.motivo, 110);
  y += 7;

  // Bloque de Salarios Base LOTTT
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 4, 188, 15, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y - 4, 188, 15);

  doc.setFont('helvetica', 'bold');
  doc.text(`Salario Mensual: Bs. ${fmtBs(d.salarioMensual)}`, 18, y + 1);
  doc.text(`Salario Diario: Bs. ${fmtBs(d.salarioDiario)}`, 110, y + 1);
  y += 6;
  doc.text(`Salario Ordinario Diario: Bs. ${fmtBs(d.salarioOrdinarioDiario)}`, 18, y + 1);
  doc.text(`Salario Integral Diario: Bs. ${fmtBs(d.salarioIntegralDiario)}`, 110, y + 1);
  y += 10;

  // Tabla de Conceptos
  doc.setFillColor(30, 58, 138);
  doc.rect(14, y, 188, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Conceptos', 18, y + 4.8);
  doc.text('Días', 132, y + 4.8, { align: 'right' });
  doc.text('Salario', 164, y + 4.8, { align: 'right' });
  doc.text('Monto (Bs)', 199, y + 4.8, { align: 'right' });
  y += 7;

  const conceptos: [string, string, string, string][] = [
    [
      'Garantía de Prestaciones Sociales Art. 142 LOTTT',
      '-',
      fmtBs(d.salarioIntegralDiario),
      fmtBs(d.montoGarantiaPrestaciones),
    ],
    ['Intereses de Prestaciones Sociales', '-', '-', fmtBs(d.montoInteresesPrestaciones)],
    ['Vacaciones Fraccionadas / Vencidas', String(d.diasVacaciones), fmtBs(d.salarioDiario), fmtBs(d.montoVacaciones)],
    ['Bono Vacacional Fraccionado / Vencido', String(d.diasBonoVacacional), fmtBs(d.salarioDiario), fmtBs(d.montoBonoVacacional)],
    ['Utilidades Fraccionadas', String(d.diasUtilidades), fmtBs(d.salarioDiario), fmtBs(d.montoUtilidades)],
    ['Pago Pendiente / Días Laborados', '-', '-', fmtBs(d.montoPagoPendiente)],
  ];

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  conceptos.forEach(([conc, dias, sal, monto]) => {
    doc.rect(14, y, 188, 6.5);
    doc.text(conc, 18, y + 4.5);
    doc.text(dias, 132, y + 4.5, { align: 'right' });
    doc.text(sal, 164, y + 4.5, { align: 'right' });
    doc.text(monto, 199, y + 4.5, { align: 'right' });
    y += 6.5;
  });

  if (d.montoDeduccionesBotas > 0) {
    doc.setTextColor(153, 27, 27);
    doc.rect(14, y, 188, 6.5);
    doc.text(`Deducción Dotación: ${d.detalleDeduccionesBotas}`, 18, y + 4.5);
    doc.text(`-${fmtBs(d.montoDeduccionesBotas)}`, 199, y + 4.5, { align: 'right' });
    y += 6.5;
  }

  if (d.otrasDeducciones > 0) {
    doc.setTextColor(153, 27, 27);
    doc.rect(14, y, 188, 6.5);
    doc.text('Otras Deducciones / Adelantos', 18, y + 4.5);
    doc.text(`-${fmtBs(d.otrasDeducciones)}`, 199, y + 4.5, { align: 'right' });
    y += 6.5;
  }

  // Fila Total a Pagar
  doc.setFillColor(220, 252, 231);
  doc.rect(14, y, 188, 8, 'F');
  doc.rect(14, y, 188, 8);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Total a Pagar:', 18, y + 5.5);
  doc.text(`Bs. ${fmtBs(d.totalPagar)}`, 199, y + 5.5, { align: 'right' });
  y += 14;

  // Cláusula Legal de Finiquito LOTTT
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const textoFiniquito = `Por medio de este recibo, Yo ${d.nombresApellidos.toUpperCase()}, Venezolano mayor de edad, portador de la Cédula de identidad ${
    d.cedula
  }, dejo constancia de que recibí conforme todos los conceptos inherentes al pago y cancelación de mis Prestaciones Sociales y demás conceptos laborales, correspondiente a la relación de trabajo que sostenía con la empresa Seguridad VIP 3000, C.A., el cual se extinguió por ${d.motivo.toLowerCase()}.`;
  const lineasFin = doc.splitTextToSize(textoFiniquito, 188);
  doc.text(lineasFin, 14, y);
  y += lineasFin.length * 4.6 + 10;

  // Bloque inferior de Firma, Huella y Revisado por
  doc.setFontSize(9);
  doc.text('Firma de recibido conforme: ________________________', 14, y);
  doc.text('Huella:', 112, y - 3);
  doc.rect(125, y - 7, 18, 20);
  doc.text('Revisado por: ______________________', 148, y);
  y += 8;
  doc.text(`Cédula de Identidad: ${d.cedula}`, 14, y);
  y += 8;
  doc.text('Fecha de recibido: ________________________', 14, y);

  doc.save(`Recibo_Liquidacion_LOTTT_${d.cedula}_${d.nombresApellidos.replace(/\s+/g, '_')}.pdf`);
};
