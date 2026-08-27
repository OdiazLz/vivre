import React, { useState } from 'react';
import { broadcastsApi } from '../features/broadcasts/api/broadcastsApi';
import { uploadFile } from '../shared/api/filesApi';
import toast from 'react-hot-toast';
import { Send, Megaphone, X } from 'lucide-react';
import FileDropzone from './FileDropzone';


interface BroadcastNoticeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BroadcastNotice({
  isOpen,
  onClose,
}: BroadcastNoticeProps) {
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState<'AVISO' | 'MEJORA'>('AVISO');
  const [imagen, setImagen] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!titulo.trim() || !mensaje.trim()) return;

    setLoading(true);

    try {
      let imagenKey: string | null = null;
      if (imagen) {
        imagenKey = await uploadFile(imagen, 'comunicados');
      }
      const res = await broadcastsApi.send({
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        tipo,
        imagenes: imagenKey ? [imagenKey] : [],
      });

      toast.success(
        `Comunicado enviado exitosamente. Total: ${res.data.total}, Exitosos: ${res.data.enviados}, Fallidos: ${res.data.fallidos}`
      );

      setTitulo('');
      setMensaje('');
      setImagen(null);
      onClose();
    } catch (error) {
      console.error('Error al enviar comunicado:', error);
      toast.error('Ocurrió un error al enviar el comunicado.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="broadcast-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-6 top-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-6 pr-12">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <Megaphone className="h-6 w-6 text-blue-600" />
          </div>

          <div>
            <h2
              id="broadcast-title"
              className="text-xl font-bold text-slate-900"
            >
              Enviar Comunicado Masivo
            </h2>
            <p className="text-sm text-slate-500 mt-1">Notificar a todos los residentes por WhatsApp</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-5">
          <div>
            <label htmlFor="tipo" className="mb-2 block text-sm font-semibold text-slate-700">Tipo de comunicado</label>
            <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as 'AVISO' | 'MEJORA')} className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10">
              <option value="AVISO">Aviso general</option>
              <option value="MEJORA">Mejora del condominio</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="titulo"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Título del Aviso
            </label>

            <input
              id="titulo"
              type="text"
              placeholder="Ej. Corte programado de agua potable"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Fotografía del aviso (opcional)</label>
            <FileDropzone file={imagen} onChange={setImagen} label="Arrastra la fotografía de la mejora" />
            <p className="mt-1 text-xs text-slate-500">La imagen se almacena de forma privada y se comparte por WhatsApp mediante un enlace temporal.</p>
          </div>

          <div>
            <label
              htmlFor="mensaje"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Mensaje / Detalle
            </label>

            <textarea
              id="mensaje"
              rows={5}
              placeholder="Escribe los detalles del aviso..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none transition-all"
              required
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border-2 border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || !titulo.trim() || !mensaje.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:scale-[1.02] disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Enviando...' : 'Enviar por WhatsApp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
