import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, ShieldCheck } from 'lucide-react';

interface QRScannerModalProps {
  titulo: string;
  subtitulo: string;
  proyectoEsperado?: string;
  onScanSuccess: (proyectoEscaneado: string) => void;
  onClose: () => void;
}

export default function QRScannerModal({
  titulo,
  subtitulo,
  proyectoEsperado,
  onScanSuccess,
  onClose,
}: QRScannerModalProps) {
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const procesadoRef = useRef(false);

  useEffect(() => {
    const readerId = 'vip3000-live-qr-reader';
    const html5QrCode = new Html5Qrcode(readerId);
    scannerRef.current = html5QrCode;

    const iniciarCamaraEnVivo = async () => {
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
          },
          (decodedText) => {
            if (procesadoRef.current) return;

            const prefijo = 'VIP3000_PROYECTO:';
            if (!decodedText.startsWith(prefijo)) {
              setErrorCamara('Código QR no válido. Escanee el cartel oficial de Seguridad VIP 3000 ubicado en el puesto.');
              return;
            }

            const proyectoLeido = decodedText.replace(prefijo, '').trim();

            if (
              proyectoEsperado &&
              proyectoLeido.toLowerCase() !== proyectoEsperado.toLowerCase()
            ) {
              setErrorCamara(
                `❌ Proyecto incorrecto: Este QR pertenece a "${proyectoLeido}", pero usted tiene asignado "${proyectoEsperado}".`
              );
              return;
            }

            procesadoRef.current = true;
            html5QrCode
              .stop()
              .catch(() => {})
              .finally(() => {
                onScanSuccess(proyectoLeido);
              });
          },
          () => {}
        );
      } catch (err) {
        setErrorCamara(
          'No se pudo abrir la cámara en vivo. Verifique que el permiso de cámara esté autorizado en su teléfono.'
        );
      }
    };

    iniciarCamaraEnVivo();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [proyectoEsperado, onScanSuccess]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Camera className="text-blue-400" size={22} />
            <div>
              <h3 className="font-bold text-base">{titulo}</h3>
              <p className="text-xs text-slate-300">{subtitulo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-center gap-2 text-xs text-blue-800">
            <ShieldCheck size={16} className="text-blue-600 shrink-0" />
            <span>
              <strong>Verificación en Vivo:</strong> Apunte la cámara directamente al código QR físico ubicado en el puesto de servicio.
            </span>
          </div>

          <div
            id="vip3000-live-qr-reader"
            className="w-full rounded-xl overflow-hidden bg-black min-h-[280px]"
          />

          {errorCamara && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorCamara}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
          >
            Cancelar Escaneo
          </button>
        </div>
      </div>
    </div>
  );
}
