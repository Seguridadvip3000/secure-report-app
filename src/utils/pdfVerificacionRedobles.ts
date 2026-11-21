import { jsPDF } from 'jspdf';

export interface RegistroRedoblePDF {
  fecha: string;
  cedula: string;
  nombre_completo: string;
  turno: string;
  proyecto: string;
  proyecto_origen?: string;
  verificado_se: boolean;
  verificado_se_por?: string | null;
  verificado_se_fecha?: string | null;
  verificado_se_hora?: string | null;
  verificado_se_observacion?: string | null;
}

export interface DatosPDFRedobles {
  proyecto: string;
  fechaDesde: string;
  fechaHasta: string;
  registros: RegistroRedoblePDF[];
}

const cargarLogoBase64 = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/logo-vip3000.jpg';
  });
};

const normalizarHorario = (turnoRaw: string): 'MIXTO' | 'DIURNO' | 'NOCTURNO' => {
  const t = String(turnoRaw || 'MIXTO').toUpperCase();
  if (t === 'DIURNO') return 'DIURNO';
  if (t === 'NOCTURNO') return 'NOCTURNO';
  return 'MIXTO';
};
export async function generarPDFVerificacionRedobles(
  datos: DatosPDFRedobles,
  modo: 'DESCARGAR' | 'IMPRIMIR' = 'DESCARGAR'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  const logoBase64 = await cargarLogoBase64();

  const totalMixtos = datos.registros.filter((r) => normalizarHorario(r.turno) === 'MIXTO').length;
  const totalDiurnos = datos.registros.filter((r) => normalizarHorario(r.turno) === 'DIURNO').length;
  const totalNocturnos = datos.registros.filter((r) => normalizarHorario(r.turno) === 'NOCTURNO').length;
  const totalGeneral = datos.registros.length;

  const dibujarEncabezado = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, 9, pageWidth - margin * 2, 23, 'F');

    if (logoBase64) {
      doc.addImage(logoBase64, 'JPEG', margin + 3, 11.5, 18, 18);
    }

    const xTexto = logoBase64 ? margin + 25 : margin + 5;
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(
      `VERIFICACIÓN DE REDOBLES — ${datos.proyecto.toUpperCase()}`,
      xTexto,
      18
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(147, 197, 253);
    doc.text(
      `REDOBLES EFECTUADOS DESDE: ${datos.fechaDesde}   HASTA: ${datos.fechaHasta}   •   Seguridad VIP 3000 C.A.`,
      xTexto,
      25.5
    );
  };

  const dibujarCabeceraTabla = (yPos: number) => {
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, yPos, pageWidth - margin * 2, 7.5, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);

    doc.text('FECHA', margin + 2, yPos + 5);
    doc.text('CÉDULA', margin + 22, yPos + 5);
    doc.text('NOMBRES Y APELLIDOS', margin + 43, yPos + 5);
    doc.text('HORARIO', margin + 93, yPos + 5);
    doc.text('PROYECTO ORIGEN', margin + 112, yPos + 5);
    doc.text('PROYECTO EFECTIVO', margin + 150, yPos + 5);
    doc.text('ESTATUS / VALIDACIÓN', margin + 188, yPos + 5);
  };

  dibujarEncabezado();
  let y = 36;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageWidth - margin * 2, 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL REDOBLES MIXTOS: ${totalMixtos}`, margin + 4, y + 6.5);
  doc.text(`TOTAL REDOBLES DIURNOS: ${totalDiurnos}`, margin + 72, y + 6.5);
  doc.text(`TOTAL REDOBLES NOCTURNOS: ${totalNocturnos}`, margin + 142, y + 6.5);
  doc.setTextColor(21, 128, 61);
  doc.text(`TOTAL GENERAL: ${totalGeneral}`, margin + 216, y + 6.5);

  y += 14;
  dibujarCabeceraTabla(y);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);

  if (datos.registros.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('No se encontraron redobles / servicios especiales en el rango seleccionado.', margin + 2, y + 4);
  } else {
    datos.registros.forEach((reg, idx) => {
      if (y > pageHeight - 16) {
        doc.addPage();
        dibujarEncabezado();
        y = 36;
        dibujarCabeceraTabla(y);
        y += 9;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 3.5, pageWidth - margin * 2, 7.2, 'F');
      }

      const horario = normalizarHorario(reg.turno);
      const origen = reg.proyecto_origen || reg.proyecto;

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(String(reg.fecha || ''), margin + 2, y + 1);
      doc.setFont('helvetica', 'bold');
      doc.text(String(reg.cedula || '').slice(0, 12), margin + 22, y + 1);
      doc.setFont('helvetica', 'normal');
      doc.text(String(reg.nombre_completo || '').slice(0, 25), margin + 43, y + 1);
      doc.setFont('helvetica', 'bold');
      doc.text(horario, margin + 93, y + 1);
      doc.setFont('helvetica', 'normal');
      doc.text(String(origen || '').slice(0, 19), margin + 112, y + 1);
      doc.text(String(reg.proyecto || '').slice(0, 19), margin + 150, y + 1);

      if (reg.verificado_se) {
        doc.setTextColor(21, 128, 61);
        doc.setFont('helvetica', 'bold');
        const textoVal = `VERIFICADO (${reg.verificado_se_fecha || reg.fecha} ${reg.verificado_se_hora || ''}) • ${
          reg.verificado_se_por || ''
        }`;
        const anchoMaxCol = pageWidth - margin - (margin + 188) - 2;
        const lineaAjustada = doc.splitTextToSize(textoVal, anchoMaxCol).at(0) || textoVal;
        doc.text(lineaAjustada, margin + 188, y + 1);
      } else {
        doc.setTextColor(185, 28, 28);
        doc.setFont('helvetica', 'bold');
        doc.text('PENDIENTE POR VERIFICAR', margin + 188, y + 1);
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 3.4, pageWidth - margin, y + 3.4);
      y += 7.4;
    });
  }

  const nombreArchivo = `Verificacion_Redobles_${datos.proyecto.replace(/\s+/g, '_')}_${datos.fechaDesde}_al_${datos.fechaHasta}.pdf`;

  if (modo === 'IMPRIMIR') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(nombreArchivo);
  }
}
