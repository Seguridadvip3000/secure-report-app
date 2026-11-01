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

// Banner SVG corporativo de Seguridad Vip 3000 (completo y autónomo)
const BANNER_SVG = `<svg width="800" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="back" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="100" fill="url(#back)"/>
  <path d="M50 25 L70 35 L70 55 L50 65 L30 55 L30 35 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
  <path d="M45 45 L50 50 L60 40" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="100" y="45" font-family="Arial" font-size="28" font-weight="bold" fill="#fbbf24">SEGURIDAD VIP 3000</text>
  <text x="100" y="65" font-family="Arial" font-size="14" fill="#94a3b8">SISTEMA DE GESTIÓN DE NOVEDADES</text>
  <line x1="100" y1="75" x2="700" y2="75" stroke="#fbbf24" stroke-width="1"/>
</svg>`;

// Convertir SVG a Base64 data URL
const BANNER_BASE64 = 'image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(BANNER_SVG)));

export const generateOfficialPDF = async (reporte: ReporteData): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); 
  const marginX = 20;
  let currentY = 20;

  // Renderizado del Banner Superior Integrado (SVG)
  try {
    const bannerWidth = pageWidth - (marginX * 2); 
    const bannerHeight = 28; 
    doc.addImage(BANNER_BASE64, 'SVG', marginX, currentY, bannerWidth, bannerHeight);
    currentY += bannerHeight + 15;
  } catch (error) {
    // Fallback si el SVG no se puede renderizar
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('SEGURIDAD VIP 3000', marginX, currentY);
    currentY += 25;
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

  // Conocimiento del Caso con subrayado puro
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

  // Anexos / Evidencias Fotográficas
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
        doc.addImage(imgData, 'JPEG', marginX + 3, currentY, 80, 60); 
        currentY += 68;
      } catch (e) {
        doc.setFont('Helvetica', 'italic').setFontSize(9);
        doc.text('[Error al cargar archivo de evidencia fotográfica]', marginX + 3, currentY);
        currentY += 8;
        doc.setFontSize(11).setFont('Helvetica', 'bold');
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

// Función de compatibilidad con el código existente
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
