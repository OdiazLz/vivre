import { useState, useEffect } from 'react';
import { configurationApi } from '../features/configuration/api/configurationApi';
import toast from 'react-hot-toast';
import { Settings, Save, RefreshCw, User, Database, ParkingSquare, Plus, Trash2, Landmark, BellRing } from 'lucide-react';
import RegulationManager from './RegulationManager';


interface Configuracion {
  id?: string;
  nombre: string;
  monto_cuota: number;
  dia_corte: number;
  creado_en?: string;
  banco: string;
  titular_cuenta: string;
  numero_cuenta: string;
  clabe: string;
  numero_tarjeta: string;
  instrucciones_pago: string;
  notificar_presidente_comprobante: boolean;
  telefono_presidente_notificaciones: string;
}

interface Cajon {
  id: string;
  codigo_cajon: string;
  tipo: 'VISITA' | 'DISCAPACIDAD' | 'RESIDENTE';
  estatus: 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO';
  creado_en: string;
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<Configuracion>({
    nombre: '',
    monto_cuota: 510,
    dia_corte: 10,
    banco: '', titular_cuenta: '', numero_cuenta: '', clabe: '', numero_tarjeta: '', instrucciones_pago: '',
    notificar_presidente_comprobante: false, telefono_presidente_notificaciones: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Parking management state
  const [cajones, setCajones] = useState<Cajon[]>([]);
  const [showCajonModal, setShowCajonModal] = useState(false);
  const [cajonLoading, setCajonLoading] = useState(false);
  const [newCajon, setNewCajon] = useState({
    codigo: '',
    tipo: 'VISITA' as 'VISITA' | 'DISCAPACIDAD' | 'RESIDENTE',
  });

  const fetchConfig = async () => {
    setFetching(true);
    try {
      const res = await configurationApi.get();
      if (res.data) {
        setConfig({ ...res.data, telefono_presidente_notificaciones: String(res.data.telefono_presidente_notificaciones || '').replace(/^52(?=\d{10}$)/, '') });
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      // No mostramos error si es la primera vez que se carga
    } finally {
      setFetching(false);
    }
  };

  const fetchCajones = async () => {
    try {
      const res = await configurationApi.parking();
      setCajones(res.data);
    } catch (error) {
      console.error('Error al cargar cajones:', error);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchCajones();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await configurationApi.update({
        nombre: config.nombre,
        monto_cuota: config.monto_cuota,
        dia_corte: config.dia_corte,
        banco: config.banco,
        titular_cuenta: config.titular_cuenta,
        numero_cuenta: config.numero_cuenta,
        clabe: config.clabe,
        numero_tarjeta: config.numero_tarjeta,
        instrucciones_pago: config.instrucciones_pago,
        notificar_presidente_comprobante: config.notificar_presidente_comprobante,
        telefono_presidente_notificaciones: config.telefono_presidente_notificaciones,
      });
      toast.success('Configuración guardada correctamente');
      fetchConfig();
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCajon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCajon.codigo) {
      toast.error('Por favor ingresa el código del cajón');
      return;
    }
    setCajonLoading(true);
    try {
      await configurationApi.createParking({ codigo_cajon: newCajon.codigo, tipo: newCajon.tipo });
      toast.success('Cajón agregado exitosamente');
      setNewCajon({ codigo: '', tipo: 'VISITA' });
      setShowCajonModal(false);
      fetchCajones();
    } catch (error) {
      console.error('Error al agregar cajón:', error);
      toast.error('Error al agregar cajón');
    } finally {
      setCajonLoading(false);
    }
  };

  const handleDeleteCajon = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cajón?')) return;
    try {
      await configurationApi.removeParking(id);
      toast.success('Cajón eliminado exitosamente');
      fetchCajones();
    } catch (error) {
      console.error('Error al eliminar cajón:', error);
      toast.error('Error al eliminar cajón');
    }
  };

  const handleCajonStatus = async (id: string, newStatus: Cajon['estatus']) => {
    try {
      await configurationApi.setParkingStatus(id,newStatus);
      toast.success(`Cajón marcado como ${newStatus}`);
      fetchCajones();
    } catch (error) {
      console.error('Error al cambiar estatus:', error);
      toast.error('Error al cambiar estatus');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            <Settings className="w-7 h-7 text-gray-600" />
            Configuración
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ajustes generales del condominio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchConfig}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-muted"
            style={{ borderColor: "#e5e7eb" }}
          >
            <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #4f6ef7, #4338ca)' }}
          >
            <Save size={16} />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Config Sections */}
      <div className="grid grid-cols-1 gap-6">
        {/* Información General */}
        <div className="rounded-2xl border bg-card p-6 lg:flex lg:items-end lg:gap-8" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="mb-4 flex items-center gap-2 lg:mb-2 lg:min-w-56">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Información General
            </h2>
          </div>
          <div className="min-w-0 flex-1">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nombre del Condominio</label>
              <input
                type="text"
                value={config.nombre}
                onChange={(e) => setConfig({ ...config, nombre: e.target.value })}
                className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                style={{ borderColor: "#e5e7eb" }}
                placeholder="Ej: Residencial Las Lomas"
              />
            </div>
          </div>
        </div>

        {/* Configuración de Pagos */}
        <div className="bg-card rounded-2xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Configuración de Pagos
            </h2>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Monto de Cuota ($)</label>
              <input
                type="number"
                value={config.monto_cuota}
                onChange={(e) => setConfig({ ...config, monto_cuota: parseFloat(e.target.value) || 0 })}
                className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                style={{ borderColor: "#e5e7eb" }}
                placeholder="510"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Día de Corte</label>
              <input
                type="number"
                min="1"
                max="31"
                value={config.dia_corte}
                onChange={(e) => setConfig({ ...config, dia_corte: parseInt(e.target.value) || 1 })}
                className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                style={{ borderColor: "#e5e7eb" }}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground mt-1">Día del mes en que vence la cuota</p>
            </div>
            </div>
            <div className="border-t border-slate-100 pt-4"><div className="mb-3 flex items-center gap-2"><Landmark size={17} className="text-indigo-600"/><div><h3 className="text-sm font-bold text-slate-800">Datos para depósitos por WhatsApp</h3><p className="text-xs text-slate-500">Sólo se comparten con residentes registrados que los soliciten.</p></div></div><div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">Banco</label><input value={config.banco || ''} maxLength={100} onChange={(e) => setConfig({ ...config, banco: e.target.value })} placeholder="Ej. BBVA" className="w-full rounded-xl border border-slate-200 bg-muted px-3 py-2.5 text-sm outline-none focus:border-indigo-400"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">Titular de la cuenta</label><input value={config.titular_cuenta || ''} maxLength={160} onChange={(e) => setConfig({ ...config, titular_cuenta: e.target.value })} placeholder="Nombre o razón social" className="w-full rounded-xl border border-slate-200 bg-muted px-3 py-2.5 text-sm outline-none focus:border-indigo-400"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">Número de cuenta</label><input value={config.numero_cuenta || ''} inputMode="numeric" maxLength={20} onChange={(e) => setConfig({ ...config, numero_cuenta: e.target.value.replace(/\D/g, '') })} placeholder="Sólo números" className="w-full rounded-xl border border-slate-200 bg-muted px-3 py-2.5 font-mono text-sm outline-none focus:border-indigo-400"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">CLABE interbancaria</label><input value={config.clabe || ''} inputMode="numeric" maxLength={18} onChange={(e) => setConfig({ ...config, clabe: e.target.value.replace(/\D/g, '') })} placeholder="18 dígitos" className="w-full rounded-xl border border-slate-200 bg-muted px-3 py-2.5 font-mono text-sm outline-none focus:border-indigo-400"/></div>
              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-slate-600">Número de tarjeta</label><input value={config.numero_tarjeta || ''} inputMode="numeric" maxLength={16} onChange={(e) => setConfig({ ...config, numero_tarjeta: e.target.value.replace(/\D/g, '') })} placeholder="16 dígitos (opcional)" className="w-full rounded-xl border border-slate-200 bg-muted px-3 py-2.5 font-mono text-sm outline-none focus:border-indigo-400"/></div>
              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-slate-600">Indicaciones adicionales</label><textarea value={config.instrucciones_pago || ''} maxLength={300} rows={3} onChange={(e) => setConfig({ ...config, instrucciones_pago: e.target.value })} placeholder="Ej. Escribe tu número de casa como concepto del depósito." className="w-full resize-none rounded-xl border border-slate-200 bg-muted px-3 py-2.5 text-sm outline-none focus:border-indigo-400"/></div>
            </div></div>
            <div className="border-t border-slate-100 pt-4"><div className="flex items-start justify-between gap-4 rounded-2xl bg-indigo-50/70 p-4"><div className="flex gap-3"><BellRing size={19} className="mt-0.5 shrink-0 text-indigo-600"/><div><h3 className="text-sm font-bold text-slate-800">Avisar al Presidente al recibir comprobantes</h3><p className="mt-1 text-xs leading-5 text-slate-500">Envía un WhatsApp cuando un residente mande un comprobante. El pago continuará pendiente hasta su revisión.</p></div></div><button type="button" role="switch" aria-checked={config.notificar_presidente_comprobante} onClick={() => setConfig({ ...config, notificar_presidente_comprobante: !config.notificar_presidente_comprobante })} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${config.notificar_presidente_comprobante ? 'bg-indigo-600' : 'bg-slate-300'}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${config.notificar_presidente_comprobante ? 'translate-x-5' : 'translate-x-0'}`}/></button></div>{config.notificar_presidente_comprobante && <label className="mt-3 block text-xs font-semibold text-slate-600">WhatsApp del Presidente<div className="mt-1 flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-indigo-400"><span className="border-r border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-500">+52</span><input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={config.telefono_presidente_notificaciones || ''} onChange={(e) => setConfig({ ...config, telefono_presidente_notificaciones: e.target.value.replace(/\D/g, '').slice(0,10) })} placeholder="6647894512" className="min-w-0 flex-1 px-3 py-2.5 font-mono text-sm outline-none"/></div><span className="mt-1 block font-normal text-slate-400">Ingresa únicamente los 10 dígitos del número mexicano.</span></label>}</div>
          </div>
        </div>
      </div>

      <RegulationManager />

      {/* Gestión de Cajones de Estacionamiento */}
      <div className="bg-card rounded-2xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ParkingSquare className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Gestión de Cajones de Estacionamiento
            </h2>
          </div>
          <button
            onClick={() => setShowCajonModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
          >
            <Plus size={14} />
            Agregar Cajón
          </button>
        </div>

        {/* Cajones Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Código", "Tipo", "Estatus", "Acciones"].map(
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
              {cajones.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay cajones configurados
                  </td>
                </tr>
              ) : (
                cajones.map((cajon) => (
                  <tr key={cajon.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {cajon.codigo_cajon}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">{cajon.tipo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          cajon.estatus === 'DISPONIBLE'
                            ? 'bg-green-100 text-green-700'
                            : cajon.estatus === 'OCUPADO'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {cajon.estatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={cajon.estatus}
                          onChange={(e) => handleCajonStatus(cajon.id, e.target.value as Cajon['estatus'])}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                          aria-label={`Estatus del cajón ${cajon.codigo_cajon}`}
                        >
                          <option value="DISPONIBLE">DISPONIBLE</option>
                          <option value="OCUPADO">OCUPADO</option>
                          <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                        </select>
                        <button
                          onClick={() => handleDeleteCajon(cajon.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar Cajón */}
      {showCajonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => !cajonLoading && setShowCajonModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-foreground mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Agregar Nuevo Cajón
            </h2>

            <form onSubmit={handleCreateCajon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Código del Cajón</label>
                <input
                  type="text"
                  value={newCajon.codigo}
                  onChange={(e) => setNewCajon({ ...newCajon, codigo: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="Ej: EV-01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Tipo</label>
                <select
                  value={newCajon.tipo}
                  onChange={(e) => setNewCajon({ ...newCajon, tipo: e.target.value as 'VISITA' | 'DISCAPACIDAD' | 'RESIDENTE' })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  required
                >
                  <option value="VISITA">Visita</option>
                  <option value="DISCAPACIDAD">Discapacidad</option>
                  <option value="RESIDENTE">Residente</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !cajonLoading && setShowCajonModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-muted"
                  style={{ borderColor: "#e5e7eb" }}
                  disabled={cajonLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cajonLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
                >
                  {cajonLoading ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
