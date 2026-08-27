import { useState, useEffect } from 'react';
import { petsApi } from '../features/pets/api/petsApi';
import { uploadFile } from '../shared/api/filesApi';
import toast from 'react-hot-toast';
import { PawPrint, Plus, Search, RefreshCw, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import FileDropzone from './FileDropzone';

interface Mascota {
  id: string;
  nombre: string;
  especie_raza: string;
  numero_depto: string;
  foto_url: string | null;
  tiene_placa: boolean;
  creado_en: string;
}

interface ResidenteOption { id: string; depto_id: string; numero_depto: string; nombre: string }

export default function MascotasPage() {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [residentes, setResidentes] = useState<ResidenteOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    especie_raza: '',
    depto_id: '',
    usuario_id: '',
    tiene_placa: true,
  });

  const fetchMascotas = async () => {
    setFetching(true);
    try {
      const [mascotasRes, residentesRes] = await Promise.allSettled([
        petsApi.list(),
        petsApi.residents(),
      ]);
      if (mascotasRes.status === 'rejected') throw mascotasRes.reason;
      setMascotas(Array.isArray(mascotasRes.value.data) ? mascotasRes.value.data : []);
      if (residentesRes.status === 'fulfilled') setResidentes(Array.isArray(residentesRes.value.data) ? residentesRes.value.data : []);
      else toast.error('Las mascotas cargaron, pero no fue posible obtener los residentes.');
    } catch (error) {
      console.error('Error al cargar mascotas:', error);
      toast.error('Error al cargar mascotas');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMascotas();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.especie_raza || !formData.depto_id || !formData.usuario_id) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    setLoading(true);
    try {
      let foto_url = '';
      if (photoFile) {
        foto_url = await uploadFile(photoFile,'mascotas');
      }
      await petsApi.create({ ...formData, foto_url });
      toast.success('Mascota registrada exitosamente');
      setFormData({ nombre: '', especie_raza: '', depto_id: '', usuario_id: '', tiene_placa: true });
      setPhotoFile(null);
      setShowModal(false);
      fetchMascotas();
    } catch (error) {
      console.error('Error al registrar mascota:', error);
      toast.error('Error al registrar mascota');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro of eliminar esta mascota?')) return;
    try {
      await petsApi.remove(id);
      toast.success('Mascota eliminada exitosamente');
      fetchMascotas();
    } catch (error) {
      console.error('Error al eliminar mascota:', error);
      toast.error('Error al eliminar mascota');
    }
  };

  const mascotasFiltradas = mascotas.filter(m =>
    m.nombre.toLowerCase().includes(searchValue.toLowerCase()) ||
    m.especie_raza.toLowerCase().includes(searchValue.toLowerCase()) ||
    m.numero_depto.toLowerCase().includes(searchValue.toLowerCase())
  );

  const conPlacaCount = mascotas.filter(m => m.tiene_placa).length;
  const sinPlacaCount = mascotas.length - conPlacaCount;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            <PawPrint className="w-7 h-7 text-purple-600" />
            Mascotas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro de mascotas por departamento
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', fontFamily: "Plus Jakarta Sans, sans-serif" }}
        >
          <Plus size={16} />
          Nueva Mascota
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f5f3ff" }}>
              <PawPrint className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{mascotas.length}</p>
              <p className="text-xs text-muted-foreground">Total Mascotas</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ecfdf5" }}>
              <PawPrint className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{conPlacaCount}</p>
              <p className="text-xs text-muted-foreground">Con Placa</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
              <PawPrint className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{sinPlacaCount}</p>
              <p className="text-xs text-muted-foreground">Sin Placa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar por nombre, raza o departamento..."
            className="w-full bg-muted text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all text-foreground placeholder:text-muted-foreground border"
            style={{ borderColor: "#e5e7eb" }}
          />
        </div>
        <button
          onClick={fetchMascotas}
          className="p-2.5 rounded-xl border transition-all hover:bg-muted"
          style={{ borderColor: "#e5e7eb" }}
          title="Actualizar"
        >
          <RefreshCw size={18} className={fetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Grid */}
      {fetching ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : mascotasFiltradas.length === 0 ? (
        <div className="text-center py-12">
          <PawPrint className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No hay mascotas registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mascotasFiltradas.map((mascota) => (
            <div
              key={mascota.id}
              className="bg-card rounded-2xl border overflow-hidden transition-all hover:shadow-md"
              style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
            >
              {mascota.foto_url ? (
                <div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={mascota.foto_url}
                    alt={mascota.nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-40 bg-slate-100 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{mascota.nombre}</h3>
                    <p className="text-sm text-muted-foreground">{mascota.especie_raza}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{
                        background: mascota.tiene_placa ? '#ecfdf5' : '#fef2f2',
                        color: mascota.tiene_placa ? '#10b981' : '#ef4444'
                      }}
                    >
                      {mascota.tiene_placa ? 'Con Placa' : 'Sin Placa'}
                    </span>
                    <button
                      onClick={() => handleDelete(mascota.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ background: "#eff2fe", color: "#4f6ef7", fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {mascota.numero_depto}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => !loading && setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
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
              Registrar Nueva Mascota
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="Ej: Firulais"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Raza</label>
                <input
                  type="text"
                  value={formData.especie_raza}
                  onChange={(e) => setFormData({ ...formData, especie_raza: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="Ej: Golden Retriever"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Departamento</label>
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
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Fotografía (opcional)</label>
                <FileDropzone file={photoFile} onChange={setPhotoFile} label="Arrastra la foto de la mascota" />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tiene_placa}
                    onChange={(e) => setFormData({ ...formData, tiene_placa: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-foreground">Porta placa de identificación</span>
                </label>
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
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
                >
                  {loading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
