import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, HardHat, ImageOff, Loader2, RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { broadcastsApi } from '../features/broadcasts/api/broadcastsApi';

interface Improvement {
  id: string;
  titulo: string;
  mensaje: string;
  imagenes: Array<string | null>;
  estatus: string;
  enviados: number;
  fallidos: number;
  creado_en: string;
  enviado_en?: string | null;
}

export default function BitacoraMejoras() {
  const [items, setItems] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await broadcastsApi.list();
      setItems(response.data.filter((item: Improvement & { tipo?: string }) => item.tipo === 'MEJORA'));
    } catch { toast.error('No se pudo cargar la bitácora de mejoras.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex min-h-72 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin"/>Cargando bitácora…</div>;
  const notified = items.reduce((sum, item) => sum + Number(item.enviados || 0), 0);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><HardHat className="text-amber-600"/>Bitácora de mejoras</h1><p className="mt-1 text-sm text-slate-500">Historial fotográfico de trabajos realizados y comunicados a la comunidad.</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"><RefreshCw size={16}/>Actualizar</button></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase text-slate-400">Mejoras registradas</p><p className="mt-1 text-2xl font-bold">{items.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase text-slate-400">Envíos exitosos</p><p className="mt-1 text-2xl font-bold text-emerald-600">{notified}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase text-slate-400">Última actualización</p><p className="mt-1 text-sm font-bold">{items[0] ? new Date(items[0].creado_en).toLocaleString('es-MX') : 'Sin registros'}</p></div></div>
    {!items.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center"><HardHat className="mx-auto mb-3 text-slate-300" size={42}/><h2 className="font-bold text-slate-700">Todavía no hay mejoras registradas</h2><p className="mt-1 text-sm text-slate-500">Al enviar un comunicado con tipo “Mejora del condominio” aparecerá aquí.</p></div> : <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{items.map((item) => {
      const image = item.imagenes?.find((value): value is string => Boolean(value));
      return <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{image ? <img src={image} alt={item.titulo} className="h-52 w-full object-cover"/> : <div className="flex h-40 items-center justify-center bg-slate-100 text-slate-400"><ImageOff size={32}/></div>}<div className="p-5"><div className="mb-3 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={12}/>MEJORA</span><time className="text-xs text-slate-400">{new Date(item.creado_en).toLocaleDateString('es-MX')}</time></div><h2 className="text-lg font-bold text-slate-900">{item.titulo}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{item.mensaje}</p><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="inline-flex items-center gap-1 text-slate-500"><Send size={13}/>{item.enviados} enviados · {item.fallidos} fallidos</span><span className="font-semibold text-emerald-600">{item.estatus}</span></div></div></article>;
    })}</div>}
  </div>;
}
