import { useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Search, RefreshCw, Phone, Plus, Edit, Trash2, X, Shield, ShieldOff, FileSpreadsheet, MessageCircle } from 'lucide-react';
import ResidentImportModal from './ResidentImportModal';
import WhatsAppRegistrationModal from './WhatsAppRegistrationModal';
import { useResidents } from '../features/residents/hooks/useResidents';
import type { Resident } from '../types/domain';

const getLocalPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('521') && digits.length === 13) return digits.slice(3);
  if (digits.startsWith('52') && digits.length === 12) return digits.slice(2);
  return digits.slice(-10);
};

const formatPhone = (phone: string) => {
  const local = getLocalPhone(phone);
  return local.length === 10
    ? `+52 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
    : phone;
};

export default function ResidentesPage({ readOnly = false }: { readOnly?: boolean }) {
  const { residents: residentes, departments: departamentos, loading: fetching, reload: fetchResidentes, create, update, remove, setGateAccess } = useResidents();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showWhatsAppRegistration, setShowWhatsAppRegistration] = useState(false);
  const [editingResidente, setEditingResidente] = useState<Resident | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    depto_id: '',
    numero_depto: '',
    telefono_whatsapp: '',
    activo: true,
  });
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await create(formData);
      toast.success('Residente creado exitosamente');
      setShowModal(false);
      setFormData({ nombre: '', depto_id: '', numero_depto: '', telefono_whatsapp: '', activo: true });
    } catch (error) {
      console.error('Error al crear residente:', error);
      toast.error('Error al crear residente');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResidente) return;
    setLoading(true);
    try {
      await update(editingResidente.id,formData);
      toast.success('Residente actualizado exitosamente');
      setShowModal(false);
      setEditingResidente(null);
      setFormData({ nombre: '', depto_id: '', numero_depto: '', telefono_whatsapp: '', activo: true });
    } catch (error) {
      console.error('Error al actualizar residente:', error);
      toast.error('Error al actualizar residente');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este residente?')) return;
    try {
      await remove(id);
      toast.success('Residente eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar residente:', error);
      toast.error('Error al eliminar residente');
    }
  };

  const handleToggleAcceso = async (id: string, currentAcceso: boolean) => {
    try {
      await setGateAccess(id,!currentAcceso);
      toast.success(`Acceso ${!currentAcceso ? 'habilitado' : 'suspendido'} exitosamente`);
    } catch (error) {
      console.error('Error al actualizar acceso:', error);
      toast.error('Error al actualizar acceso');
    }
  };

  const openCreateModal = () => {
    setEditingResidente(null);
    setFormData({ nombre: '', depto_id: '', numero_depto: '', telefono_whatsapp: '', activo: true });
    setShowModal(true);
  };

  const openEditModal = (residente: Resident) => {
    setEditingResidente(residente);
    setFormData({
      nombre: residente.nombre,
      depto_id: residente.depto_id,
      numero_depto: residente.numero_depto,
      telefono_whatsapp: getLocalPhone(residente.telefono_whatsapp),
      activo: residente.activo ?? true,
    });
    setShowModal(true);
  };

  const residentesFiltrados = residentes.filter(r => {
      const matchesSearch = !searchValue ||
        r.nombre.toLowerCase().includes(searchValue.toLowerCase()) ||
        r.numero_depto.toLowerCase().includes(searchValue.toLowerCase());
      const activo = r.activo ?? r.acceso_porton ?? true;
      const matchesStatus = statusFilter === 'TODOS' || (statusFilter === 'ACTIVOS' ? activo : !activo);
      return matchesSearch && matchesStatus;
    });

  const activosCount = residentes.filter(r => r.activo ?? r.acceso_porton ?? true).length;
  const inactivosCount = residentes.length - activosCount;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            <Users className="w-7 h-7 text-blue-600" />
            Residentes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de residentes del condominio
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!readOnly && <button
            onClick={() => setShowWhatsAppRegistration(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <MessageCircle size={16} />
            Registro WhatsApp
          </button>}
          {!readOnly && <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <FileSpreadsheet size={16} />
            Importar Excel
          </button>}
          {!readOnly && <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <Plus size={16} />
            Nuevo Residente
          </button>}
          <button
            onClick={fetchResidentes}
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
          <p className="text-2xl font-bold text-foreground mt-1">{residentes.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Activos</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activosCount}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Inactivos</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{inactivosCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Buscar por nombre o departamento..."
          className="w-full bg-muted text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all text-foreground placeholder:text-muted-foreground border"
          style={{ borderColor: "#e5e7eb" }}
        />
      </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-muted text-sm px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Filtrar residentes por estatus"
        >
          <option value="TODOS">Todos los estatus</option>
          <option value="ACTIVOS">Activos</option>
          <option value="INACTIVOS">Inactivos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Departamento", "Nombre", "WhatsApp", "Estatus", "Acceso Portón", "Fecha Registro", ...(readOnly ? [] : ["Acciones"])].map(
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
              {residentesFiltrados.map((residente) => (
                <tr key={residente.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-3 sm:px-5 py-3 sm:py-4">
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ background: "#eff2fe", color: "#4f6ef7", fontFamily: "JetBrains Mono, monospace" }}
                    >
                      {residente.numero_depto}
                    </span>
                  </td>
                  <td className="px-3 sm:px-5 py-3 sm:py-4">
                    <span className="text-sm font-medium text-foreground">{residente.nombre}</span>
                  </td>
                  <td className="px-3 sm:px-5 py-3 sm:py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone size={14} />
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{formatPhone(residente.telefono_whatsapp)}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-5 py-3 sm:py-4">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: (residente.activo ?? residente.acceso_porton ?? true) ? '#ecfdf5' : '#fef2f2',
                        color: (residente.activo ?? residente.acceso_porton ?? true) ? '#10b981' : '#ef4444'
                      }}
                    >
                      {(residente.activo ?? residente.acceso_porton ?? true) ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-5 py-3 sm:py-4">
                    {readOnly ? <span className="text-xs font-semibold text-slate-500">{residente.acceso_porton ? 'HABILITADO' : 'SUSPENDIDO'}</span> : <button
                      onClick={() => handleToggleAcceso(residente.id, residente.acceso_porton ?? true)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all hover:opacity-80"
                      style={{
                        background: residente.acceso_porton ? '#ecfdf5' : '#fef2f2',
                        color: residente.acceso_porton ? '#10b981' : '#ef4444'
                      }}
                    >
                      {residente.acceso_porton ? <Shield size={12} /> : <ShieldOff size={12} />}
                      {residente.acceso_porton ? 'HABILITADO' : 'SUSPENDIDO'}
                    </button>}
                  </td>
                  <td className="px-3 sm:px-5 py-3 sm:py-4">
                    <span className="text-xs text-muted-foreground">{new Date(residente.creado_en).toLocaleDateString()}</span>
                  </td>
                  {!readOnly && <td className="px-3 sm:px-5 py-3 sm:py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(residente)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(residente.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {residentesFiltrados.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              {searchValue ? 'No se encontraron residentes' : 'No hay residentes registrados'}
            </p>
          </div>
        )}
      </div>

      {/* Modal para crear/editar residente */}
      {!readOnly && showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {editingResidente ? 'Editar Residente' : 'Nuevo Residente'}
            </h3>
            <form onSubmit={editingResidente ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Departamento</label>
                <input
                  type="text"
                  list="departamentos-disponibles"
                  value={formData.numero_depto}
                  onChange={(e) => {
                    const numero = e.target.value;
                    const existente = departamentos.find(
                      (depto) => depto.numero_depto.toLowerCase() === numero.trim().toLowerCase()
                    );
                    setFormData({ ...formData, numero_depto: numero, depto_id: existente?.id || '' });
                  }}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="Escribe o selecciona, ej. A-101"
                  required
                />
                <datalist id="departamentos-disponibles">
                  {departamentos.map((depto) => <option key={depto.id} value={depto.numero_depto} />)}
                </datalist>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Si el departamento no existe, se creará automáticamente al guardar.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">WhatsApp</label>
                <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-muted transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
                  <span className="flex items-center border-r border-gray-200 bg-slate-100 px-3.5 text-sm font-semibold text-slate-600">
                    +52
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={formData.telefono_whatsapp}
                    onChange={(e) => setFormData({
                      ...formData,
                      telefono_whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10),
                    })}
                    className="w-full bg-transparent px-4 py-2.5 text-sm text-foreground outline-none"
                    placeholder="6647894512"
                    minLength={10}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    required
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Ingresa los 10 dígitos, sin espacios ni lada internacional.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Estatus</label>
                <select
                  value={formData.activo ? 'ACTIVO' : 'INACTIVO'}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'ACTIVO' })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border border-gray-200"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-muted"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #4f6ef7, #4338ca)' }}
                >
                  {loading ? 'Guardando...' : (editingResidente ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ResidentImportModal
        isOpen={!readOnly && showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => void fetchResidentes()}
        existingResidents={residentes}
      />
      <WhatsAppRegistrationModal
        isOpen={!readOnly && showWhatsAppRegistration}
        onClose={() => setShowWhatsAppRegistration(false)}
        onApproved={() => void fetchResidentes()}
      />
    </div>
  );
}
