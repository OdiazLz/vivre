import { useCallback, useEffect, useState } from 'react';
import { Building2, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, LogOut, Plus, RefreshCw, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminApi } from '../features/superadmin/api/superAdminApi';

interface CondominiumLicense { id: string; nombre: string; estatus: 'ACTIVO' | 'SUSPENDIDO'; administrador_email?: string; administrador_nombre?: string; total_departamentos: number; total_residentes: number }
interface AdministratorAccount { id: string; nombre: string; email: string; rol: string; activo: boolean; ultimo_acceso?: string | null }
interface NewCondominium { nombre: string; monto_cuota: string; dia_corte: string; presidente_nombre: string; presidente_email: string; password: string; confirmation: string }
const EMPTY_CONDOMINIUM: NewCondominium = { nombre: '', monto_cuota: '1200', dia_corte: '5', presidente_nombre: '', presidente_email: '', password: '', confirmation: '' };

const errorMessage = (error: unknown) => {
  const candidate = error as { response?: { data?: { error?: string; message?: string } } };
  return candidate.response?.data?.error || candidate.response?.data?.message || 'No fue posible completar la operación.';
};

export default function SuperAdminPage({ ownerName, onLogout }: { ownerName: string; onLogout: () => void }) {
  const [items, setItems] = useState<CondominiumLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [selectedCondo, setSelectedCondo] = useState<CondominiumLicense | null>(null);
  const [accounts, setAccounts] = useState<AdministratorAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdministratorAccount | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newCondo, setNewCondo] = useState<NewCondominium>(EMPTY_CONDOMINIUM);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await superAdminApi.condominiums(); setItems(Array.isArray(data) ? data : []); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const changeStatus = async (item: CondominiumLicense) => {
    const next = item.estatus === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';
    if (!confirm(`${next === 'SUSPENDIDO' ? 'Suspender' : 'Reactivar'} “${item.nombre}”?`)) return;
    setWorking(item.id);
    try {
      await superAdminApi.setStatus(item.id,next);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, estatus: next } : row));
      toast.success(next === 'ACTIVO' ? 'Condominio reactivado.' : 'Condominio suspendido.');
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setWorking(''); }
  };

  const openAccounts = async (item: CondominiumLicense) => {
    setSelectedCondo(item); setAccounts([]); setAccountsLoading(true);
    try { const { data } = await superAdminApi.accounts(item.id); setAccounts(Array.isArray(data) ? data : []); }
    catch (error) { toast.error(errorMessage(error)); setSelectedCondo(null); }
    finally { setAccountsLoading(false); }
  };

  const closeReset = () => { setResetTarget(null); setPassword(''); setConfirmation(''); setShowPassword(false); };
  const submitReset = async () => {
    if (!resetTarget) return;
    if (password !== confirmation) return toast.error('Las contraseñas no coinciden.');
    setWorking(`password-${resetTarget.id}`);
    try {
      await superAdminApi.resetPassword(resetTarget.id,password);
      toast.success(`Contraseña de ${resetTarget.nombre} restablecida.`); closeReset();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setWorking(''); }
  };

  const closeCreate = () => { setShowCreate(false); setNewCondo(EMPTY_CONDOMINIUM); setShowCreatePassword(false); };
  const submitCreate = async () => {
    if (newCondo.password !== newCondo.confirmation) return toast.error('Las contraseñas no coinciden.');
    setWorking('create-condominium');
    try {
      await superAdminApi.createCondominium({
        nombre: newCondo.nombre,
        monto_cuota: Number(newCondo.monto_cuota),
        dia_corte: Number(newCondo.dia_corte),
        presidente: { nombre: newCondo.presidente_nombre, email: newCondo.presidente_email, password: newCondo.password },
      });
      toast.success('Privada y cuenta del Presidente registradas.'); closeCreate(); await load();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setWorking(''); }
  };

  return <main className="min-h-dvh bg-slate-100">
    <header className="border-b border-slate-800 bg-slate-950 px-5 py-4 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500"><ShieldCheck size={22}/></div><div><h1 className="font-bold">Vivre Control Center</h1><p className="text-xs text-slate-400">Licencias y cuentas de la plataforma</p></div></div><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-300 sm:block">{ownerName}</span><button onClick={onLogout} className="rounded-xl border border-slate-700 p-2.5 text-slate-300 hover:bg-slate-800" title="Cerrar sesión"><LogOut size={17}/></button></div></div></header>
    <div className="mx-auto max-w-7xl p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-indigo-600">Panel Super Admin</p><h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Condominios registrados</h2><p className="mt-2 text-sm text-slate-500">Administra clientes, licencias y cuentas principales.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"><Plus size={17}/>Nueva privada</button><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Actualizar</button></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3"><Metric icon={<Building2/>} value={items.length} label="Condominios"/><Metric icon={<ShieldCheck/>} value={items.filter((i) => i.estatus === 'ACTIVO').length} label="Licencias activas"/><Metric icon={<LockKeyhole/>} value={items.filter((i) => i.estatus === 'SUSPENDIDO').length} label="Suspendidas"/></div>
      <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">{loading ? <Loading text="Cargando licencias…"/> : <div className="overflow-x-auto"><table className="w-full min-w-[940px]"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Condominio</th><th className="px-5 py-4">Cuenta principal</th><th className="px-5 py-4">Departamentos</th><th className="px-5 py-4">Residentes</th><th className="px-5 py-4">Estatus</th><th className="px-5 py-4 text-right">Control</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><b>{item.nombre}</b></td><td className="px-5 py-4"><p className="text-sm font-medium">{item.administrador_nombre || 'Sin asignar'}</p><p className="text-xs text-slate-500">{item.administrador_email || '—'}</p></td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 text-sm"><Building2 size={15}/>{item.total_departamentos}</span></td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 text-sm"><Users size={15}/>{item.total_residentes}</span></td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.estatus === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.estatus}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => void openAccounts(item)} className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold"><KeyRound size={14}/>Cuentas</button><button disabled={!!working} onClick={() => void changeStatus(item)} className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${item.estatus === 'ACTIVO' ? 'bg-rose-600' : 'bg-emerald-600'}`}>{working === item.id ? 'Procesando…' : item.estatus === 'ACTIVO' ? 'Suspender' : 'Reactivar'}</button></div></td></tr>)}</tbody></table>{!items.length && <div className="py-16 text-center text-sm text-slate-500">No hay condominios registrados.</div>}</div>}</section>
    </div>

    {showCreate && <CreateCondominiumDialog value={newCondo} showPassword={showCreatePassword} working={working === 'create-condominium'} onChange={setNewCondo} onShowPassword={() => setShowCreatePassword((value) => !value)} onClose={closeCreate} onSubmit={submitCreate}/>} 

    {selectedCondo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.currentTarget === e.target) setSelectedCondo(null); }}><section role="dialog" aria-modal="true" className="max-h-[88dvh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><header className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-5"><div><h3 className="text-xl font-bold">Cuentas de {selectedCondo.nombre}</h3><p className="text-sm text-slate-500">Restablece contraseñas únicamente cuando el titular lo solicite.</p></div><button onClick={() => setSelectedCondo(null)} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Cerrar"><X/></button></header><div className="space-y-3 p-6">{accountsLoading ? <Loading text="Cargando cuentas…"/> : accounts.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"><div><div className="flex items-center gap-2"><b>{account.nombre}</b><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${account.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{account.activo ? 'ACTIVO' : 'INACTIVO'}</span></div><p className="text-sm text-slate-500">{account.email} · {account.rol}</p></div><button onClick={() => setResetTarget(account)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"><KeyRound size={15}/>Restablecer contraseña</button></div>)}{!accountsLoading && !accounts.length && <p className="py-10 text-center text-sm text-slate-500">Este condominio no tiene cuentas administrativas.</p>}</div></section></div>}

    {resetTarget && <PasswordDialog target={resetTarget} password={password} confirmation={confirmation} show={showPassword} working={!!working} onPassword={setPassword} onConfirmation={setConfirmation} onShow={() => setShowPassword((value) => !value)} onClose={closeReset} onSubmit={submitReset}/>} 
  </main>;
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) { return <div className="rounded-2xl border bg-white p-5 text-indigo-600">{icon}<p className="mt-3 text-2xl font-bold text-slate-950">{value}</p><p className="text-xs text-slate-500">{label}</p></div>; }
function Loading({ text }: { text: string }) { return <div className="flex min-h-48 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin"/>{text}</div>; }
function CreateCondominiumDialog({ value, showPassword, working, onChange, onShowPassword, onClose, onSubmit }: { value: NewCondominium; showPassword: boolean; working: boolean; onChange: (value: NewCondominium) => void; onShowPassword: () => void; onClose: () => void; onSubmit: () => void }) {
  const field = (key: keyof NewCondominium, next: string) => onChange({ ...value, [key]: next });
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-5"><div><div className="mb-3 inline-flex rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><Building2/></div><h3 className="text-xl font-bold">Registrar nueva privada</h3><p className="mt-1 text-sm text-slate-500">Crea el condominio y la cuenta inicial de su Presidente.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Cerrar"><X/></button></header><div className="space-y-6 p-6"><section><h4 className="font-bold text-slate-900">Datos de la privada</h4><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-sm font-semibold">Nombre de la privada</span><input autoFocus value={value.nombre} onChange={(e) => field('nombre', e.target.value)} maxLength={100} placeholder="Ej. Privada Los Olivos" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" required/></label><label><span className="text-sm font-semibold">Cuota mensual</span><input type="number" min="0.01" max="1000000" step="0.01" value={value.monto_cuota} onChange={(e) => field('monto_cuota', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" required/></label><label><span className="text-sm font-semibold">Día de corte</span><input type="number" min="1" max="28" step="1" value={value.dia_corte} onChange={(e) => field('dia_corte', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" required/></label></div><p className="mt-2 text-xs text-slate-500">Los departamentos se registran después desde Configuración para respetar su numeración real.</p></section><section className="border-t border-slate-100 pt-5"><div className="flex items-center gap-2"><UserRound className="text-indigo-600" size={20}/><h4 className="font-bold text-slate-900">Cuenta inicial del Presidente</h4></div><div className="mt-3 grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-semibold">Nombre completo</span><input value={value.presidente_nombre} onChange={(e) => field('presidente_nombre', e.target.value)} maxLength={120} autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" required/></label><label><span className="text-sm font-semibold">Correo electrónico</span><input type="email" value={value.presidente_email} onChange={(e) => field('presidente_email', e.target.value)} maxLength={254} autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" required/></label><label><span className="text-sm font-semibold">Contraseña temporal</span><div className="relative mt-2"><input type={showPassword ? 'text' : 'password'} value={value.password} onChange={(e) => field('password', e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" className="w-full rounded-xl border border-slate-200 px-3 py-3 pr-11" required/><button type="button" onClick={onShowPassword} className="absolute right-3 top-3 text-slate-400" aria-label="Mostrar u ocultar contraseña">{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></label><label><span className="text-sm font-semibold">Confirmar contraseña</span><input type={showPassword ? 'text' : 'password'} value={value.confirmation} onChange={(e) => field('confirmation', e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" required/></label></div><p className="mt-2 text-xs text-slate-500">Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo.</p></section><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} disabled={working} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Cancelar</button><button disabled={working} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{working ? <Loader2 size={16} className="animate-spin"/> : <Plus size={17}/>}Crear privada y Presidente</button></div></div></form></div>;
}
function PasswordDialog({ target, password, confirmation, show, working, onPassword, onConfirmation, onShow, onClose, onSubmit }: { target: AdministratorAccount; password: string; confirmation: string; show: boolean; working: boolean; onPassword: (value: string) => void; onConfirmation: (value: string) => void; onShow: () => void; onClose: () => void; onSubmit: () => void }) {
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4"><form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="mb-3 inline-flex rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><KeyRound/></div><h3 className="text-xl font-bold">Nueva contraseña</h3><p className="mt-1 text-sm text-slate-500">{target.nombre} · {target.email}</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100"><X/></button></div><label className="mt-5 block text-sm font-semibold">Contraseña nueva</label><div className="relative mt-2"><input autoFocus type={show ? 'text' : 'password'} value={password} onChange={(e) => onPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" className="w-full rounded-xl border px-3 py-3 pr-11" required/><button type="button" onClick={onShow} className="absolute right-3 top-3 text-slate-400" aria-label="Mostrar u ocultar contraseña">{show ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div><label className="mt-4 block text-sm font-semibold">Confirmar contraseña</label><input type={show ? 'text' : 'password'} value={confirmation} onChange={(e) => onConfirmation(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" className="mt-2 w-full rounded-xl border px-3 py-3" required/><p className="mt-3 text-xs text-slate-500">Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo.</p><button disabled={working} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{working ? <Loader2 size={16} className="animate-spin"/> : <KeyRound size={16}/>}Guardar nueva contraseña</button></form></div>;
}
