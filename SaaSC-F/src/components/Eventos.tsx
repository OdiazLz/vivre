import { useState, useEffect } from 'react';
import { eventsApi } from '../features/events/api/eventsApi';
import toast from 'react-hot-toast';
import { Ban, Calendar, Car, Clock, RefreshCw, Bell, BellOff, Pencil, Plus, X } from 'lucide-react';
import { useRegulationArticles } from '../features/regulations/hooks/useRegulationArticles';

interface Evento {
  id: string;
  titulo: string;
  numero_depto: string;
  usuario_nombre: string;
  fecha_evento: string;
  hora_inicio: string;
  hora_fin: string;
  descripcion?: string;
  notificacion_enviada: boolean;
  creado_en: string;
  estatus: 'APROBADO' | 'PENDIENTE' | 'CANCELADO';
  cancelado_en?: string | null;
  origen_cancelacion?: string | null;
  cajones_requeridos: number;
  cajones_asignados: Array<{ id: string; codigo_cajon: string }>;
}

interface ResidenteOption { id: string; depto_id: string; numero_depto: string; nombre: string }
interface ParkingOption { id: string; codigo_cajon: string; estatus: string; disponible: boolean }

export default function EventosPage() {
  const { articles: regulationArticles } = useRegulationArticles();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [residentes, setResidentes] = useState<ResidenteOption[]>([]);
  const [parkingOptions, setParkingOptions] = useState<ParkingOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    depto_id: '',
    usuario_id: '',
    fecha_evento: '',
    hora_inicio: '',
    hora_fin: '',
    cajones_requeridos: 0,
    cajon_ids: [] as string[],
  });
  const eventRule = regulationArticles.find((item) => item.codigo === 'ART_6_2') || regulationArticles.find((item) => item.codigo === 'ART_6');

  const fetchEventos = async () => {
    setFetching(true);
    try {
      const [eventosRes, residentesRes] = await Promise.all([
        eventsApi.list(),
        eventsApi.residents(),
      ]);
      setEventos(eventosRes.data);
      setResidentes(residentesRes.data);
    } catch (error) {
      console.error('Error al cargar eventos:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  useEffect(() => {
    if (!showModal || !formData.fecha_evento || !formData.hora_inicio || !formData.hora_fin || formData.hora_fin <= formData.hora_inicio) { setParkingOptions([]); return; }
    const timer = window.setTimeout(() => {
      void eventsApi.availableParking({ fecha: formData.fecha_evento, inicio: formData.hora_inicio, fin: formData.hora_fin, ...(editingId ? { evento_id: editingId } : {}) })
        .then((response) => setParkingOptions(response.data))
        .catch(() => setParkingOptions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [showModal, editingId, formData.fecha_evento, formData.hora_inicio, formData.hora_fin]);

  const resetForm = () => {
    setFormData({ titulo: '', depto_id: '', usuario_id: '', fecha_evento: '', hora_inicio: '', hora_fin: '', cajones_requeridos: 0, cajon_ids: [] });
    setEditingId(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };
  const openEdit = (evento: Evento) => {
    setEditingId(evento.id);
    setFormData({ titulo: evento.titulo, depto_id: '', usuario_id: '', fecha_evento: evento.fecha_evento.slice(0, 10), hora_inicio: evento.hora_inicio.slice(0, 5), hora_fin: evento.hora_fin.slice(0, 5), cajones_requeridos: Number(evento.cajones_requeridos || 0), cajon_ids: (evento.cajones_asignados || []).map((item) => item.id) });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo || (!editingId && (!formData.depto_id || !formData.usuario_id)) || !formData.fecha_evento || !formData.hora_inicio || !formData.hora_fin || formData.cajon_ids.length > formData.cajones_requeridos) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    setLoading(true);
    try {
      if (editingId) await eventsApi.update(editingId,formData);
      else await eventsApi.create(formData);
      toast.success(editingId ? 'Evento actualizado exitosamente' : 'Evento creado exitosamente');
      resetForm();
      setShowModal(false);
      fetchEventos();
    } catch (error) {
      console.error('Error al crear evento:', error);
      toast.error('Error al crear evento');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar este evento? Permanecerá visible en el historial.')) return;
    try {
      await eventsApi.cancel(id);
      toast.success('Evento cancelado y conservado en el historial');
      fetchEventos();
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      toast.error('Error al cancelar evento');
    }
  };

  const activeEventos = eventos.filter((event) => event.estatus === 'APROBADO');
  const notificadosCount = activeEventos.filter(e => e.notificacion_enviada).length;
  const cancelledEventos = eventos.filter((event) => event.estatus === 'CANCELADO');
  const today = new Date().toLocaleDateString('en-CA');

  const upcomingEventos = eventos
    .filter(e => e.estatus === 'APROBADO' && e.fecha_evento.slice(0, 10) >= today)
    .sort((a, b) => new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime());

  const pastEventos = eventos
    .filter(e => e.estatus === 'APROBADO' && e.fecha_evento.slice(0, 10) < today)
    .sort((a, b) => new Date(b.fecha_evento).getTime() - new Date(a.fecha_evento).getTime());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            <Calendar className="w-7 h-7 text-orange-600" />
            Eventos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calendario de eventos aprobados en la privada
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEventos}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-muted"
            style={{ borderColor: "#e5e7eb", fontFamily: "Plus Jakarta Sans, sans-serif" }}
            disabled={fetching}
          >
            <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            <Plus size={16} />
            Nuevo Evento
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#eff2fe" }}>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{activeEventos.length}</p>
              <p className="text-xs text-muted-foreground">Eventos activos</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ecfdf5" }}>
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{notificadosCount}</p>
              <p className="text-xs text-muted-foreground">Notificados</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fffbeb" }}>
              <BellOff className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{cancelledEventos.length}</p>
              <p className="text-xs text-muted-foreground">Cancelados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Eventos List */}
      {fetching ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No hay eventos programados</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Próximos Eventos */}
          {upcomingEventos.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                Próximos Eventos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEventos.map((evento) => (
                  <div
                    key={evento.id}
                    className="bg-card rounded-2xl border p-4 transition-all hover:shadow-md"
                    style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                          {evento.titulo}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-xs font-bold px-2 py-1 rounded-lg"
                            style={{ background: "#eff2fe", color: "#4f6ef7", fontFamily: "JetBrains Mono, monospace" }}
                          >
                            {evento.numero_depto}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(evento)} className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50" title="Editar"><Pencil size={14} /></button>
                        <button onClick={() => handleCancel(evento.id)} className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50" title="Cancelar evento"><Ban size={14} /></button>
                        <div
                          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                            evento.notificacion_enviada ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {evento.notificacion_enviada ? <Bell size={12} /> : <BellOff size={12} />}
                          {evento.notificacion_enviada ? 'Notificado' : 'Pendiente'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={14} />
                        <span className="capitalize">{formatDate(evento.fecha_evento)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={14} />
                        <span>{evento.hora_inicio} - {evento.hora_fin}</span>
                      </div>
                      <div className="flex items-start gap-2 text-muted-foreground"><Car size={14} className="mt-0.5"/><span>{evento.cajones_requeridos} solicitados · {evento.cajones_asignados?.length ? evento.cajones_asignados.map((item) => item.codigo_cajon).join(', ') : 'pendientes de asignar'}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eventos Pasados */}
          {pastEventos.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                Eventos Pasados
              </h2>
              <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        {["Evento", "Organizador", "Fecha", "Horario", "Notificación"].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                              style={{ fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.06em" }}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "#f3f4f6" }}>
                      {pastEventos.map((evento) => (
                        <tr key={evento.id} className="transition-colors hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-foreground">{evento.titulo}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-xs font-bold px-2 py-1 rounded-lg"
                              style={{ background: "#eff2fe", color: "#4f6ef7", fontFamily: "JetBrains Mono, monospace" }}
                            >
                              {evento.numero_depto}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground">{formatDate(evento.fecha_evento)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground">{evento.hora_inicio} - {evento.hora_fin}<br/><small>{evento.cajones_requeridos} cajones</small></span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                evento.notificacion_enviada ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {evento.notificacion_enviada ? 'Enviada' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {cancelledEventos.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Eventos cancelados</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {cancelledEventos.map((evento) => <div key={evento.id} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-800">{evento.titulo}</h3><p className="mt-1 text-xs text-slate-500">Depto. {evento.numero_depto}</p></div><span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">CANCELADO</span></div><p className="mt-3 text-sm text-slate-600">{formatDate(evento.fecha_evento)} · {evento.hora_inicio.slice(0, 5)}–{evento.hora_fin.slice(0, 5)}</p><p className="mt-2 text-xs text-slate-400">Origen: {evento.origen_cancelacion === 'WHATSAPP' ? 'Residente por WhatsApp' : 'Dashboard'}</p></div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => !loading && setShowModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !loading && setShowModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-bold text-foreground mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {editingId ? 'Editar evento' : 'Crear nuevo evento'}
            </h2>
            <p className="mb-4 rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-800">
              {eventRule ? `${eventRule.etiqueta}: ${eventRule.descripcion || 'Consulta el Reglamento vigente antes de registrar el evento.'}` : 'Consulta el Reglamento vigente antes de registrar el evento.'}
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Título</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="Ej: Fiesta de Cumpleaños"
                  required
                />
              </div>
              {!editingId && <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Departamento Organizador</label>
                <select
                  value={formData.usuario_id}
                  onChange={(e) => {
                    const residente = residentes.find((item) => item.id === e.target.value);
                    setFormData({ ...formData, usuario_id: e.target.value, depto_id: residente?.depto_id || '' });
                  }}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  required
                >
                  <option value="">Selecciona departamento y residente</option>
                  {residentes.map((residente) => <option key={residente.id} value={residente.id}>{residente.numero_depto} — {residente.nombre}</option>)}
                </select>
              </div>}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={formData.fecha_evento}
                  onChange={(e) => setFormData({ ...formData, fecha_evento: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Hora Inicio</label>
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                    style={{ borderColor: "#e5e7eb" }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Hora Fin</label>
                  <input
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                    className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                    style={{ borderColor: "#e5e7eb" }}
                    required
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3"><div><label className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Car size={16} className="text-indigo-600"/>Cajones para invitados</label><p className="mt-1 text-xs text-slate-500">Indica la cantidad solicitada y asigna los espacios confirmados.</p></div><input type="number" min={0} max={20} value={formData.cajones_requeridos} onChange={(event) => { const count = Math.max(0, Math.min(20, Number(event.target.value) || 0)); setFormData({ ...formData, cajones_requeridos: count, cajon_ids: formData.cajon_ids.slice(0, count) }); }} className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold" aria-label="Cantidad de cajones solicitados"/></div>
                {formData.cajones_requeridos > 0 && <div className="mt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Asignados {formData.cajon_ids.length} de {formData.cajones_requeridos}</p>{!formData.fecha_evento || !formData.hora_inicio || !formData.hora_fin ? <p className="text-xs text-amber-700">Selecciona fecha y horario para consultar disponibilidad.</p> : !parkingOptions.length ? <p className="text-xs text-rose-600">No hay cajones de visita configurados o disponibles.</p> : <div className="flex flex-wrap gap-2">{parkingOptions.map((cajon) => { const selected = formData.cajon_ids.includes(cajon.id); const disabled = !cajon.disponible || (!selected && formData.cajon_ids.length >= formData.cajones_requeridos); return <label key={cajon.id} className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition ${selected ? 'border-indigo-500 bg-indigo-600 text-white' : disabled ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}><input type="checkbox" className="sr-only" checked={selected} disabled={disabled} onChange={() => setFormData({ ...formData, cajon_ids: selected ? formData.cajon_ids.filter((id) => id !== cajon.id) : [...formData.cajon_ids, cajon.id] })}/>{cajon.codigo_cajon}{!cajon.disponible ? ' · ocupado' : ''}</label>; })}</div>}</div>}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !loading && setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-muted"
                  style={{ borderColor: "#e5e7eb" }}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                >
                  {loading ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
