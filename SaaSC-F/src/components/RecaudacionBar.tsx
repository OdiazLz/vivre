import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { dashboardApi } from '../features/dashboard/api/dashboardApi';
import { TrendingUp, Loader2 } from 'lucide-react';

interface RecaudacionData {
  totalRecaudado: number;
  metaMes: number;
  porcentaje: number;
  residentesPagados: number;
  totalResidentes: number;
}

export interface RecaudacionBarRef {
  refresh: () => void;
}

export default forwardRef<RecaudacionBarRef, object>(function RecaudacionBar(_props, ref) {
  const [data, setData] = useState<RecaudacionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecaudacion = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.collection();
      setData(res.data);
    } catch (error) {
      console.error('Error al cargar recaudación:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecaudacion();
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: fetchRecaudacion,
  }));

  const getCurrentMonthYear = () => {
    const date = new Date();
    return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { porcentaje, residentesPagados, totalResidentes, totalRecaudado, metaMes } = data;

  return (
    <div className="bg-card rounded-2xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Recaudación Mensual — {getCurrentMonthYear()}
          </h3>
          <p className="text-sm text-muted-foreground">
            {residentesPagados} de {totalResidentes} residentes han pagado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <span className="text-3xl font-bold text-emerald-500" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            {porcentaje}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          ${totalRecaudado.toLocaleString()} / ${metaMes.toLocaleString()} meta
        </span>
        <span className="text-muted-foreground">
          {((metaMes - totalRecaudado) > 0 ? `Faltan $${(metaMes - totalRecaudado).toLocaleString()}` : '¡Meta alcanzada!')}
        </span>
      </div>
    </div>
  );
});
