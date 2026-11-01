import { jsPDF } from 'jspdf';
import { Report } from '../types';

// Banner corporativo en Base64 (SVG completo)
const BANNER_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJhY2siIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWUyOTNiIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGYxNzJhIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9InVybCgjYmFjaykiLz48cGF0aCBkPSJNNTAgMjUgTDcwIDM1IEw3MCA1NSBMNTAgNjUgTDMwIDU1IEwzMCAzNSBaIiBmaWxsPSIjZmJiZjI0IiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik00NSA0NSBMNTAgNTAgTDYwIDQwIiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHRleHQgeD0iMTAwIiB5PSI0NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI2ZiYmYyNCI+U0VHVVJJREFEIFZJUCAzMDAwPC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iNjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk0YTNiOCI+U0lTVEVNQSBERSBHRVNUSU9OIERFIE5PVkVEQURFUzwvdGV4dD48bGluZSB4MT0iMTAwIiB5MT0iNzUiIHgyPSI3MDAiIHkyPSI3NSIgc3Ryb2tlPSIjZmJiZjI0IiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=';

interface ReporteData {
  titulo: string;       
  proyecto: string;     
  fecha: string;        
  descripcion: string;  
  quien_reporta: string;
  imagenes: string[];   
  coordenadas: { lat: number; lng: number };
}

// Función auxiliar para convertir Report a ReporteData
function reportToReporteData(report: Report): ReporteData {
  return {
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

  // Renderizado del Banner Superior en Base64
  try {
    const bannerWidth = pageWidth - (marginX * 2); 
    const bannerHeight = 28; 
    doc.addImage(BANNER_BASE64, 'SVG', marginX, currentY, bannerWidth, bannerHeight);
    currentY += bannerHeight + 15;
  } catch (error) {
    // Fallback si el banner no se puede cargar
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

  // Conocimiento del Caso con subrayado nativo
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
        doc.addImage(imgData, 'JPEG', marginX + 3, currentY, 80, 60); 
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
  const coordenadasTexto = `LATITUD: ${reporte.coordenadas.lat.toFixed(6)} / LONGITUD: ${reporte.coordenadas.lng.toFixed(6)}`;
  doc.text(coordenadasTexto, marginX + 3, currentY);

  return doc.output('blob');
};

// Función auxiliar para cargar imágenes como Base64
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
  const reporteData = reportToReporteData(report);
  const blob = await generateOfficialPDF(reporteData);
  
  // Convertir Blob a Base64 data URL para compatibilidad
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
