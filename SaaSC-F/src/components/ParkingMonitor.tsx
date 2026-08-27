import { useState, useEffect } from 'react';
import { parkingApi } from '../features/parking/api/parkingApi';
import toast from 'react-hot-toast';
import { Car, CheckCircle2, AlertTriangle, ParkingSquare, RefreshCw, Clock, MapPin, LogOut } from 'lucide-react';

interface Cajon {
  id: string;
  codigo_cajon: string;
  tipo: 'VISITA' | 'DISCAPACIDAD' | 'RESIDENTE';
  estatus: 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO';
  depto_reserva?: string;
  visitante_nombre?: string;
  placas?: string;
  hora_entrada?: string;
  minutos_transcurridos?: number | string;
  reserva_id?: string;
  visita_id?: string;
  creado_en: string;
  evento_id?: string;
  evento_titulo?: string;
  evento_fecha?: string;
  evento_inicio?: string;
  evento_fin?: string;
  evento_depto?: string;
}

type FilterType = 'TODOS' | 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO';

export default function ParkingMonitor() {
  const [cajones, setCajones] = useState<Cajon[]>([]);
  const [fetching, setFetching] = useState(false);
  const [filter, setFilter] = useState<FilterType>('TODOS');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchCajones = async () => {
    setFetching(true);
    try {
      const res = await parkingApi.monitor();
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

  const handleMarcarSalida = async (cajon: Cajon) => {
    const registroId = cajon.reserva_id || cajon.visita_id;
    if (!registroId) {
      toast.error('No hay una visita o reserva activa asociada');
      return;
    }
    if (!confirm('¿Confirmar salida del vehículo?')) return;
    setLoadingId(registroId);
    try {
      if (cajon.reserva_id) {
        await parkingApi.releaseReservation(cajon.reserva_id);
      } else {
        await parkingApi.finishVisit(registroId);
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

  const filteredCajones = cajones.filter(cajon => {
    if (filter === 'TODOS') return true;
    if (filter === 'DISPONIBLE') return cajon.estatus === 'DISPONIBLE';
    if (filter === 'OCUPADO') return cajon.estatus === 'OCUPADO';
    if (filter === 'MANTENIMIENTO') return cajon.estatus === 'MANTENIMIENTO';
    return true;
  });

  const disponiblesCount = cajones.filter(c => c.estatus === 'DISPONIBLE').length;
  const ocupadosCount = cajones.filter(c => c.estatus === 'OCUPADO').length;
  const mantenimientoCount = cajones.filter(c => c.estatus === 'MANTENIMIENTO').length;
  const programadosCount = cajones.filter(c => c.evento_id).length;

  const getCardStyle = (estatus: string) => {
    switch (estatus) {
      case 'DISPONIBLE':
        return { bg: '#ecfdf5', border: '#bbf7d0', icon: CheckCircle2, iconColor: '#10b981' };
      case 'OCUPADO':
        return { bg: '#fef2f2', border: '#fecaca', icon: Car, iconColor: '#ef4444' };
      case 'MANTENIMIENTO':
        return { bg: '#f3f4f6', border: '#e5e7eb', icon: AlertTriangle, iconColor: '#6b7280' };
      default:
        return { bg: '#f3f4f6', border: '#e5e7eb', icon: AlertTriangle, iconColor: '#6b7280' };
    }
  };


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            <ParkingSquare className="w-7 h-7 text-blue-600" />
            Monitor de Estacionamiento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualización en tiempo real de cajones
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#eff2fe" }}>
              <ParkingSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{cajones.length}</p>
              <p className="text-xs text-muted-foreground">Total Cajones</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><Clock className="h-5 w-5 text-amber-600"/></div><div><p className="text-2xl font-bold text-foreground">{programadosCount}</p><p className="text-xs text-muted-foreground">Reservados para eventos</p></div></div></div>
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ecfdf5" }}>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{disponiblesCount}</p>
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
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f3f4f6" }}>
              <AlertTriangle className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{mantenimientoCount}</p>
              <p className="text-xs text-muted-foreground">Mantenimiento</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['TODOS', 'DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === f
                ? 'text-white'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            style={{
              background: filter === f ? 'linear-gradient(135deg, #4f6ef7, #4338ca)' : 'transparent',
            }}
          >
            {f === 'TODOS' ? 'Todos' : f === 'DISPONIBLE' ? 'Libres' : f === 'OCUPADO' ? 'Ocupados' : 'Mantenimiento'}
          </button>
        ))}
      </div>

      {/* Grid */}
      {fetching ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCajones.length === 0 ? (
        <div className="text-center py-12">
          <ParkingSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No hay cajones para mostrar</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredCajones.map((cajon) => {
            const style = getCardStyle(cajon.estatus);
            const Icon = style.icon;

            return (
              <div
                key={cajon.id}
                className="rounded-2xl border p-4 transition-all hover:shadow-md"
                style={{
                  borderColor: style.border,
                  background: style.bg,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={18} style={{ color: style.iconColor }} />
                    <span className="text-lg font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {cajon.codigo_cajon}
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      background: cajon.estatus === 'DISPONIBLE' ? '#ecfdf5' : cajon.estatus === 'OCUPADO' ? '#fef2f2' : '#f3f4f6',
                      color: cajon.estatus === 'DISPONIBLE' ? '#10b981' : cajon.estatus === 'OCUPADO' ? '#ef4444' : '#6b7280',
                    }}
                  >
                    {cajon.estatus === 'DISPONIBLE' ? 'Libre' : cajon.estatus === 'OCUPADO' ? 'Ocupado' : 'Mantenimiento'}
                  </span>
                </div>

                {cajon.estatus === 'OCUPADO' ? (
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
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ background: "#eff2fe", color: "#4f6ef7", fontFamily: "JetBrains Mono, monospace" }}
                      >
                        {cajon.depto_reserva}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {cajon.minutos_transcurridos !== undefined
                          ? `${Math.max(0, Math.floor(Number(cajon.minutos_transcurridos)))} min`
                          : '--'}
                      </span>
                    </div>
                    {(cajon.reserva_id || cajon.visita_id) && (
                      <button
                        onClick={() => handleMarcarSalida(cajon)}
                        disabled={loadingId === (cajon.reserva_id || cajon.visita_id)}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                      >
                        <LogOut size={12} />
                        {loadingId === (cajon.reserva_id || cajon.visita_id) ? 'Procesando...' : 'Liberar'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Car className="w-10 h-10 mx-auto mb-2" style={{ color: style.iconColor }} />
                    <p className="text-xs text-muted-foreground">
                      {cajon.estatus === 'DISPONIBLE' ? 'Disponible' : 'No disponible'}
                    </p>
                  </div>
                )}
                {cajon.evento_id && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5"><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Próximo evento</p><p className="mt-1 truncate text-xs font-semibold text-slate-800">{cajon.evento_titulo}</p><p className="mt-1 text-[11px] text-slate-600">{new Date(`${cajon.evento_fecha}T00:00:00`).toLocaleDateString('es-MX')} · {String(cajon.evento_inicio).slice(0, 5)}–{String(cajon.evento_fin).slice(0, 5)}</p><p className="text-[11px] text-slate-500">Depto. {cajon.evento_depto}</p></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
