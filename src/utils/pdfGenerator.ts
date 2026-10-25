import jsPDF from 'jspdf';
import { Report } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export async function generateReportPDF(report: Report): Promise<string> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE NOVEDAD', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SecureReport - Sistema de Gestión de Novedades', pageWidth / 2, 25, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`ID: ${report.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, 31, { align: 'center' });

  y = 45;
  doc.setTextColor(0, 0, 0);

  // Info box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(10, y, pageWidth - 20, 45, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha y Hora:', 15, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(format(parseISO(report.fechaHora), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es }), 55, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('Proyecto:', 15, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(report.proyecto, 55, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.text('Tipo de Novedad:', 15, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(report.tituloNovedad, 55, y + 24);

  doc.setFont('helvetica', 'bold');
  doc.text('Quien Reporta:', 15, y + 32);
  doc.setFont('helvetica', 'normal');
  doc.text(report.quienReporta, 55, y + 32);

  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', 15, y + 40);
  doc.setFont('helvetica', 'normal');
  doc.text(report.status.toUpperCase(), 55, y + 40);

  y += 55;

  // Desarrollo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DESARROLLO DE LA NOVEDAD', 10, y);
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(10, y, pageWidth - 10, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const splitDesarrollo = doc.splitTextToSize(report.desarrollo, pageWidth - 20);
  doc.text(splitDesarrollo, 10, y);
  y += splitDesarrollo.length * 5 + 10;

  // Evidencias
  if (report.evidencias && report.evidencias.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`EVIDENCIAS (${report.evidencias.length} fotos)`, 10, y);
    y += 5;
    doc.line(10, y, pageWidth - 10, y);
    y += 8;

    for (let i = 0; i < report.evidencias.length; i++) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      try {
        doc.addImage(report.evidencias[i], 'JPEG', 10, y, 90, 60);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`Evidencia ${i + 1}`, 10, y + 63);
        y += 70;
      } catch (e) {
        doc.setFontSize(9);
        doc.text(`[Evidencia ${i + 1} - imagen no disponible]`, 10, y);
        y += 10;
      }
    }
  }

  // GPS
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('UBICACIÓN GPS', 10, y);
  y += 5;
  doc.line(10, y, pageWidth - 10, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Latitud: ${report.ubicacionGPS.lat.toFixed(6)}`, 10, y);
  doc.text(`Longitud: ${report.ubicacionGPS.lng.toFixed(6)}`, 10, y + 6);
  if (report.ubicacionGPS.address) {
    const splitAddress = doc.splitTextToSize(`Dirección: ${report.ubicacionGPS.address}`, pageWidth - 20);
    doc.text(splitAddress, 10, y + 12);
    y += 12 + splitAddress.length * 5;
  } else {
    y += 12;
  }

  // Footer
  y = Math.max(y + 10, 260);
  if (y > 270) {
    doc.addPage();
    y = 260;
  }
  doc.setFillColor(241, 245, 249);
  doc.rect(0, y, pageWidth, 20, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`Documento generado automáticamente por SecureReport - ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, y + 8, { align: 'center' });
  doc.text('Este documento es un reporte oficial de novedades de seguridad', pageWidth / 2, y + 14, { align: 'center' });

  // Convert to base64 data URL
  return doc.output('datauristring');
}

export function downloadPDF(pdfData: string, filename: string) {
  const link = document.createElement('a');
  link.href = pdfData;
  link.download = filename;
  link.click();
}
