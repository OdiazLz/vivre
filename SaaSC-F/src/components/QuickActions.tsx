import { UserPlus, Megaphone, FileText } from 'lucide-react';

interface QuickAction {
  id: string;
  titulo: string;
  descripcion: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

interface QuickActionsProps {
  onOpenBroadcast: () => void;
}

export default function QuickActions({ onOpenBroadcast }: QuickActionsProps) {
  const acciones: QuickAction[] = [
    {
      id: 'registrar',
      titulo: 'Registrar Residente',
      descripcion: 'Agregar nuevo residente',
      icon: <UserPlus className="w-5 h-5" />,
      color: 'bg-blue-500',
      onClick: () => console.log('Registrar residente'),
    },
    {
      id: 'comunicado',
      titulo: 'Crear Comunicado',
      descripcion: 'Enviar aviso masivo',
      icon: <Megaphone className="w-5 h-5" />,
      color: 'bg-purple-500',
      onClick: onOpenBroadcast,
    },
    {
      id: 'reporte',
      titulo: 'Generar Reporte',
      descripcion: 'Exportar datos',
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-emerald-500',
      onClick: () => console.log('Generar reporte'),
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Acciones Rápidas</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {acciones.map((accion) => (
            <button
              key={accion.id}
              onClick={accion.onClick}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all group"
            >
              <div className={`p-3 rounded-full ${accion.color} text-white group-hover:scale-110 transition-transform`}>
                {accion.icon}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-900">{accion.titulo}</p>
                <p className="text-xs text-slate-500">{accion.descripcion}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
