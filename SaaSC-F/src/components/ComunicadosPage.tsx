import { useState, useEffect } from 'react';
import { broadcastsApi } from '../features/broadcasts/api/broadcastsApi';
import toast from 'react-hot-toast';
import { Megaphone, RefreshCw, Clock, CheckCircle2, Trash2 } from 'lucide-react';


interface Comunicado {
  id: string;
  titulo: string;
  mensaje: string;
  estatus: 'ENVIADO' | 'PENDIENTE';
  creado_en: string;
  enviado_en?: string;
}

export default function ComunicadosPage() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchComunicados = async () => {
    setFetching(true);
    try {
      const res = await broadcastsApi.list();
      setComunicados(res.data);
    } catch (error) {
      console.error('Error al cargar comunicados:', error);
      toast.error('Error al cargar comunicados');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchComunicados();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este comunicado?')) return;
    setLoadingId(id);
    try {
      await broadcastsApi.remove(id);
      toast.success('Comunicado eliminado exitosamente');
      fetchComunicados();
    } catch (error) {
      console.error('Error al eliminar comunicado:', error);
      toast.error('Error al eliminar comunicado');
    } finally {
      setLoadingId(null);
    }
  };

  const enviadosCount = comunicados.filter(c => c.estatus === 'ENVIADO').length;
  const pendientesCount = comunicados.filter(c => c.estatus === 'PENDIENTE').length;

  const getEstadoBadge = (estatus: string) => {
    switch (estatus) {
      case 'ENVIADO':
        return { bg: '#ecfdf5', color: '#10b981', icon: CheckCircle2 };
      case 'PENDIENTE':
      default:
        return { bg: '#fffbeb', color: '#f59e0b', icon: Clock };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            <Megaphone className="w-7 h-7 text-purple-600" />
            Comunicados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historial de comunicados enviados a residentes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchComunicados}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4f6ef7, #4338ca)' }}
          >
            <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">{comunicados.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Enviados</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{enviadosCount}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendientesCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Título", "Mensaje", "Estatus", "Creado", "Enviado", "Acciones"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-3 sm:px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                      style={{ fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.06em" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#f3f4f6" }}>
              {comunicados.map((comunicado) => {
                const badge = getEstadoBadge(comunicado.estatus);
                const StatusIcon = badge.icon;
                
                return (
                  <tr key={comunicado.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <span className="text-sm font-semibold text-foreground">{comunicado.titulo}</span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <p className="text-sm text-muted-foreground max-w-xs truncate">{comunicado.mensaje}</p>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {comunicado.estatus}
                      </span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(comunicado.creado_en).toLocaleString('es-MX')}
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-sm text-muted-foreground whitespace-nowrap">
                    {comunicado.enviado_en 
                      ? new Date(comunicado.enviado_en).toLocaleString('es-MX')
                      : <span className="text-muted-foreground/50">—</span>
                    }
                  </td>
                  <td className="px-3 sm:px-5 py-3 sm:py-4">
                    <button
                      disabled={loadingId === comunicado.id}
                      onClick={() => handleDelete(comunicado.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>

        {comunicados.length === 0 && (
          <div className="text-center py-16">
            <Megaphone className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground">No hay comunicados registrados</p>
          </div>
        )}
      </div>
    </div>
  );
}
