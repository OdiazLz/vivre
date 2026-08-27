import { Building2, LockKeyhole, LogOut, ShieldAlert } from 'lucide-react';

export default function SuspendedCondoNotice({ onLogout }: { onLogout: () => void }) {
  return <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-5">
    <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">
      <div className="bg-slate-950 px-7 py-8 text-white"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300"><ShieldAlert size={27}/></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Vivre Licencias</p><h1 className="mt-1 text-2xl font-bold">Servicio suspendido</h1></div></div></div>
      <div className="p-7"><div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><LockKeyhole className="mt-0.5 shrink-0" size={20}/><p className="text-sm leading-6">La suscripción de este condominio se encuentra suspendida. El panel y los servicios de WhatsApp permanecerán bloqueados hasta que el dueño de la plataforma reactive la licencia.</p></div><div className="mt-6 flex items-center gap-3 text-sm text-slate-500"><Building2 size={18}/><span>Contacta al proveedor o a la administración de Vivre para revisar tu suscripción.</span></div><button onClick={onLogout} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"><LogOut size={17}/>Cerrar sesión</button></div>
    </section>
  </main>;
}
