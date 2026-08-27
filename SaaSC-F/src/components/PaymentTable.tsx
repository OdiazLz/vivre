import { Eye } from 'lucide-react';

interface PagoPendiente {
  pago_id: string;
  usuario_nombre: string;
  numero_depto: string;
  comprobante_url: string;
  creado_en: string;
}

interface PaymentTableProps {
  pagos: PagoPendiente[];
  onSelectPago: (pago: PagoPendiente) => void;
}

export default function PaymentTable({ pagos, onSelectPago }: PaymentTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600">
              <th className="px-6 py-4">Departamento</th>
              <th className="px-6 py-4">Residente</th>
              <th className="px-6 py-4">Fecha de Envío</th>
              <th className="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {pagos.map((pago) => (
              <tr key={pago.pago_id} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">
                      {pago.numero_depto}
                    </span>
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-700">{pago.usuario_nombre}</td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(pago.creado_en).toLocaleString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onSelectPago(pago)}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-all hover:shadow-md hover:scale-105"
                  >
                    <Eye className="w-4 h-4" />
                    Revisar
                  </button>
                </td>
              </tr>
            ))}
            {pagos.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-5xl">🎉</div>
                    <p className="text-slate-400 font-medium">Todo al día</p>
                    <p className="text-slate-300 text-sm">No hay comprobantes pendientes de revisión</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
