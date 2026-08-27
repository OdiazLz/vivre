import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, DollarSign, RefreshCw, Plus, X, Image as ImageIcon, Check } from 'lucide-react';
import FileDropzone from './FileDropzone';
import { useRegulationArticles } from '../features/regulations/hooks/useRegulationArticles';
import { useFines } from '../features/fines/hooks/useFines';
import { uploadFile } from '../shared/api/filesApi';

export default function MultasPage() {
  const { articles, error: articlesError } = useRegulationArticles();
  const { fines: multas, departments: departamentos, loading: fetching, reload: fetchMultas, create, markPaid } = useFines();
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTE' | 'PAGADA'>('TODOS');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    depto_id: '',
    articulo_reglamento: 'Art. 1 - Áreas Comunes',
    motivo: '',
    monto: '',
  });

  useEffect(() => {
    if (articles.length && !articles.some((article) => article.etiqueta === formData.articulo_reglamento)) setFormData((current) => ({ ...current, articulo_reglamento: articles[0]!.etiqueta }));
  }, [articles, formData.articulo_reglamento]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.depto_id || !formData.motivo || !formData.monto) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    setLoading(true);
    try {
      let evidencia_url = '';
      if (evidenceFile) {
        evidencia_url = await uploadFile(evidenceFile,'multas');
      }
      await create({
        ...formData,
        evidencia_url,
        monto: parseFloat(formData.monto),
      });
      toast.success('Multa aplicada exitosamente');
      setFormData({ depto_id: '', articulo_reglamento: 'Art. 1 - Áreas Comunes', motivo: '', monto: '' });
      setEvidenceFile(null);
      setShowModal(false);
    } catch (error) {
      console.error('Error al aplicar multa:', error);
      toast.error('Error al aplicar multa');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm('¿Confirmar que esta multa ha sido pagada?')) return;
    try {
      await markPaid(id);
      toast.success('Multa marcada como pagada');
    } catch (error) {
      console.error('Error al marcar multa como pagada:', error);
      toast.error('Error al marcar multa como pagada');
    }
  };

  const pendientesCount = multas.filter(m => m.estatus === 'PENDIENTE').length;
  const pagadasCount = multas.filter(m => m.estatus === 'PAGADA').length;
  const totalMonto = multas.reduce((sum, m) => sum + m.monto, 0);
  const multasFiltradas = statusFilter === 'TODOS' ? multas : multas.filter((m) => m.estatus === statusFilter);

  const getArticuloLabel = (articulo: string) => {
    return articles.find((item) => item.etiqueta === articulo)?.etiqueta || articulo;
  };

  const getEstatusBadge = (estatus: string) => {
    switch (estatus) {
      case 'PAGADA':
        return { bg: '#ecfdf5', color: '#10b981' };
      case 'PENDIENTE':
      default:
        return { bg: '#fffbeb', color: '#f59e0b' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            <AlertTriangle className="w-7 h-7 text-red-600" />
            Multas y Penalizaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de sanciones por incumplimiento del reglamento
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMultas}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-muted"
            style={{ borderColor: "#e5e7eb", fontFamily: "Plus Jakarta Sans, sans-serif" }}
            disabled={fetching}
          >
            <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            <Plus size={16} />
            Aplicar Multa
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#eff2fe" }}>
              <AlertTriangle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{multas.length}</p>
              <p className="text-xs text-muted-foreground">Total Multas</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fffbeb" }}>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{pendientesCount}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ecfdf5" }}>
              <AlertTriangle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{pagadasCount}</p>
              <p className="text-xs text-muted-foreground">Pagadas</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f5f3ff" }}>
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>${totalMonto.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total MXN</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex justify-end">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-muted text-sm px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500/20"
          aria-label="Filtrar multas por estatus"
        >
          <option value="TODOS">Todos los estatus</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="PAGADA">Pagadas</option>
        </select>
      </div>

      {fetching ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : multasFiltradas.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No hay multas registradas</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Departamento", "Artículo", "Motivo", "Monto", "Estatus", "Fecha", "Evidencia", "Acciones"].map(
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
                {multasFiltradas.map((multa) => (
                  <tr key={multa.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ background: "#eff2fe", color: "#4f6ef7", fontFamily: "JetBrains Mono, monospace" }}
                      >
                        {multa.numero_depto}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">{getArticuloLabel(multa.articulo_reglamento)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">{multa.motivo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        ${multa.monto.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={getEstatusBadge(multa.estatus)}
                      >
                        {multa.estatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{new Date(multa.creado_en).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      {multa.evidencia_url ? (
                        <button
                          onClick={() => window.open(multa.evidencia_url, '_blank', 'noopener,noreferrer')}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Ver evidencia"
                        >
                          <ImageIcon size={14} />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {multa.estatus === 'PENDIENTE' && (
                        <button
                          onClick={() => handleMarkAsPaid(multa.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                          title="Marcar como pagada"
                        >
                          <Check size={12} />
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Aplicar Nueva Multa
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Departamento</label>
                <select
                  value={formData.depto_id}
                  onChange={(e) => setFormData({ ...formData, depto_id: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  required
                >
                  <option value="">Selecciona un departamento</option>
                  {departamentos.map((depto) => <option key={depto.id} value={depto.id}>{depto.numero_depto}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Artículo del Reglamento</label>
                <select
                  value={formData.articulo_reglamento}
                  onChange={(e) => setFormData({ ...formData, articulo_reglamento: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  required
                >
                  {articles.map((art) => (
                    <option key={art.id} value={art.etiqueta}>
                      {art.etiqueta}
                    </option>
                  ))}
                </select>
                {articlesError && <p className="mt-1 text-xs text-rose-600">{articlesError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Motivo</label>
                <textarea
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border resize-none"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="Describe la infracción..."
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Monto ($ MXN)</label>
                <input
                  type="number"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full bg-muted text-sm px-4 py-2.5 rounded-xl outline-none transition-all text-foreground border"
                  style={{ borderColor: "#e5e7eb" }}
                  placeholder="Ej: 500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Fotografía de evidencia (opcional)</label>
                <FileDropzone file={evidenceFile} onChange={setEvidenceFile} label="Arrastra la evidencia aquí" />
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
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                >
                  {loading ? 'Aplicando...' : 'Aplicar Multa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
