import { Eye } from 'lucide-react';

interface PaymentProof {
  depto: string;
  residente: string;
  monto: string;
  fecha: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
}

interface PaymentProofTableProps {
  pagos: PaymentProof[];
}

export default function PaymentProofTable({ pagos }: PaymentProofTableProps) {
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-700';
      case 'APROBADO':
        return 'bg-green-100 text-green-700';
      case 'RECHAZADO':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Comprobantes de Pago</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600">
              <th className="px-6 py-3">Departamento</th>
              <th className="px-6 py-3">Residente</th>
              <th className="px-6 py-3">Monto</th>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {pagos.map((pago, index) => (
              <tr key={index} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{pago.depto}</td>
                <td className="px-6 py-4 text-slate-700">{pago.residente}</td>
                <td className="px-6 py-4 text-slate-900 font-semibold">${pago.monto}</td>
                <td className="px-6 py-4 text-slate-500">{pago.fecha}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(pago.estado)}`}>
                    {pago.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-blue-600 hover:text-blue-800 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
