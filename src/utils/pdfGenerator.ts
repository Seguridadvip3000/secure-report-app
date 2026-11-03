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

// Logo compacto de Seguridad Vip 3000 en Base64 JPEG (con prefijo data:)
const LOGO_VIP_BASE64 = 'data:image/jpeg;base64,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';

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
  let currentY = 15;

  // ==========================================
  // ENCABEZADO CON LOGO Y FECHA
  // ==========================================
  try {
    // Convertir Base64 a objeto Image para decodificación confiable
    const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = LOGO_VIP_BASE64; // Usar el Data URI completo
    });

    // Logo en la esquina superior izquierda (35x22 mm)
    doc.addImage(logoImg, 'JPEG', marginX, currentY, 35, 22);

    // Fecha en la esquina superior derecha
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(reporte.fecha.toUpperCase(), pageWidth - marginX, currentY + 11, { align: 'right' });

    currentY += 28; // Espacio después del encabezado
    console.log('✅ Logo renderizado exitosamente');
  } catch (error) {
    console.error("❌ Error al renderizar el logo:", error);
    // Fallback: solo fecha si el logo falla
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(reporte.fecha.toUpperCase(), pageWidth - marginX, currentY + 5, { align: 'right' });
    currentY += 15;
  }

  // ==========================================
  // TÍTULOS EN AZUL CORPORATIVO
  // ==========================================
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138); // Azul oscuro corporativo (#1e3a8a)
  
  // Línea 1: SEGURIDAD VIP 3000
  const titulo1 = 'SEGURIDAD VIP 3000';
  doc.text(titulo1, pageWidth / 2, currentY, { align: 'center' });
  const titulo1Width = doc.getTextWidth(titulo1);
  doc.line((pageWidth - titulo1Width) / 2, currentY + 1, (pageWidth + titulo1Width) / 2, currentY + 1);
  currentY += 8;

  // Línea 2: SISTEMA DE GESTIÓN DE NOVEDADES
  const titulo2 = 'SISTEMA DE GESTIÓN DE NOVEDADES';
  doc.text(titulo2, pageWidth / 2, currentY, { align: 'center' });
  const titulo2Width = doc.getTextWidth(titulo2);
  doc.line((pageWidth - titulo2Width) / 2, currentY + 1, (pageWidth + titulo2Width) / 2, currentY + 1);
  currentY += 12;

  // Resetear color de texto
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  // ==========================================
  // CASO
  // ==========================================
  const casoTexto = `CASO: ${reporte.titulo.toUpperCase()}.`;
  doc.text(casoTexto, marginX, currentY);
  currentY += 10;

  // ==========================================
  // PROYECTO
  // ==========================================
  const proyectoTexto = `PROYECTO:       ${reporte.proyecto.toUpperCase()}`;
  doc.text(proyectoTexto, marginX, currentY);
  currentY += 18;

  // ==========================================
  // CONOCIMIENTO DEL CASO
  // ==========================================
  doc.text('CONOCIMIENTO DEL CASO:', marginX, currentY);
  const textWidthConocimiento = doc.getTextWidth('CONOCIMIENTO DEL CASO:');
  doc.line(marginX, currentY + 1, marginX + textWidthConocimiento, currentY + 1);
  currentY += 8;

  // Contenido indentado
  doc.setFont('Helvetica', 'normal');
  const splitDescripcion = doc.splitTextToSize(reporte.descripcion, pageWidth - (marginX * 2) - 5);
  doc.text(splitDescripcion, marginX + 3, currentY);
  currentY += (splitDescripcion.length * 5) + 15;

  // ==========================================
  // ATENTAMENTE
  // ==========================================
  doc.setFont('Helvetica', 'bold');
  doc.text('ATENTAMENTE:', marginX, currentY);
  const textWidthAtentamente = doc.getTextWidth('ATENTAMENTE:');
  doc.line(marginX, currentY + 1, marginX + textWidthAtentamente, currentY + 1);
  currentY += 8;

  doc.text(`(${reporte.quien_reporta.toUpperCase()})`, marginX + 3, currentY);
  currentY += 18;

  // ==========================================
  // ANEXOS
  // ==========================================
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

  // ==========================================
  // UBICACIÓN
  // ==========================================
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