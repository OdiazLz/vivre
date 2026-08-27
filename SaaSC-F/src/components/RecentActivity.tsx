import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Activity {
  id: string;
  tipo: 'pago_aprobado' | 'pago_rechazado' | 'pago_pendiente';
  descripcion: string;
  tiempo: string;
}

interface RecentActivityProps {
  actividades: Activity[];
}

export default function RecentActivity({ actividades }: RecentActivityProps) {
  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'pago_aprobado':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pago_rechazado':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pago_pendiente':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Actividad Reciente</h3>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {actividades.map((actividad) => (
            <div key={actividad.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="mt-0.5">{getIcon(actividad.tipo)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700">{actividad.descripcion}</p>
                <p className="text-xs text-slate-500 mt-1">{actividad.tiempo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
