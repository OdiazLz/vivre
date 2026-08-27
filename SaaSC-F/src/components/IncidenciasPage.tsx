import { useState, useEffect } from 'react';
import { incidentsApi } from '../features/incidents/api/incidentsApi';
import { resolveAssetUrl } from '../config/env';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle2, Clock, Wrench, RefreshCw, Plus, Trash2, X } from 'lucide-react';

interface Incidencia {
  id: string;
  numero_depto: string;
  usuario_nombre: string;
  telefono_whatsapp: string;
  descripcion: string;
  foto_url: string | null;
  estatus: 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO';
  creado_en: string;
}

interface IncidenciasPageProps {
  onRefresh?: () => void;
}

interface ResidenteOption { id: string; depto_id: string; numero_depto: string; nombre: string }

export default function IncidenciasPage({ onRefresh }: IncidenciasPageProps) {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [residentes, setResidentes] = useState<ResidenteOption[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO'>('todos');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIncidencia, setNewIncidencia] = useState({
    depto_id: '',
    usuario_id: '',
    descripcion: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchIncidencias = async () => {
    setFetching(true);
    try {
      const [incidenciasRes, residentesRes] = await Promise.all([
        incidentsApi.list(),
        incidentsApi.residents(),
      ]);
      setIncidencias(incidenciasRes.data);
      setResidentes(residentesRes.data);
    } catch (error) {
      console.error('Error al cargar incidencias:', error);
      toast.error('Error al cargar incidencias');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchIncidencias();
  }, []);

  const handleResolve = async (id: string) => {
    setLoadingId(id);
    try {
      await incidentsApi.resolve(id);
      toast.success('Incidencia marcada como RESUELTO y residente notificado por WhatsApp.');
      fetchIncidencias();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error al actualizar incidencia:', error);
      toast.error('No se pudo actualizar el estado de la incidencia.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidencia.depto_id || !newIncidencia.usuario_id || !newIncidencia.descripcion) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    setCreating(true);
    try {
      await incidentsApi.create(newIncidencia);
      toast.success('Incidencia creada exitosamente');
      setNewIncidencia({ depto_id: '', usuario_id: '', descripcion: '' });
      setShowCreateModal(false);
      fetchIncidencias();
    } catch (error) {
      console.error('Error al crear incidencia:', error);
      toast.error('Error al crear incidencia');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta incidencia?')) return;
    setLoadingId(id);
    try {
      await incidentsApi.remove(id);
      toast.success('Incidencia eliminada exitosamente');
      fetchIncidencias();
    } catch (error) {
      console.error('Error al eliminar incidencia:', error);
      toast.error('Error al eliminar incidencia');
    } finally {
      setLoadingId(null);
    }
  };

  const getEstadoBadge = (estatus: string) => {
    switch (estatus) {
      case 'RESUELTO':
        return { bg: '#ecfdf5', color: '#10b981', icon: CheckCircle2 };
      case 'EN_PROCESO':
        return { bg: '#eff2fe', color: '#4f6ef7', icon: Clock };
      case 'ABIERTO':
      default:
        return { bg: '#fffbeb', color: '#f59e0b', icon: Clock };
    }
  };

  const pendingCount = incidencias.filter(i => i.estatus !== 'RESUELTO').length;

  const incidenciasFiltradas = filtro === 'todos' 
    ? incidencias 
    : incidencias.filter(i => i.estatus === filtro);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            <Wrench className="w-7 h-7 text-blue-600" />
            Reportes e Incidencias
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fallas y solicitudes de mantenimiento reportadas por residentes vía WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-amber-100 text-amber-800 font-semibold px-3 py-1.5 rounded-full text-sm">
            {pendingCount} Pendientes
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <Plus size={16} />
            Nueva Incidencia
          </button>
          <button
            onClick={fetchIncidencias}
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
          <p className="text-2xl font-bold text-foreground mt-1">{incidencias.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Abiertos</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{incidencias.filter(i => i.estatus === 'ABIERTO').length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Resueltos</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{incidencias.filter(i => i.estatus === 'RESUELTO').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          className="bg-muted text-sm px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Filtrar incidencias por estatus"
        >
          <option value="todos">Todos los estatus</option>
          <option value="ABIERTO">Pendientes</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="RESUELTO">Resueltos</option>
        </select>
        <button 
          onClick={() => setFiltro('todos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filtro === 'todos' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Todos ({incidencias.length})
        </button>
        <button 
          onClick={() => setFiltro('ABIERTO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filtro === 'ABIERTO' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Abiertos ({incidencias.filter(i => i.estatus === 'ABIERTO').length})
        </button>
        <button 
          onClick={() => setFiltro('EN_PROCESO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filtro === 'EN_PROCESO' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          En Proceso ({incidencias.filter(i => i.estatus === 'EN_PROCESO').length})
        </button>
        <button 
          onClick={() => setFiltro('RESUELTO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filtro === 'RESUELTO' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Resueltos ({incidencias.filter(i => i.estatus === 'RESUELTO').length})
        </button>
      </div>

      {/* Grid de Incidencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {incidenciasFiltradas.map((incidencia) => {
          const badge = getEstadoBadge(incidencia.estatus);
          const StatusIcon = badge.icon;
          const isResolved = incidencia.estatus === 'RESUELTO';
          
          return (
            <div 
              key={incidencia.id} 
              className={`bg-card rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition ${
                isResolved ? 'border-border opacity-75' : 'border-amber-200 ring-1 ring-amber-100'
              }`}
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
            >
              <div>
                {/* Encabezado de la tarjeta */}
                <div className="flex justify-between items-start mb-3">
                  <span 
                    className="font-bold text-foreground px-2.5 py-1 rounded-lg text-xs"
                    style={{ background: "#eff2fe", color: "#4f6ef7", fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {incidencia.numero_depto}
                  </span>
                  <span 
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full`}
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {incidencia.estatus?.replace('_', ' ') || incidencia.estatus}
                  </span>
                </div>

                {/* Detalle */}
                <h4 className="font-semibold text-foreground text-sm mb-1">{incidencia.usuario_nombre}</h4>
                <p 
                  className="text-muted-foreground text-xs leading-relaxed mb-4 bg-muted p-3 rounded-xl border"
                  style={{ borderColor: "#f3f4f6" }}
                >
                  "{incidencia.descripcion}"
                </p>

                {/* Foto adjunta si existe */}
                {incidencia.foto_url && (
                  <div className="mb-4 rounded-xl overflow-hidden border max-h-48 bg-slate-950 flex items-center justify-center" style={{ borderColor: "#e5e7eb" }}>
                    <img 
                      src={resolveAssetUrl(incidencia.foto_url)}
                      alt="Evidencia" 
                      className="object-contain max-h-48 w-full"
                    />
                  </div>
                )}
              </div>

              {/* Footer con fecha y acción */}
              <div 
                className="pt-3 flex items-center justify-between text-xs text-muted-foreground"
                style={{ borderTop: "1px solid #f3f4f6" }}
              >
                <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  {new Date(incidencia.creado_en).toLocaleString('es-MX')}
                </span>

                <div className="flex items-center gap-2">
                  {incidencia.estatus !== 'RESUELTO' && (
                    <button
                      disabled={loadingId === incidencia.id}
                      onClick={() => handleResolve(incidencia.id)}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1"
                      style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Marcar Resuelto
                    </button>
                  )}
                  <button
                    disabled={loadingId === incidencia.id}
                    onClick={() => handleDelete(incidencia.id)}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1"
                    style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {incidencias.length === 0 && (
          <div className="col-span-full text-center py-16 bg-card rounded-2xl border text-muted-foreground" style={{ borderColor: "#e5e7eb" }}>
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
            <p>No hay reportes de incidencias registrados</p>
          </div>
        )}
      </div>

      {/* Modal para crear incidencia */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Nueva Incidencia
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Departamento</label>
                <select
                  value={newIncidencia.usuario_id}
                  onChange={(e) => {
                    const residente = residentes.find((item) => item.id === e.target.value);
                    setNewIncidencia({ ...newIncidencia, usuario_id: e.target.value, depto_id: residente?.depto_id || '' });
                  }}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  required
                >
                  <option value="">Selecciona departamento y residente</option>
                  {residentes.map((residente) => (
                    <option key={residente.id} value={residente.id}>{residente.numero_depto} — {residente.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Descripción</label>
                <textarea
                  value={newIncidencia.descripcion}
                  onChange={(e) => setNewIncidencia({ ...newIncidencia, descripcion: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border resize-none"
                  style={{ borderColor: "#e5e7eb", minHeight: "100px" }}
                  placeholder="Describe el problema..."
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-muted"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  {creating ? 'Creando...' : 'Crear Incidencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
