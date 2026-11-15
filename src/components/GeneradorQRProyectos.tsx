import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { PROYECTOS } from '../data/constants';
import { QrCode, Printer, Download } from 'lucide-react';

export default function GeneradorQRProyectos() {
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(PROYECTOS.at(0) || '');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (!proyectoSeleccionado) return;
    const contenidoQR = `VIP3000_PROYECTO:${proyectoSeleccionado}`;

    QRCode.toDataURL(contenidoQR, {
      width: 500,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generando QR:', err));
  }, [proyectoSeleccionado]);

  const descargarOImprimirCartelPDF = () => {
    if (!qrDataUrl || !proyectoSeleccionado) return;
    setGenerando(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const ancho = doc.internal.pageSize.getWidth();

      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(1.5);
      doc.roundedRect(20, 20, ancho - 40, 245, 6, 6, 'S');

      doc.setFillColor(15, 23, 42);
      doc.roundedRect(20, 20, ancho - 40, 34, 6, 6, 'F');
      doc.rect(20, 42, ancho - 40, 12, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('SEGURIDAD VIP 3000 C.A.', ancho / 2, 36, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('CONTROL DE ASISTENCIA Y SUPERVISIÓN EN VIVO', ancho / 2, 46, { align: 'center' });

      doc.setFillColor(29, 78, 216);
      doc.roundedRect(32, 65, ancho - 64, 18, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(proyectoSeleccionado.toUpperCase(), ancho / 2, 77, { align: 'center' });

      const tamanoQR = 105;
      const posX = (ancho - tamanoQR) / 2;
      doc.addImage(qrDataUrl, 'PNG', posX, 94, tamanoQR, tamanoQR);

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('USO OBLIGATORIO CON CÁMARA EN VIVO', ancho / 2, 214, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const lineas = doc.splitTextToSize(
        'Escanee este código directamente desde la aplicación móvil SecureReport al marcar Entrada/Salida de guardia o al Iniciar/Finalizar una supervisión operativa.',
        ancho - 64
      );
      doc.text(lineas, ancho / 2, 223, { align: 'center' });

      const nombreArchivo = `Cartel_QR_${proyectoSeleccionado.replace(/[^a-zA-Z0-9]/g, '_')}_SeguridadVip3000CA.pdf`;

      if ((window as any).ReactNativeWebView) {
        const pdfBase64 = doc.output('datauristring').split(',').pop();
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'DOWNLOAD_PDF',
            filename: nombreArchivo,
            mimeType: 'application/pdf',
            base64: pdfBase64,
          })
        );
      } else {
        doc.save(nombreArchivo);
      }
    } catch (err) {
      alert('Error al generar el cartel QR en PDF.');
    } finally {
      setGenerando(false);
    }
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <QrCode className="text-blue-600" size={22} />
        <div>
          <h3 className="font-bold text-slate-800 text-base">Códigos QR Oficiales por Proyecto</h3>
          <p className="text-xs text-slate-500">Genere, descargue o comparta el cartel QR oficial para colocar en cada puesto</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Seleccione el Proyecto / Ruta:</label>
        <select
          value={proyectoSeleccionado}
          onChange={(e) => setProyectoSeleccionado(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PROYECTOS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {qrDataUrl && (
        <div className="flex flex-col items-center bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200">
            {proyectoSeleccionado}
          </span>
          <img
            src={qrDataUrl}
            alt={`QR ${proyectoSeleccionado}`}
            className="w-48 h-48 rounded-lg border-4 border-white shadow-md"
          />
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={descargarOImprimirCartelPDF}
              disabled={generando}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Printer size={16} /> {generando ? 'Generando Cartel...' : 'Descargar / Imprimir Cartel QR (PDF)'}
            </button>
            <button
              type="button"
              onClick={descargarOImprimirCartelPDF}
              disabled={generando}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download size={16} /> Guardar o Compartir QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
