import { Building2, RefreshCw, Megaphone } from 'lucide-react';

interface NavbarProps {
  onRefresh: () => void;
  isFetching: boolean;
  onOpenBroadcast: () => void;
}

export default function Navbar({ onRefresh, isFetching, onOpenBroadcast }: NavbarProps) {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-blue-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Panel Condominio</h1>
            <p className="text-xs text-slate-400">Administración</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenBroadcast} 
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <Megaphone className="w-4 h-4" />
            Comunicado
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>
    </header>
  );
}
