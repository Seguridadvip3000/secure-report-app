import { jsPDF } from 'jspdf';
import { Report } from '../types';

interface ReporteData {
  titulo: string;       
  proyecto: string;     
  fecha: string;        
  descripcion: string;  
  quien_reporta: string;
  imagenes: string[];   
  coordenadas: { lat: number; lng: number };
}

// Banner real de Seguridad Vip 3000 en Base64 JPEG (Data URI completo)
const BANNER_VIP_BASE64 = 'data:image/jpeg;base64,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';

/**
 * Detecta el formato de imagen desde un Data URI o string Base64
 * Retorna 'JPEG' o 'PNG' según corresponda
 */
function detectImageFormat(imageData: string): 'JPEG' | 'PNG' {
  if (imageData.startsWith('data:image/png')) {
    return 'PNG';
  }
  if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
    return 'JPEG';
  }
  // Si no tiene prefijo Data URI, asumir JPEG por defecto
  return 'JPEG';
}

/**
 * Extrae solo el Base64 crudo de un Data URI
 * Si ya es Base64 crudo, lo retorna tal cual
 */
function extractBase64(imageData: string): string {
  if (imageData.startsWith('data:')) {
    const commaIndex = imageData.indexOf(',');
    if (commaIndex !== -1) {
      return imageData.substring(commaIndex + 1);
    }
  }
  return imageData;
}

export const generateOfficialPDF = async (reporte: ReporteData): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); 
  const marginX = 20;
  let currentY = 20;

  // ==========================================
  // RENDERIZADO DEL BANNER SUPERIOR
  // ==========================================
  try {
    const bannerWidth = pageWidth - (marginX * 2);
    const bannerHeight = bannerWidth / 4; // Proporción 4:1

    console.log('🎨 Inyectando banner real de Seguridad Vip 3000...');
    
    // Detectar formato automáticamente desde el Data URI
    const bannerFormat = detectImageFormat(BANNER_VIP_BASE64);
    // Extraer solo el Base64 crudo (sin prefijo data:image/...)
    const bannerRawBase64 = extractBase64(BANNER_VIP_BASE64);
    
    console.log(`📐 Formato detectado: ${bannerFormat}`);
    
    // Inyectar el banner usando Base64 crudo + formato detectado
    doc.addImage(bannerRawBase64, bannerFormat, marginX, currentY, bannerWidth, bannerHeight);
    
    currentY += bannerHeight + 15;
    console.log('✅ Banner renderizado exitosamente');
  } catch (error) {
    console.error('❌ Error renderizando banner:', error);
    // Fallback mejorado con rectángulo corporativo
    doc.setFillColor(30, 41, 59);
    doc.rect(marginX, currentY, pageWidth - (marginX * 2), 25, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(251, 191, 36);
    doc.text('SEGURIDAD VIP 3000', marginX + 5, currentY + 10);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('SISTEMA DE GESTION DE NOVEDADES', marginX + 5, currentY + 18);
    currentY += 30;
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0); 

  // Fecha (Alineada a la derecha)
  const fechaTexto = `(${reporte.fecha.toUpperCase()})`;
  doc.text(fechaTexto, pageWidth - marginX, currentY, { align: 'right' });
  currentY += 15;

  // Caso
  const casoTexto = `CASO: ${reporte.titulo.toUpperCase()}.`;
  doc.text(casoTexto, marginX, currentY);
  currentY += 10;

  // Proyecto
  const proyectoTexto = `PROYECTO:       ${reporte.proyecto.toUpperCase()}`;
  doc.text(proyectoTexto, marginX, currentY);
  currentY += 18;

  // Conocimiento del Caso con subrayado
  doc.text('CONOCIMIENTO DEL CASO:', marginX, currentY);
  const textWidthConocimiento = doc.getTextWidth('CONOCIMIENTO DEL CASO:');
  doc.line(marginX, currentY + 1, marginX + textWidthConocimiento, currentY + 1);
  currentY += 8;

  // Contenido indentado
  doc.setFont('Helvetica', 'normal');
  const splitDescripcion = doc.splitTextToSize(reporte.descripcion, pageWidth - (marginX * 2) - 5);
  doc.text(splitDescripcion, marginX + 3, currentY);
  currentY += (splitDescripcion.length * 5) + 15;

  // Atentamente
  doc.setFont('Helvetica', 'bold');
  doc.text('ATENTAMENTE:', marginX, currentY);
  const textWidthAtentamente = doc.getTextWidth('ATENTAMENTE:');
  doc.line(marginX, currentY + 1, marginX + textWidthAtentamente, currentY + 1);
  currentY += 8;

  doc.text(`(${reporte.quien_reporta.toUpperCase()})`, marginX + 3, currentY);
  currentY += 18;

  // Anexos
  doc.text('ANEXOS:', marginX, currentY);
  const textWidthAnexos = doc.getTextWidth('ANEXOS:');
  doc.line(marginX, currentY + 1, marginX + textWidthAnexos, currentY + 1);
  currentY += 8;

  if (reporte.imagenes && reporte.imagenes.length > 0) {
    for (const urlImg of reporte.imagenes) {
      try {
        if (currentY + 65 > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          currentY = 25;
        }
        const imgData = await fetchImageAsBase64(urlImg);
        
        // Detectar formato de la evidencia también
        const imgFormat = detectImageFormat(imgData);
        const imgRawBase64 = extractBase64(imgData);
        
        doc.addImage(imgRawBase64, imgFormat, marginX + 3, currentY, 80, 60); 
        currentY += 68;
      } catch (e) {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('[Error al cargar archivo de evidencia fotográfica]', marginX + 3, currentY);
        currentY += 8;
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
      }
    }
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.text('(SIN EVIDENCIAS REGISTRADAS)', marginX + 3, currentY);
    currentY += 12;
  }
  currentY += 5;

  // Ubicación
  if (currentY + 20 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    currentY = 25;
  }
  doc.setFont('Helvetica', 'bold');
  doc.text('UBICACION:', marginX, currentY);
  const textWidthUbicacion = doc.getTextWidth('UBICACION:');
  doc.line(marginX, currentY + 1, marginX + textWidthUbicacion, currentY + 1);
  currentY += 8;

  doc.setFont('Helvetica', 'normal');
  const coordenadasTexto = `LATITUD: ${reporte.coordenadas.lat} / LONGITUD: ${reporte.coordenadas.lng}`;
  doc.text(coordenadasTexto, marginX + 3, currentY);

  return doc.output('blob');
};

const fetchImageAsBase64 = (url: string): Promise<string> => {
  return fetch(url)
    .then((res) => res.blob())
    .then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));
};

// Función de compatibilidad
export async function generateReportPDF(report: Report): Promise<string> {
  const reporteData: ReporteData = {
    titulo: report.tituloNovedad,
    proyecto: report.proyecto,
    fecha: new Date(report.fechaHora).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    descripcion: report.desarrollo,
    quien_reporta: report.quienReporta,
    imagenes: report.evidencias || [],
    coordenadas: {
      lat: report.ubicacionGPS.lat,
      lng: report.ubicacionGPS.lng
    }
  };
  
  const blob = await generateOfficialPDF(reporteData);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function downloadPDF(pdfData: string, filename: string) {
  const link = document.createElement('a');
  link.href = pdfData;
  link.download = filename;
  link.click();
}