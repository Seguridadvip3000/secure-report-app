import jsPDF from 'jspdf';
import { Report } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Banner corporativo en Base64 (SVG convertido a data URL)
const BANNER_BASE64 = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmFja2dyb3VuZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWUyOTNiO3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwZjE3MmE7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNiYWNrZ3JvdW5kKSIvPgogIDxwYXRoIGQ9Ik01MCAyNSBMNzAgMzUgTDcwIDU1IEw1MCA2NSBMMzAgNTUgTDMwIDM1IFoiIGZpbGw9IiNmYmJmMjQiIHN0cm9rZT0iI2Y1OWUwYiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPHBhdGggZD0iTTQ1IDQ1IEw1MCA1MCBMNjAgNDAiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KICA8dGV4dCB4PSIxMDAiIHk9IjQ1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjgiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjZmJiZjI0Ij5TRUdVUklEQUQgVklQIDMwMDA8L3RleHQ+CiAgPHRleHQgeD0iMTAwIiB5PSI2NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTRhM2I4Ij5TSVNURU1BIERFIEdFU1RJw5NOIERFIE5PVkVEQURFUzwvdGV4dD4KICA8bGluZSB4MT0iMTAwIiB5MT0iNzUiIHgyPSI3MDAiIHkyPSI3NSIgc3Ryb2tlPSIjZmJiZjI0IiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+`;

export async function generateReportPDF(report: Report): Promise<string> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 0;

  // ============================================
  // BANNER SUPERIOR
  // ============================================
  try {
    doc.addImage(BANNER_BASE64, 'PNG', 0, 0, pageWidth, 35);
  } catch (error) {
    console.error('Error agregando banner:', error);
    // Fallback: header simple si el banner falla
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(251, 191, 36);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SEGURIDAD VIP 3000', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Sistema de Gestión de Novedades', pageWidth / 2, 28, { align: 'center' });
  }

  y = 45;
  doc.setTextColor(0, 0, 0);

  // ============================================
  // INFORMACIÓN GENERAL DEL REPORTE
  // ============================================
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('INFORMACIÓN DEL REPORTE', margin, y);
  y += 2;
  
  // Línea separadora
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ID del Reporte
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`ID del Reporte: ${report.id.slice(0, 8).toUpperCase()}`, margin, y);
  y += 6;

  // Fecha y Hora
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Fecha y Hora del Suceso:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(format(parseISO(report.fechaHora), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es }), margin + 55, y);
  y += 6;

  // Proyecto
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Proyecto:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(report.proyecto, margin + 55, y);
  y += 6;

  // Tipo de Novedad
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Tipo de Novedad:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(report.tituloNovedad, margin + 55, y);
  y += 6;

  // Quien Reporta
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Reportado por:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(report.quienReporta, margin + 55, y);
  y += 6;

  // Estado
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Estado:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(report.status.toUpperCase(), margin + 55, y);
  y += 12;

  // ============================================
  // DESARROLLO DE LA NOVEDAD
  // ============================================
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('DESARROLLO DE LA NOVEDAD', margin, y);
  y += 2;
  
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  
  const splitDesarrollo = doc.splitTextToSize(report.desarrollo, pageWidth - (margin * 2));
  doc.text(splitDesarrollo, margin, y);
  y += splitDesarrollo.length * 5 + 12;

  // ============================================
  // EVIDENCIAS FOTOGRÁFICAS
  // ============================================
  if (report.evidencias && report.evidencias.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`EVIDENCIAS FOTOGRÁFICAS (${report.evidencias.length})`, margin, y);
    y += 2;
    
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    for (let i = 0; i < report.evidencias.length; i++) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      
      try {
        // Imagen de evidencia
        doc.addImage(report.evidencias[i], 'JPEG', margin, y, 90, 60);
        
        // Etiqueta de la evidencia
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`Evidencia ${i + 1}`, margin, y + 65);
        
        y += 75;
      } catch (e) {
        console.error(`Error agregando evidencia ${i + 1}:`, e);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(239, 68, 68);
        doc.text(`[Evidencia ${i + 1} - imagen no disponible]`, margin, y);
        y += 10;
      }
    }
  }

  // ============================================
  // UBICACIÓN GPS
  // ============================================
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('UBICACIÓN GPS', margin, y);
  y += 2;
  
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  
  doc.text(`Latitud: ${report.ubicacionGPS.lat.toFixed(6)}`, margin, y);
  y += 6;
  doc.text(`Longitud: ${report.ubicacionGPS.lng.toFixed(6)}`, margin, y);
  y += 6;
  
  if (report.ubicacionGPS.address) {
    const splitAddress = doc.splitTextToSize(`Dirección: ${report.ubicacionGPS.address}`, pageWidth - (margin * 2));
    doc.text(splitAddress, margin, y);
    y += splitAddress.length * 5 + 6;
  } else {
    y += 6;
  }

  // ============================================
  // NOTAS ADICIONALES (si existen)
  // ============================================
  if (report.notes && report.notes.trim()) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('NOTAS ADICIONALES', margin, y);
    y += 2;
    
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    
    const splitNotes = doc.splitTextToSize(report.notes, pageWidth - (margin * 2));
    doc.text(splitNotes, margin, y);
    y += splitNotes.length * 5 + 12;
  }

  // ============================================
  // FOOTER PROFESIONAL
  // ============================================
  y = Math.max(y + 15, 260);
  if (y > 270) {
    doc.addPage();
    y = 260;
  }

  // Línea separadora
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Información del footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Documento generado automáticamente por Seguridad Vip 3000`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 4;
  doc.text(
    `Fecha de generación: ${new Date().toLocaleString('es-ES')}`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 4;
  doc.text(
    'Este documento es un reporte oficial de novedades de seguridad',
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  // Convert to base64 data URL
  return doc.output('datauristring');
}

export function downloadPDF(pdfData: string, filename: string) {
  const link = document.createElement('a');
  link.href = pdfData;
  link.download = filename;
  link.click();
}
