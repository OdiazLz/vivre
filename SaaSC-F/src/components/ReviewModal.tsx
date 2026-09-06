import { useState, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, X, Maximize2, Minimize2 } from 'lucide-react';
import type { PaymentProof } from '../types/domain';

interface ReviewModalProps {
  selectedPago: PaymentProof | null;
  onClose: () => void;
  montoAprobado: string;
  onMontoChange: (value: string) => void;
  motivoRechazo: string;
  onMotivoChange: (value: string) => void;
  loading: boolean;
  onReview: (estatus: 'APROBADO' | 'RECHAZADO') => void;
  API_URL: string;
}

export default function ReviewModal({
  selectedPago,
  onClose,
  montoAprobado,
  onMontoChange,
  motivoRechazo,
  onMotivoChange,
  loading,
  onReview,
  API_URL
}: ReviewModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (selectedPago) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedPago, onClose]);

  if (!selectedPago) return null;

  const imageUrl = /^https?:\/\//i.test(selectedPago.comprobante_url)
    ? selectedPago.comprobante_url
    : `${API_URL}/${selectedPago.comprobante_url.replace(/^\//, '')}`;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
        <div ref={modalRef} className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex justify-between items-center pb-6 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Validar Comprobante
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Departamento <span className="font-semibold text-blue-600">{selectedPago.numero_depto}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-6 overflow-y-auto pr-2">
            {/* Imagen del comprobante */}
            <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px] p-4 shadow-inner group">
              <img
                src={imageUrl}
                alt="Comprobante"
                className="max-h-[400px] object-contain rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                onClick={() => setIsFullscreen(true)}
              />
              <button
                onClick={() => setIsFullscreen(true)}
                className="absolute top-3 right-3 bg-slate-900/70 hover:bg-slate-900 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Ampliar imagen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

          {/* Formulario de Decisión */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Monto Validado ($ MXN)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                  <input
                    type="number"
                    min="0.01"
                    max="10000000"
                    step="0.01"
                    placeholder="1200.00"
                    value={montoAprobado}
                    onChange={(e) => onMontoChange(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl pl-8 pr-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">Si supera los adeudos, el excedente quedará como saldo a favor. También se admiten pagos parciales.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Motivo de Rechazo <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <textarea
                  placeholder="Indica la razón si vas a rechazar el pago..."
                  value={motivoRechazo}
                  onChange={(e) => onMotivoChange(e.target.value)}
                  rows={4}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-sm resize-none transition-all"
                />
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-4 pt-4">
              <button
                disabled={loading || !motivoRechazo}
                onClick={() => onReview('RECHAZADO')}
                className="flex-1 flex justify-center items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all hover:shadow-lg hover:scale-[1.02] disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                <XCircle className="w-5 h-5" />
                Rechazar
              </button>
              <button
                disabled={loading || !montoAprobado}
                onClick={() => onReview('APROBADO')}
                className="flex-1 flex justify-center items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all hover:shadow-lg hover:scale-[1.02] disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                <CheckCircle className="w-5 h-5" />
                Aprobar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Fullscreen Image Modal */}
      {isFullscreen && (
        <div 
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[60] animate-in fade-in duration-200 cursor-pointer"
        >
          <button
            onClick={(e) => e.stopPropagation()}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
          <img
            src={imageUrl}
            alt="Comprobante ampliado"
            className="max-w-[95vw] max-h-[95vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
