import { jsPDF } from 'jspdf';

export interface RegistroAsistenciaPDF {
  cedula: string;
  cargo?: string;
  nombre_completo: string;
  grupo: string;
  turno?: string;
  hora_entrada?: string;
  estatus: string;
  proyecto?: string;
  proyecto_apoyo?: string | null;
  observacion?: string | null;
  modificado_por?: string | null;
  justificacion_modificacion?: string | null;
  created_at?: string;
}

export interface MovimientoDiaPDF {
  proyecto?: string;
  tipo_movimiento: string;
  cedula: string;
  nombre_completo: string;
  proyecto_relacionado?: string | null;
  observacion?: string | null;
}

export interface AuditoriaModificacionPDF {
  proyecto?: string;
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
  movimientosDia: MovimientoDiaPDF[];
  auditoriaModificaciones: AuditoriaModificacionPDF[];
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
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/logo-vip.jpg';
  });
};

export const ordenarRegistrosAsistencia = <T extends RegistroAsistenciaPDF>(lista: T[]): T[] => {
  const obtenerPrioridad = (estatus: string): number => {
    const est = String(estatus || '').toUpperCase();
    if (est === 'PRESENTE') return 1;
    if (est === 'APOYO RECIBIDO') return 2;
    if (
      [
        'SERVICIO ESPECIAL PROPIO',
        'SERVICIO ESPECIAL MIXTO',
        'SERVICIO ESPECIAL DIURNO/NOCTURNO',
        'SERVICIO ESPECIAL RECIBIDO',
      ].includes(est)
    ) {
      return 3;
    }
    return 4;
  };

  return [...lista].sort((a, b) => {
    const prioA = obtenerPrioridad(a.estatus);
    const prioB = obtenerPrioridad(b.estatus);
    if (prioA !== prioB) return prioA - prioB;

    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tA - tB;
  });
};
function dibujarBloqueVariablesYMotivos(
  doc: jsPDF,
  datos: DatosInformeDiarioPDF,
  yInicial: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  dibujarEncabezado: () => void
) {
  let y = yInicial + 6;
  const asegurarEspacio = (altoNecesario: number) => {
    if (y + altoNecesario > pageHeight - 15) {
      doc.addPage();
      dibujarEncabezado();
      y = 40;
    }
  };

  const bajasDelDia = datos.movimientosDia.filter((m) =>
    ['EGRESO', 'TRASLADO ENVIADO', 'APOYO ENVIADO', 'SERVICIO ESPECIAL ENVIADO'].includes(
      m.tipo_movimiento
    )
  );
  const ingresosDelDia = datos.movimientosDia.filter((m) =>
    ['NUEVO INGRESO', 'TRASLADO RECIBIDO', 'SERVICIO ESPECIAL RECIBIDO', 'APOYO RECIBIDO'].includes(
      m.tipo_movimiento
    )
  );
  const faltasReposVac = datos.registros.filter((r) =>
    [
      'FALTA INJUSTIFICADA',
      'FALTA JUSTIFICADA',
      'REPOSO MEDICO',
      'BAJA POR SALUD',
      'VACACIONES',
      'PERMISO',
      'DESCANSO',
    ].includes(r.estatus)
  );

  asegurarEspacio(26);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('RESUMEN DE VARIABLES, NOVEDADES Y JUSTIFICACIONES DEL DÍA', margin + 2, y + 4.8);
  y += 10;

  doc.setFontSize(7.8);

  if (bajasDelDia.length > 0) {
    asegurarEspacio(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text(`• Egresos / Traslados / Apoyos Enviados (${bajasDelDia.length}):`, margin + 2, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    bajasDelDia.forEach((b) => {
      asegurarEspacio(6);
      const linea = `   - [${b.tipo_movimiento}] ${b.nombre_completo} (${b.cedula})${
        b.proyecto_relacionado ? ` -> ${b.proyecto_relacionado}` : ''
      }${b.observacion ? ` | Motivo: ${b.observacion}` : ''}`;
      const partidas = doc.splitTextToSize(linea, pageWidth - margin * 2 - 4);
      doc.text(partidas, margin + 2, y);
      y += partidas.length * 4.2;
    });
    y += 2;
  }

  if (ingresosDelDia.length > 0) {
    asegurarEspacio(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(`• Ingresos / Traslados / Apoyos Recibidos (${ingresosDelDia.length}):`, margin + 2, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    ingresosDelDia.forEach((ing) => {
      asegurarEspacio(6);
      const linea = `   - [${ing.tipo_movimiento}] ${ing.nombre_completo} (${ing.cedula})${
        ing.proyecto_relacionado ? ` <- ${ing.proyecto_relacionado}` : ''
      }${ing.observacion ? ` | Obs: ${ing.observacion}` : ''}`;
      const partidas = doc.splitTextToSize(linea, pageWidth - margin * 2 - 4);
      doc.text(partidas, margin + 2, y);
      y += partidas.length * 4.2;
    });
    y += 2;
  }

  if (faltasReposVac.length > 0) {
    asegurarEspacio(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(
      `• Faltas / Salud / Vacaciones / Permisos (${faltasReposVac.length}):`,
      margin + 2,
      y
    );
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    faltasReposVac.forEach((f) => {
      asegurarEspacio(6);
      const linea = `   - [${f.estatus}] ${f.nombre_completo} (${f.cedula})${
        f.observacion ? ` | Motivo: ${f.observacion}` : ''
      }`;
      const partidas = doc.splitTextToSize(linea, pageWidth - margin * 2 - 4);
      doc.text(partidas, margin + 2, y);
      y += partidas.length * 4.2;
    });
    y += 2;
  }

  if (datos.auditoriaModificaciones.length > 0) {
    asegurarEspacio(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(
      `• Modificaciones Auditadas en Sistema (${datos.auditoriaModificaciones.length}):`,
      margin + 2,
      y
    );
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    datos.auditoriaModificaciones.forEach((aud) => {
      asegurarEspacio(6);
      const linea = `   - ${aud.nombre_completo} (${aud.cedula}): ${aud.estatus_anterior} -> ${aud.estatus_nuevo} | Justificación: ${aud.justificacion} (Por: ${aud.modificado_por})`;
      const partidas = doc.splitTextToSize(linea, pageWidth - margin * 2 - 4);
      doc.text(partidas, margin + 2, y);
      y += partidas.length * 4.2;
    });
  }
}
export async function generarPDFAsistenciaDiaria(
  datos: DatosInformeDiarioPDF,
  modo: 'DESCARGAR' | 'IMPRIMIR' = 'DESCARGAR'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const logoBase64 = await cargarLogoBase64();
  const registrosOrdenados = ordenarRegistrosAsistencia(datos.registros);

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
    doc.setFontSize(7.6);

    doc.text('CÉDULA', margin + 2, yPos + 5);
    doc.text('CARGO', margin + 25, yPos + 5);
    doc.text('NOMBRES Y APELLIDOS', margin + 49, yPos + 5);
    doc.text('HORARIO / GRP', margin + 104, yPos + 5);
    doc.text('ENTRADA', margin + 131, yPos + 5);
    doc.text('ESTATUS / DETALLE', margin + 149, yPos + 5);
  };

  dibujarEncabezado();
  let y = 39;
  dibujarCabeceraTabla(y);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);

  if (registrosOrdenados.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('No se encontraron registros de guardia para esta fecha y proyecto.', margin + 2, y + 4);
    y += 10;
  } else {
    registrosOrdenados.forEach((reg, idx) => {
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
      doc.text(String(reg.cedula || '').slice(0, 13), margin + 2, y + 1);

      doc.setFont('helvetica', 'normal');
      doc.text(String(reg.cargo || 'OFICIAL').slice(0, 13), margin + 25, y + 1);
      doc.text(String(reg.nombre_completo || '').slice(0, 29), margin + 49, y + 1);

      const trnNorm = String(reg.turno || 'MIXTO').toUpperCase();
      const etiqHorario =
        trnNorm === 'DIURNO' || trnNorm === 'NOCTURNO'
          ? trnNorm
          : `${trnNorm}-G${reg.grupo}`;
      doc.text(etiqHorario, margin + 104, y + 1);
      doc.text(reg.hora_entrada || '--:--', margin + 131, y + 1);

      const etiquetaEstatus = reg.proyecto_apoyo
        ? `${reg.estatus} (${reg.proyecto_apoyo.slice(0, 11)})`
        : reg.estatus;

      if (reg.estatus === 'FALTA INJUSTIFICADA' || reg.estatus === 'BAJA POR SALUD') {
        doc.setTextColor(185, 28, 28);
        doc.setFont('helvetica', 'bold');
      } else if (
        [
          'PRESENTE',
          'SERVICIO ESPECIAL PROPIO',
          'SERVICIO ESPECIAL MIXTO',
          'SERVICIO ESPECIAL DIURNO/NOCTURNO',
          'SERVICIO ESPECIAL RECIBIDO',
          'APOYO RECIBIDO',
        ].includes(reg.estatus)
      ) {
        doc.setTextColor(21, 128, 61);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
      }

      doc.text(etiquetaEstatus.slice(0, 24), margin + 149, y + 1);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 3.2, pageWidth - margin, y + 3.2);
      y += 7.2;
    });
  }

  dibujarBloqueVariablesYMotivos(doc, datos, y, margin, pageWidth, pageHeight, dibujarEncabezado);

  const nombreArchivo = `Asistencia_${datos.proyecto.replace(/\s+/g, '_')}_${datos.fecha}.pdf`;

  if (modo === 'IMPRIMIR') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(nombreArchivo);
  }
}
export async function generarPDFInformeDiarioDirectiva(datos: DatosInformeDiarioPDF) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const logoBase64 = await cargarLogoBase64();

  const dibujarEncabezado = () => {
    doc.setFillColor(127, 29, 29);
    doc.rect(margin, 10, pageWidth - margin * 2, 24, 'F');

    if (logoBase64) {
      doc.addImage(logoBase64, 'JPEG', margin + 3, 12.5, 19, 19);
    }

    const xTexto = logoBase64 ? margin + 26 : margin + 5;
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`INFORME DIARIO DE OPERACIONES — ${datos.proyecto.toUpperCase()}`, xTexto, 19.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(254, 202, 202);
    doc.text(`Fecha: ${datos.fecha}   •   Uso Exclusivo Directiva — Seguridad VIP 3000 C.A.`, xTexto, 27);
  };

  dibujarEncabezado();
  let y = 40;

  const proyectosUnicos = Array.from(
    new Set(datos.registros.map((r) => r.proyecto || datos.proyecto).filter(Boolean))
  ).sort();

  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 7.5, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  doc.text('PROYECTO / SERVICIO', margin + 2, y + 5);
  doc.text('PRES.', margin + 88, y + 5);
  doc.text('S. ESP.', margin + 106, y + 5);
  doc.text('APOYOS', margin + 124, y + 5);
  doc.text('FALTAS', margin + 144, y + 5);
  doc.text('B. SALUD', margin + 164, y + 5);
  y += 9.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  proyectosUnicos.forEach((proy, idx) => {
    if (y > pageHeight - 55) {
      doc.addPage();
      dibujarEncabezado();
      y = 40;
    }

    const regsProy = datos.registros.filter((r) => (r.proyecto || datos.proyecto) === proy);
    const pres = regsProy.filter((r) => r.estatus === 'PRESENTE').length;
    const sesp = regsProy.filter((r) =>
      [
        'SERVICIO ESPECIAL PROPIO',
        'SERVICIO ESPECIAL MIXTO',
        'SERVICIO ESPECIAL DIURNO/NOCTURNO',
        'SERVICIO ESPECIAL RECIBIDO',
      ].includes(r.estatus)
    ).length;
    const apoy = regsProy.filter((r) => ['APOYO RECIBIDO', 'APOYO ENVIADO'].includes(r.estatus)).length;
    const falt = regsProy.filter((r) => r.estatus === 'FALTA INJUSTIFICADA').length;
    const bsal = regsProy.filter((r) => r.estatus === 'BAJA POR SALUD').length;

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 3.5, pageWidth - margin * 2, 7, 'F');
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(proy.slice(0, 42), margin + 2, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.text(String(pres), margin + 91, y + 1);
    doc.text(String(sesp), margin + 109, y + 1);
    doc.text(String(apoy), margin + 127, y + 1);
    doc.text(String(falt), margin + 147, y + 1);
    doc.text(String(bsal), margin + 168, y + 1);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 3.2, pageWidth - margin, y + 3.2);
    y += 7.2;
  });

  dibujarBloqueVariablesYMotivos(doc, datos, y, margin, pageWidth, pageHeight, dibujarEncabezado);

  doc.save(`Informe_Diario_Directiva_${datos.fecha}.pdf`);
}
