import { useState, useEffect } from 'react';
import { visitsApi } from '../features/visits/api/visitsApi';
import toast from 'react-hot-toast';
import { Car, Clock, LogOut, RefreshCw, MapPin } from 'lucide-react';

interface CajonEV {
  id: string;
  numero: string;
  tipo: 'VISITA' | 'DISCAPACIDAD' | 'RESIDENTE';
  estatus: 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO';
  ocupado: boolean;
  registro_id?: string;
  registro_tipo?: 'VISITA' | 'RESERVA';
  visitante_nombre?: string;
  placas?: string;
  depto_visita?: string;
  hora_entrada?: string;
  evento_titulo?: string;
  evento_fecha?: string;
  evento_inicio?: string;
  evento_fin?: string;
  evento_depto?: string;
}

export default function VisitasPage() {
  const [cajones, setCajones] = useState<CajonEV[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchCajones = async () => {
    setFetching(true);
    try {
      const res = await visitsApi.list();
      setCajones(res.data);
    } catch (error) {
      console.error('Error al cargar cajones:', error);
      toast.error('Error al cargar cajones');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCajones();
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchCajones, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarcarSalida = async (cajon: CajonEV) => {
    if (!cajon.registro_id || !cajon.registro_tipo) {
      toast.error('El cajón no tiene una visita o reserva activa para liberar');
      return;
    }
    if (!confirm('¿Confirmar salida del vehículo?')) return;
    setLoadingId(cajon.registro_id);
    try {
      if (cajon.registro_tipo === 'RESERVA') {
        await visitsApi.releaseReservation(cajon.registro_id);
      } else {
        await visitsApi.finishVisit(cajon.registro_id);
      }
      toast.success('Salida registrada exitosamente');
      fetchCajones();
    } catch (error) {
      console.error('Error al registrar salida:', error);
      toast.error('Error al registrar salida');
    } finally {
      setLoadingId(null);
    }
  };

  const ocupadosCount = cajones.filter(c => c.estatus === 'OCUPADO').length;
  const libresCount = cajones.filter(c => c.estatus === 'DISPONIBLE').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            <Car className="w-7 h-7 text-blue-600" />
            Monitor de Visitas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control de cajones de estacionamiento en tiempo real
          </p>
        </div>
        <button
          onClick={fetchCajones}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-muted"
          style={{ borderColor: "#e5e7eb", fontFamily: "Plus Jakarta Sans, sans-serif" }}
          disabled={fetching}
        >
          <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#eff2fe" }}>
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{cajones.length}</p>
              <p className="text-xs text-muted-foreground">Total Cajones</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ecfdf5" }}>
              <Car className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{libresCount}</p>
              <p className="text-xs text-muted-foreground">Disponibles</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
              <Car className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{ocupadosCount}</p>
              <p className="text-xs text-muted-foreground">Ocupados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cajones Grid */}
      {fetching ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cajones.map((cajon) => (
            <div
              key={cajon.id}
              className={`bg-card rounded-2xl border p-4 transition-all ${
                cajon.estatus === 'OCUPADO' ? 'border-red-200' : cajon.estatus === 'MANTENIMIENTO' ? 'border-slate-200' : 'border-green-200'
              }`}
              style={{
                borderColor: cajon.estatus === 'OCUPADO' ? "#fecaca" : cajon.estatus === 'MANTENIMIENTO' ? '#e2e8f0' : "#bbf7d0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                background: cajon.estatus === 'OCUPADO' ? "#fef2f2" : cajon.estatus === 'MANTENIMIENTO' ? '#f8fafc' : "#ecfdf5"
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      cajon.estatus === 'OCUPADO' ? 'bg-red-100' : cajon.estatus === 'MANTENIMIENTO' ? 'bg-slate-200' : 'bg-green-100'
                    }`}
                  >
                    <Car size={18} className={cajon.estatus === 'OCUPADO' ? 'text-red-600' : cajon.estatus === 'MANTENIMIENTO' ? 'text-slate-500' : 'text-green-600'} />
                  </div>
                  <span className="font-bold text-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {cajon.numero}
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    cajon.estatus === 'OCUPADO' ? 'bg-red-100 text-red-700' : cajon.estatus === 'MANTENIMIENTO' ? 'bg-slate-200 text-slate-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {cajon.estatus === 'DISPONIBLE' ? 'LIBRE' : cajon.estatus}
                </span>
              </div>

              {cajon.ocupado ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{cajon.visitante_nombre}</p>
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {cajon.placas}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {cajon.hora_entrada ? new Date(cajon.hora_entrada).toLocaleTimeString() : '--:--'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ background: "#eff2fe", color: "#4f6ef7", fontFamily: "JetBrains Mono, monospace" }}
                    >
                      {cajon.depto_visita}
                    </span>
                  </div>
                  {cajon.registro_id && (
                    <button
                      onClick={() => handleMarcarSalida(cajon)}
                      disabled={loadingId === cajon.registro_id}
                      className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                    >
                      <LogOut size={14} />
                      {loadingId === cajon.registro_id ? 'Procesando...' : 'Marcar Salida'}
                    </button>
                  )}
                </div>
              ) : cajon.estatus === 'MANTENIMIENTO' ? (
                <div className="text-center py-4">
                  <Car className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-muted-foreground">Fuera de servicio</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Car className="w-12 h-12 mx-auto text-green-300 mb-2" />
                  <p className="text-sm text-muted-foreground">Cajón disponible</p>
                </div>
              )}
              {cajon.evento_titulo && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Reservado para evento</p><p className="mt-1 truncate text-xs font-semibold text-slate-800">{cajon.evento_titulo}</p><p className="mt-1 text-[11px] text-slate-600">{new Date(`${cajon.evento_fecha}T00:00:00`).toLocaleDateString('es-MX')} · {String(cajon.evento_inicio).slice(0, 5)}–{String(cajon.evento_fin).slice(0, 5)}</p><p className="text-[11px] text-slate-500">Depto. {cajon.evento_depto}</p></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
