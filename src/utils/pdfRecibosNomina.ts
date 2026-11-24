import { jsPDF } from 'jspdf';

export interface ItemReciboNomina {
  nombres: string;
  apellidos: string;
  cedula: string;
  cargo: string;
  fechaPago: string;
  periodoDesde: string;
  periodoHasta: string;
  diasLaboradosCount: number;
  descansoNoLabCount: number;

  diasLaboradosBase: number;
  diasLaboradosMonto: number;

  bonoNocturnoBase: number;
  bonoNocturnoCant: number;
  bonoNocturnoMonto: number;

  doceavaHoraBase: number;
  doceavaHoraMonto: number;

  ropaTrabajo1Cant: number;
  ropaTrabajo1Monto: number;

  ropaTintoreriaCant: number;
  ropaTintoreriaMonto: number;

  jefeGrupoCant: number;
  jefeGrupoMonto: number;

  descansoLabCant: number;
  descansoLabMonto: number;

  descansoNoLabCant: number;
  descansoNoLabMonto: number;

  dia31Cant: number;
  dia31Monto: number;

  ropaTrabajo2Cant: number;
  ropaTrabajo2Monto: number;

  alimentacionCant: number;
  alimentacionMonto: number;

  otrosMonto: number;
  totalDevengado: number;

  seguroSocialBase: number;
  seguroSocialMonto: number;

  paroForzosoBase: number;
  paroForzosoMonto: number;

  ahorroHabitacionalBase: number;
  ahorroHabitacionalMonto: number;

  descuentoBase: number;
  descuentoMonto: number;

  fideicomisoBase: number;
  fideicomisoMonto: number;

  polizaApBase: number;
  polizaApMonto: number;

  cuotaBotasDetalle?: string;
  cuotaBotasMonto: number;

  faltasBase: number;
  faltasMonto: number;

