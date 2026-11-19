import jsPDF from 'jspdf';

export interface RegistroAsistenciaPDF {
  cedula: string;
  nombre_completo: string;
  grupo: string;
  turno: string;
  hora_entrada?: string | null;
  estatus: string;
  proyecto_apoyo?: string | null;
  observacion?: string | null;
  modificado_por?: string | null;
  modificado_at?: string | null;
  justificacion_modificacion?: string | null;
}

export interface AuditoriaModificacionPDF {
  cedula: string;
  nombre_completo: string;
  estatus_anterior: string;
  estatus_nuevo: string;
  justificacion: string;
  modificado_por: string;
  created_at: string;
}

export interface DatosInformeDiarioPDF {
  proyecto: string;
  fecha: string;
  registros: RegistroAsistenciaPDF[];
  movimientosDia: {
    tipo_movimiento: string;
    cedula: string;
    nombre_completo: string;
  }[];
  auditoriaModificaciones: AuditoriaModificacionPDF[];
}

const cargarLogoBase64 = (): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(null);
      img.src = '/logo-vip3000.jpg';
    } catch {
      resolve(null);
    }
  });
};
export async function generarPDFAsistenciaDiaria(
  datos: DatosInformeDiarioPDF,
  modo: 'DESCARGAR' | 'IMPRIMIR' = 'DESCARGAR'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const logoBase64 = await cargarLogoBase64();

  const dibujarEncabezado = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, 10, pageWidth - margin * 2, 24, 'F');

    if (logoBase64) {
      doc.addImage(logoBase64, 'JPEG', margin + 3, 12.5, 19, 19);
    }

    const xTexto = logoBase64 ? margin + 26 : margin + 5;
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`ASISTENCIA DE ${datos.proyecto.toUpperCase()}`, xTexto, 19.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`Fecha de Guardia: ${datos.fecha}   •   Seguridad VIP 3000 C.A.`, xTexto, 27);
  };

  const dibujarCabeceraTabla = (yPos: number) => {
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, yPos, pageWidth - margin * 2, 7.5, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('CÉDULA', margin + 2, yPos + 5);
    doc.text('NOMBRES Y APELLIDOS', margin + 28, yPos + 5);
    doc.text('GRP / TURNO', margin + 96, yPos + 5);
    doc.text('ENTRADA', margin + 123, yPos + 5);
    doc.text('ESTATUS / DETALLE', margin + 144, yPos + 5);
  };

  dibujarEncabezado();
  let y = 39;
  dibujarCabeceraTabla(y);
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (datos.registros.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('No se encontraron registros operativos para esta fecha y proyecto.', margin + 2, y + 4);
    y += 10;
  } else {
    datos.registros.forEach((reg, idx) => {
      if (y > pageHeight - 45) {
        doc.addPage();
        dibujarEncabezado();
        y = 39;
        dibujarCabeceraTabla(y);
        y += 9;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 3.5, pageWidth - margin * 2, 7, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(String(reg.cedula || '').slice(0, 14), margin + 2, y + 1);

      doc.setFont('helvetica', 'normal');
      doc.text(String(reg.nombre_completo || '').slice(0, 34), margin + 28, y + 1);

      doc.text(`G-${reg.grupo} / ${reg.turno}`, margin + 96, y + 1);
      doc.text(reg.hora_entrada || '--:--', margin + 123, y + 1);

      const etiquetaEstatus = reg.proyecto_apoyo
        ? `${reg.estatus} (${reg.proyecto_apoyo.slice(0, 14)})`
        : reg.estatus;

      if (reg.estatus === 'FALTA INJUSTIFICADA') {
        doc.setTextColor(185, 28, 28);
        doc.setFont('helvetica', 'bold');
      } else if (reg.estatus === 'PRESENTE') {
        doc.setTextColor(21, 128, 61);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
      }

      doc.text(etiquetaEstatus.slice(0, 26), margin + 144, y + 1);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 3.2, pageWidth - margin, y + 3.2);
      y += 7.2;
    });
  }
  // Calcular variables finales solicitadas
  const nuevosIngresos = datos.movimientosDia.filter((m) => m.tipo_movimiento === 'NUEVO INGRESO').length;
  const egresos = datos.movimientosDia.filter((m) => m.tipo_movimiento === 'EGRESO').length;

  const servEspPropio =
    datos.registros.filter((r) => r.estatus === 'SERVICIO ESPECIAL PROPIO').length +
    datos.movimientosDia.filter((m) => m.tipo_movimiento === 'SERVICIO ESPECIAL PROPIO').length;

  const servEspRecibido =
    datos.registros.filter((r) => r.estatus === 'SERVICIO ESPECIAL RECIBIDO').length +
    datos.movimientosDia.filter((m) => m.tipo_movimiento === 'SERVICIO ESPECIAL RECIBIDO').length;

  const servEspEfectivo = servEspPropio + servEspRecibido;

  const servEspEnviado =
    datos.registros.filter((r) => r.estatus === 'SERVICIO ESPECIAL ENVIADO').length +
    datos.movimientosDia.filter((m) => m.tipo_movimiento === 'SERVICIO ESPECIAL ENVIADO').length;

  const apoyosRecibidos = datos.registros.filter((r) => r.estatus === 'APOYO RECIBIDO').length;
  const apoyosEnviados = datos.registros.filter((r) => r.estatus === 'APOYO ENVIADO').length;
  const faltasDelDia = datos.registros.filter((r) => r.estatus === 'FALTA INJUSTIFICADA').length;

  if (y > pageHeight - 62) {
    doc.addPage();
    dibujarEncabezado();
    y = 40;
  } else {
    y += 4;
  }

  // Caja de Resumen de Variables al final
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, y, pageWidth - margin * 2, 34, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RESUMEN DE VARIABLES OPERATIVAS DEL DÍA', margin + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);

  const col1 = margin + 4;
  const col2 = margin + 68;
  const col3 = margin + 132;

  doc.text(`• Nuevos Ingresos: ${nuevosIngresos}`, col1, y + 13);
  doc.text(`• Servicio Especial Efectivo: ${servEspEfectivo}`, col1, y + 20);
  doc.text(`  (Propio: ${servEspPropio} | Recibido: ${servEspRecibido})`, col1, y + 26.5);

  doc.text(`• Apoyos Recibidos: ${apoyosRecibidos}`, col2, y + 13);
  doc.text(`• Servicio Especial Enviado: ${servEspEnviado}`, col2, y + 20);
  doc.text(`• Apoyos Enviados: ${apoyosEnviados}`, col2, y + 26.5);

  doc.setTextColor(185, 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.text(`• Faltas del Día: ${faltasDelDia}`, col3, y + 13);
  doc.setTextColor(15, 23, 42);
  doc.text(`• Egresos: ${egresos}`, col3, y + 20);

  y += 40;

  // Bitácora de Modificaciones realizadas por la Analista
  if (datos.auditoriaModificaciones.length > 0) {
    if (y > pageHeight - 35) {
      doc.addPage();
      dibujarEncabezado();
      y = 40;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);
    doc.text('BITÁCORA DE MODIFICACIONES REALIZADAS POR ANALISTA:', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    datos.auditoriaModificaciones.forEach((mod) => {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 20;
      }
      const horaMod = new Date(mod.created_at).toLocaleString('es-VE', {
        timeZone: 'America/Caracas',
      });
      const linea = `[${horaMod}] ${mod.modificado_por} modificó a ${mod.nombre_completo} (${mod.cedula}): ${mod.estatus_anterior} -> ${mod.estatus_nuevo}. Justificación: ${mod.justificacion}`;
      const lineasEnvueltas = doc.splitTextToSize(linea, pageWidth - margin * 2);
      doc.text(lineasEnvueltas, margin, y);
      y += lineasEnvueltas.length * 4 + 1.5;
    });
  }

  const nombreArchivo = `Asistencia_${datos.proyecto.replace(/\s+/g, '_')}_${datos.fecha}.pdf`;

  if (modo === 'IMPRIMIR') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(nombreArchivo);
  }
}
