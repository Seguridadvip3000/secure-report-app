import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { PROYECTOS } from '../data/constants';
import { QrCode, Printer, Download } from 'lucide-react';

export default function GeneradorQRProyectos() {
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(PROYECTOS[0] || '');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!proyectoSeleccionado) return;
    const contenidoQR = `VIP3000_PROYECTO:${proyectoSeleccionado}`;

    QRCode.toDataURL(contenidoQR, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generando QR:', err));
  }, [proyectoSeleccionado]);

  const imprimirCartelQR = () => {
    if (!qrDataUrl) return;
    const ventana = window.open('', '_blank', 'width=600,height=800');
    if (!ventana) return;

    ventana.document.write(`
      <html>
        <head>
          <title>QR Control de Acceso - ${proyectoSeleccionado}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px 20px;
              color: #0f172a;
            }
            .marco {
              border: 4px solid #0f172a;
              border-radius: 20px;
              padding: 30px;
              max-width: 420px;
              margin: 0 auto;
            }
            .empresa {
              font-size: 18px;
              font-weight: 900;
              letter-spacing: 1px;
              margin-bottom: 6px;
            }
            .subtitulo {
              font-size: 13px;
              color: #475569;
              margin-bottom: 20px;
            }
            .proyecto {
              background: #0f172a;
              color: #ffffff;
              padding: 10px 16px;
              border-radius: 10px;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            img.qr {
              width: 280px;
              height: 280px;
            }
            .instruccion {
              margin-top: 20px;
              font-size: 12px;
              color: #334155;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="marco">
            <div class="empresa">SEGURIDAD VIP 3000 C.A.</div>
            <div class="subtitulo">PUNTO DE CONTROL DE ASISTENCIA Y SUPERVISIÓN</div>
            <div class="proyecto">${proyectoSeleccionado}</div>
            <img class="qr" src="${qrDataUrl}" />
            <div class="instruccion">
              <strong>USO OBLIGATORIO EN VIVO:</strong><br/>
              Escanee este código desde la aplicación <b>SecureReport</b> al ingresar o salir de su turno o supervisión.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <QrCode className="text-blue-600" size={22} />
        <div>
          <h3 className="font-bold text-slate-800 text-base">Códigos QR Oficiales por Proyecto</h3>
          <p className="text-xs text-slate-500">Genere e imprima el código QR para colocar en cada puesto de servicio</p>
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
              onClick={imprimirCartelQR}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
            >
              <Printer size={15} /> Imprimir Cartel QR
            </button>
            <a
              href={qrDataUrl}
              download={`QR_${proyectoSeleccionado.replace(/\s+/g, '_')}.png`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm"
            >
              <Download size={15} /> Descargar Imagen PNG
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