  totalDeducciones: number;
  netoPagado: number;
}

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

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export async function generarPDFRecibosNomina(
  proyecto: string,
  items: ItemReciboNomina[]
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const logoBase64 = await cargarLogoBase64();
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = pageWidth / 2;

  const dibujarReciboIndividual = (offsetX: number, item: ItemReciboNomina, etiquetaCopia: string) => {
    const margin = 8;
    const x0 = offsetX + margin;
    const w = halfWidth - margin * 2;
    let y = 10;

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.rect(x0 - 2, 7, w + 4, 200);

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'JPEG', x0, y - 1, 14, 14);
      } catch {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('SEGURIDAD VIP 3000 C.A.', x0 + 17, y + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('J-29491549-3', x0 + 17, y + 7);
    doc.text(etiquetaCopia, x0 + w, y + 3, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Fecha: ${item.fechaPago}`, x0 + w, y + 8, { align: 'right' });

    y += 16;

    doc.setFillColor(15, 23, 42);
    doc.rect(x0, y, w, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.text('RECIBO DE SUELDO', x0 + w / 2, y + 3.8, { align: 'center' });
    y += 8.5;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.3);
    const nombreCompleto = `${item.nombres} ${item.apellidos}`.trim().toUpperCase();

    doc.setFont('helvetica', 'bold');
    doc.text('NOMBRE:', x0, y);
    doc.setFont('helvetica', 'normal');
    doc.text(nombreCompleto, x0 + 22, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('CÉDULA DE IDENTIDAD:', x0, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(item.cedula), x0 + 36, y);

    doc.setFont('helvetica', 'bold');
    doc.text('CARGO:', x0 + 62, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(item.cargo || 'OFICIAL DE SEGURIDAD').toUpperCase(), x0 + 75, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('PERÍODO:', x0, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.periodoDesde}  al  ${item.periodoHasta}`, x0 + 22, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.text(
      `Días Laborados: ${item.diasLaboradosCount}  /  Descanso Feriados No Laborados: ${item.descansoNoLabCount}`,
      x0,
      y
    );
    y += 4.5;

    doc.setFillColor(226, 232, 240);
    doc.rect(x0, y, w, 4.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('DEVENGADO', x0 + 1.5, y + 3.2);
    doc.text('BASE', x0 + w - 42, y + 3.2, { align: 'right' });
    doc.text('CANT.', x0 + w - 25, y + 3.2, { align: 'right' });
    doc.text('MONTO (Bs)', x0 + w - 1.5, y + 3.2, { align: 'right' });
    y += 6.5;

    const filasDevengado: [string, string, string, string][] = [
      ['Días Laborados', fmt(item.diasLaboradosBase), '', fmt(item.diasLaboradosMonto)],
      ['Bono Nocturno', fmt(item.bonoNocturnoBase), String(item.bonoNocturnoCant), fmt(item.bonoNocturnoMonto)],
      ['Doceava Hora', fmt(item.doceavaHoraBase), '', fmt(item.doceavaHoraMonto)],
      ['Bono por Ropa de trabajo I', '', String(item.ropaTrabajo1Cant), fmt(item.ropaTrabajo1Monto)],
      ['Bono por Ropa Tintorería', '', String(item.ropaTintoreriaCant), fmt(item.ropaTintoreriaMonto)],
      ['JEFE DE GRUPO / LÍDER', '', String(item.jefeGrupoCant), fmt(item.jefeGrupoMonto)],
      ['DÍAS DE DESCANSO / FERIADOS LABORADOS', '', String(item.descansoLabCant), fmt(item.descansoLabMonto)],
      ['DESCANSO / FERIADOS NO LABORADOS', '', String(item.descansoNoLabCant), fmt(item.descansoNoLabMonto)],
      ['Día 31', '', String(item.dia31Cant), fmt(item.dia31Monto)],
      ['Bono por Ropa de trabajo 2', '', String(item.ropaTrabajo2Cant), fmt(item.ropaTrabajo2Monto)],
      ['Bono de Alimentación', '', String(item.alimentacionCant), fmt(item.alimentacionMonto)],
      ['OTROS', '', '', fmt(item.otrosMonto)],
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    filasDevengado.forEach(([concepto, base, cant, monto]) => {
      doc.text(concepto, x0 + 1, y);
      if (base) doc.text(base, x0 + w - 42, y, { align: 'right' });
      if (cant) doc.text(cant, x0 + w - 25, y, { align: 'right' });
      doc.text(monto, x0 + w - 1.5, y, { align: 'right' });
      y += 3.55;
    });

    doc.setDrawColor(100, 116, 139);
    doc.line(x0, y - 1.5, x0 + w, y - 1.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('TOTAL DEVENGADO', x0 + 1, y + 1.4);
    doc.text(fmt(item.totalDevengado), x0 + w - 1.5, y + 1.4, { align: 'right' });
    y += 5;

    doc.setFillColor(226, 232, 240);
    doc.rect(x0, y, w, 4.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('DEDUCCIONES', x0 + 1.5, y + 3.2);
    doc.text('BASE / DETALLE', x0 + w - 35, y + 3.2, { align: 'right' });
    doc.text('MONTO (Bs)', x0 + w - 1.5, y + 3.2, { align: 'right' });
    y += 6.5;

    const filasDeducciones: [string, string, string][] = [
      ['Seguro Social', fmt(item.seguroSocialBase), fmt(item.seguroSocialMonto)],
      ['Paro Forzoso', fmt(item.paroForzosoBase), fmt(item.paroForzosoMonto)],
      ['Ahorro Habitacional', fmt(item.ahorroHabitacionalBase), fmt(item.ahorroHabitacionalMonto)],
      ['DESCUENTO', fmt(item.descuentoBase), fmt(item.descuentoMonto)],
      ['Fideicomiso', fmt(item.fideicomisoBase), fmt(item.fideicomisoMonto)],
      ['PÓLIZA A.P.', fmt(item.polizaApBase), fmt(item.polizaApMonto)],
      ['Cuota Botas Nuevas ($7.5)', item.cuotaBotasDetalle || 'N/A', fmt(item.cuotaBotasMonto || 0)],
      ['Faltas', fmt(item.faltasBase), fmt(item.faltasMonto)],
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    filasDeducciones.forEach(([concepto, base, monto]) => {
      doc.text(concepto, x0 + 1, y);
      doc.text(base, x0 + w - 35, y, { align: 'right' });
      doc.text(monto, x0 + w - 1.5, y, { align: 'right' });
      y += 3.55;
    });

    doc.line(x0, y - 1.5, x0 + w, y - 1.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('TOTAL DEDUCCIONES', x0 + 1, y + 1.4);
    doc.text(fmt(item.totalDeducciones), x0 + w - 1.5, y + 1.4, { align: 'right' });
    y += 5.5;

    doc.setFillColor(220, 252, 231);
    doc.rect(x0, y - 2, w, 6.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.3);
    doc.setTextColor(22, 101, 52);
    doc.text('NETO PAGADO', x0 + 2, y + 2.2);
    doc.text(`Bs. ${fmt(item.netoPagado)}`, x0 + w - 2, y + 2.2, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    const yFirma = 198;
    doc.line(x0 + w / 2 - 25, yFirma, x0 + w / 2 + 25, yFirma);
    doc.text('Recibí Conforme', x0 + w / 2, yFirma + 3.8, { align: 'center' });
  };

  items.forEach((item, index) => {
    if (index > 0) doc.addPage();
    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(halfWidth, 5, halfWidth, 210);
    doc.setLineDashPattern([], 0);

    dibujarReciboIndividual(0, item, 'ORIGINAL — EMPRESA');
    dibujarReciboIndividual(halfWidth, item, 'COPIA — TRABAJADOR');
  });

  doc.save(`Recibos_Pago_${proyecto.replace(/\s+/g, '_')}.pdf`);
}
