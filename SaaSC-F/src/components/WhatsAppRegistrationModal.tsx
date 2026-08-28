import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import axios from 'axios';
import { Check, Clipboard, Clock3, Link2, Loader2, MessageCircle, Plus, QrCode, RefreshCw, Share2, UserCheck, UserX, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { registrationApi } from '../features/registration/api/registrationApi';

interface Invitation {
  id: string; codigo: string; descripcion: string; expira_en: string; max_usos: number; usos: number; activo: boolean; vigente: boolean; wa_link: string | null; mensaje_whatsapp: string;
}
interface RegistrationRequest {
  id: string; nombre: string; numero_depto: string; telefono_whatsapp: string; estatus: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'; creado_en: string;
}

export default function WhatsAppRegistrationModal({ isOpen, onClose, onApproved }: { isOpen: boolean; onClose: () => void; onApproved: () => void }) {
  const [tab, setTab] = useState<'solicitudes' | 'invitaciones'>('solicitudes');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [selected, setSelected] = useState<Invitation | null>(null);
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState('');
  const [form, setForm] = useState({ descripcion: 'Registro general de residentes', dias_vigencia: 30, max_usos: 100 });

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [invitationResponse, requestResponse] = await Promise.all([
        registrationApi.invitations(),
        registrationApi.requests(),
      ]);
      setInvitations(invitationResponse.data);
      setRequests(requestResponse.data);
    } catch { toast.error('No se pudo cargar el registro por WhatsApp.'); }
    finally { if (showLoading) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void load();

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void load(false);
    };
    const intervalId = window.setInterval(refreshIfVisible, 15_000);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [isOpen, load]);
  useEffect(() => {
    if (!selected?.wa_link) { setQr(''); return; }
    void QRCode.toDataURL(selected.wa_link, { width: 320, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } }).then(setQr);
  }, [selected]);

  const createInvitation = async () => {
    setWorking('create');
    try {
      const response = await registrationApi.createInvitation(form);
      setInvitations((current) => [response.data, ...current]); setSelected(response.data);
      toast.success('Invitación generada.');
    } catch { toast.error('No se pudo generar la invitación.'); }
    finally { setWorking(''); }
  };

  const copy = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text); toast.success(message);
  };

  const invitationText = (invitation: Invitation) => {
    const instructions = `Regístrate en la privada por WhatsApp. Envía: ${invitation.mensaje_whatsapp}`;
    return invitation.wa_link ? `${instructions}\n\n${invitation.wa_link}` : instructions;
  };

  const share = async (invitation: Invitation) => {
    const text = `Regístrate en la privada por WhatsApp. Envía: ${invitation.mensaje_whatsapp}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Registro de residente', text, url: invitation.wa_link || undefined });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(invitationText(invitation))}`;
    const popup = window.open(whatsappShareUrl, '_blank', 'noopener,noreferrer');
    if (popup) {
      toast.success('Abriendo WhatsApp para compartir.');
      return;
    }
    await copy(invitationText(invitation), 'Invitación copiada. Pégala en WhatsApp.');
  };

  const review = async (request: RegistrationRequest, approve: boolean) => {
    let motivo = '';
    if (!approve) motivo = window.prompt('Motivo del rechazo (opcional):') || '';
    setWorking(request.id);
    try {
      await registrationApi.review(request.id, approve, motivo);
      toast.success(approve ? 'Residente aprobado y notificado.' : 'Solicitud rechazada.');
      await load(); if (approve) onApproved();
    } catch (error: unknown) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.error || 'No se pudo revisar la solicitud.' : 'No se pudo revisar la solicitud.');
    } finally { setWorking(''); }
  };

  const deactivate = async (invitation: Invitation) => {
    if (!confirm(`¿Desactivar el código ${invitation.codigo}?`)) return;
    setWorking(invitation.id);
    try { await registrationApi.deactivateInvitation(invitation.id); await load(); setSelected(null); toast.success('Código desactivado.'); }
    catch { toast.error('No se pudo desactivar el código.'); }
    finally { setWorking(''); }
  };

  if (!isOpen) return null;
  const pending = requests.filter((request) => request.estatus === 'PENDIENTE');
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3"><div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600"><MessageCircle size={23}/></div><div><h2 className="text-xl font-bold text-slate-900">Registro por WhatsApp</h2><p className="text-sm text-slate-500">Invitaciones seguras y solicitudes de residentes</p></div></div>
        <div className="flex items-center gap-1">
          <button onClick={() => void load()} disabled={loading} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600 disabled:opacity-50" aria-label="Actualizar solicitudes" title="Actualizar solicitudes"><RefreshCw size={19} className={loading ? 'animate-spin' : ''}/></button>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={20}/></button>
        </div>
      </div>
      <div className="flex border-b border-slate-100 px-5 sm:px-7">{([['solicitudes', `Solicitudes (${pending.length})`], ['invitaciones', 'Invitaciones']] as const).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>{label}</button>)}</div>

      <div className="overflow-y-auto p-5 sm:p-7">
        {loading ? <div className="flex min-h-64 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin"/>Cargando…</div> : tab === 'solicitudes' ? <div className="space-y-3">
          {!pending.length && <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center"><UserCheck className="mx-auto mb-3 text-emerald-500"/><b className="text-slate-700">No hay solicitudes pendientes</b><p className="mt-1 text-sm text-slate-500">Las nuevas solicitudes aparecerán aquí.</p></div>}
          {pending.map((request) => <div key={request.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><b className="text-slate-900">{request.nombre}</b><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">PENDIENTE</span></div><p className="mt-1 text-sm text-slate-600">Depto. {request.numero_depto} · +{request.telefono_whatsapp}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Clock3 size={12}/>{new Date(request.creado_en).toLocaleString('es-MX')}</p></div><div className="flex gap-2"><button disabled={!!working} onClick={() => void review(request, false)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"><UserX size={16}/>Rechazar</button><button disabled={!!working} onClick={() => void review(request, true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{working === request.id ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}Aprobar</button></div></div>)}
        </div> : <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 p-5"><h3 className="font-bold text-slate-900">Nueva invitación</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2" placeholder="Descripción"/><label className="text-xs font-semibold text-slate-500">Días de vigencia<input type="number" min="1" max="365" value={form.dias_vigencia} onChange={(event) => setForm({ ...form, dias_vigencia: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"/></label><label className="text-xs font-semibold text-slate-500">Máximo de registros<input type="number" min="1" max="1000" value={form.max_usos} onChange={(event) => setForm({ ...form, max_usos: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"/></label></div><button onClick={() => void createInvitation()} disabled={!!working} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{working === 'create' ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}Generar código y QR</button></section>
            <section className="space-y-2"><h3 className="font-bold text-slate-900">Códigos generados</h3>{invitations.map((invitation) => <button key={invitation.id} onClick={() => setSelected(invitation)} className={`w-full rounded-2xl border p-4 text-left ${selected?.id === invitation.id ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200'}`}><div className="flex items-center justify-between gap-3"><b className="font-mono text-slate-900">{invitation.codigo}</b><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${invitation.vigente ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{invitation.vigente ? 'VIGENTE' : 'INACTIVO'}</span></div><p className="mt-1 text-xs text-slate-500">{invitation.usos}/{invitation.max_usos} usos · vence {new Date(invitation.expira_en).toLocaleDateString('es-MX')}</p></button>)}</section>
          </div>
          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            {!selected ? <div className="flex min-h-80 flex-col items-center justify-center text-center text-slate-500"><QrCode size={40} className="mb-3 text-slate-300"/><p className="text-sm">Genera o selecciona una invitación para compartirla.</p></div> : <div className="text-center"><h3 className="font-bold text-slate-900">Invitación para residentes</h3>{qr ? <img src={qr} alt={`QR ${selected.codigo}`} className="mx-auto my-4 w-full max-w-64 rounded-2xl border bg-white p-3"/> : <div className="my-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Configura <b>WHATSAPP_PUBLIC_NUMBER</b> en el backend para generar el enlace y QR.</div>}<div className="rounded-xl bg-white p-3 font-mono text-lg font-bold text-slate-900">{selected.mensaje_whatsapp}</div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => void copy(invitationText(selected), 'Invitación completa copiada.')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"><Clipboard size={15}/>Copiar</button><button onClick={() => void share(selected)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><Share2 size={15}/>Compartir</button>{selected.wa_link && <a href={selected.wa_link} target="_blank" rel="noreferrer" className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><Link2 size={15}/>Probar enlace en WhatsApp</a>}</div>{selected.activo && <button onClick={() => void deactivate(selected)} className="mt-5 text-xs font-semibold text-rose-600">Desactivar esta invitación</button>}</div>}
          </aside>
        </div>}
      </div>
    </div>
  </div>;
}
