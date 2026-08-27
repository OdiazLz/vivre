import { useCallback, useEffect, useState } from 'react';
import { Archive, Banknote, Download, Eye, EyeOff, KeyRound, Loader2, ParkingSquare, Power, RefreshCw, ShieldCheck, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { managementApi } from '../features/management/api/managementApi';
import { uploadFile } from '../shared/api/filesApi';
import FileDropzone from './FileDropzone';
import { ASSIGNABLE_ADMIN_ROLES, PRESIDENT_ASSIGNABLE_ADMIN_ROLES, type AdminRole } from '../types/domain';

interface FinancialState { periodo: string; ingresos: string; gastos: string; fondo_disponible: string; morosidad: string; departamentos_corriente: string; total_departamentos: string }
interface Analytics { estacionamiento: { estatus: string; total: number }[]; reincidencias: { articulo: string; incidencias: number; monto: string }[]; reincidentes?: { numero_depto: string; total_multas: number; articulos: string }[] }
interface Audit { id: string; administrador_email: string; rol: string; accion: string; modulo: string; recurso: string; creado_en: string }
interface Administrator { id: string; nombre: string; email: string; rol: AdminRole; activo: boolean; ultimo_acceso?: string | null }
const ASSIGNABLE_ROLES = ASSIGNABLE_ADMIN_ROLES;

export default function GestionPage({ role }: { role: AdminRole }) {
  const [state, setState] = useState<FinancialState | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({ estacionamiento: [], reincidencias: [] });
  const [audit, setAudit] = useState<Audit[]>([]);
  const [admins, setAdmins] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [expense, setExpense] = useState({ categoria: 'MANTENIMIENTO', concepto: '', monto: '' });
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [account, setAccount] = useState({ nombre: '', email: '', password: '', rol: 'VOCAL' as AdminRole });
  const [resetTarget, setResetTarget] = useState<Administrator | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests: Promise<unknown>[] = [
        managementApi.financialState().then((r) => setState(r.data)),
        managementApi.analytics().then((r) => setAnalytics(r.data)),
      ];
      if (['ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'].includes(role)) {
        requests.push(managementApi.audit().then((r) => setAudit(r.data)));
      }
      if (['ADMINISTRADOR', 'PRESIDENTE'].includes(role)) {
        requests.push(managementApi.administrators().then((r) => setAdmins(r.data)));
      }
      await Promise.all(requests);
    } catch { toast.error('No se pudo cargar la información gerencial.'); }
    finally { setLoading(false); }
  }, [role]);

  useEffect(() => { void load(); }, [load]);

  const action = async (key: string, request: () => Promise<unknown>, message: string) => {
    setWorking(key);
    try { await request(); toast.success(message); await load(); }
    catch { toast.error('No fue posible completar la operación.'); }
    finally { setWorking(''); }
  };

  const exportReport = async (moduleName: string) => {
    try {
      const response = await managementApi.exportReport(moduleName);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `${moduleName}-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('No se pudo exportar el reporte.'); }
  };

  const createExpense = async () => {
    let comprobante_url: string | null = null;
    if (expenseFile) {
      comprobante_url = await uploadFile(expenseFile, 'gastos');
    }
    await managementApi.createExpense({ ...expense, monto: Number(expense.monto), comprobante_url });
    setExpense({ categoria: 'MANTENIMIENTO', concepto: '', monto: '' });
    setExpenseFile(null);
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin" /> Cargando gestión…</div>;
  const parkingTotal = analytics.estacionamiento.reduce((sum, item) => sum + Number(item.total), 0);
  const canManageFinances = ['ADMINISTRADOR', 'PRESIDENTE', 'TESORERO'].includes(role);
  const isAdministrator = role === 'ADMINISTRADOR';
  const canViewAccounts = ['ADMINISTRADOR', 'PRESIDENTE'].includes(role);
  const canCreateAccounts = ['ADMINISTRADOR', 'PRESIDENTE'].includes(role);
  const createAccountRoles = isAdministrator ? ASSIGNABLE_ADMIN_ROLES : PRESIDENT_ASSIGNABLE_ADMIN_ROLES;
  const canExportAll = ['ADMINISTRADOR', 'PRESIDENTE'].includes(role);
  const canCreateBackups = ['ADMINISTRADOR', 'PRESIDENTE'].includes(role);
  const canResetAccount = (target: Administrator) => target.activo && (isAdministrator
    ? ['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VOCAL', 'SEGURIDAD', 'MANTENIMIENTO'].includes(target.rol)
    : ['SECRETARIO', 'TESORERO', 'VOCAL', 'SEGURIDAD', 'MANTENIMIENTO'].includes(target.rol));
  const closeReset = () => { setResetTarget(null); setResetPassword(''); setResetConfirmation(''); setShowResetPassword(false); };
  const submitReset = async () => {
    if (!resetTarget) return;
    if (resetPassword !== resetConfirmation) return toast.error('Las contraseñas no coinciden.');
    setWorking(`password-${resetTarget.id}`);
    try {
      await managementApi.resetPassword(resetTarget.id, resetPassword);
      toast.success(`Contraseña de ${resetTarget.nombre} restablecida.`); closeReset();
    } catch (error) {
      const candidate = error as { response?: { data?: { error?: string } } };
      toast.error(candidate.response?.data?.error || 'No fue posible restablecer la contraseña.');
    } finally { setWorking(''); }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Gestión gerencial</h1><p className="text-sm text-slate-500">Finanzas, operación, auditoría y respaldos del condominio.</p></div>
      <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"><RefreshCw size={16}/>Actualizar</button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: 'Ingresos del periodo', value: `$${Number(state?.ingresos || 0).toLocaleString('es-MX')}`, Icon: Banknote, color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Gastos del periodo', value: `$${Number(state?.gastos || 0).toLocaleString('es-MX')}`, Icon: Banknote, color: 'text-rose-600 bg-rose-50' },
        { label: 'Fondo disponible', value: `$${Number(state?.fondo_disponible || 0).toLocaleString('es-MX')}`, Icon: Archive, color: 'text-indigo-600 bg-indigo-50' },
        { label: 'Cajones configurados', value: String(parkingTotal), Icon: ParkingSquare, color: 'text-amber-600 bg-amber-50' },
      ].map(({ label, value, Icon, color }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`mb-4 inline-flex rounded-xl p-2.5 ${color}`}><Icon size={20}/></div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>)}
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Estado financiero {state?.periodo}</h2>
        <p className="mt-1 text-sm text-slate-500">Al publicar, los residentes podrán consultar únicamente cifras generales por WhatsApp.</p>
        <div className="my-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3">Morosidad<br/><b>${Number(state?.morosidad || 0).toLocaleString('es-MX')}</b></div><div className="rounded-xl bg-slate-50 p-3">Al corriente<br/><b>{state?.departamentos_corriente || 0} / {state?.total_departamentos || 0}</b></div></div>
        {canManageFinances && <><div className="flex flex-wrap gap-2"><button onClick={() => void action('charges', () => managementApi.generateCharges(), 'Cuotas mensuales generadas.')} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" disabled={!!working}>{working === 'charges' ? 'Generando…' : 'Generar cuotas del mes'}</button><button onClick={() => void action('publish', () => managementApi.publishFinancialState(), 'Estado general publicado en WhatsApp.')} className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700" disabled={!!working}>{working === 'publish' ? 'Publicando…' : 'Publicar estado general'}</button></div>
        <form className="mt-5 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4" onSubmit={(event) => { event.preventDefault(); void action('expense', createExpense, 'Gasto registrado.'); }}>
          <select value={expense.categoria} onChange={(e) => setExpense({ ...expense, categoria: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option>MANTENIMIENTO</option><option>SEGURIDAD</option><option>SERVICIOS</option><option>LIMPIEZA</option><option>OTRO</option></select>
          <input value={expense.concepto} onChange={(e) => setExpense({ ...expense, concepto: e.target.value })} placeholder="Concepto del gasto" className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2" required />
          <div className="flex gap-2"><input value={expense.monto} onChange={(e) => setExpense({ ...expense, monto: e.target.value })} type="number" min="0.01" step="0.01" placeholder="$ Monto" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" required/><button disabled={!!working} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Agregar</button></div>
          <div className="sm:col-span-4"><FileDropzone file={expenseFile} onChange={setExpenseFile} accept="image/jpeg,image/png,image/webp,application/pdf" label="Arrastra el comprobante del gasto (opcional)" /></div>
        </form></>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Ocupación y reincidencias</h2>
        <div className="mt-4 flex flex-wrap gap-2">{analytics.estacionamiento.map((item) => <span key={item.estatus} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold">{item.estatus}: {item.total}</span>)}</div>
        <div className="mt-4 space-y-2">{analytics.reincidencias.slice(0, 5).map((item) => <div key={item.articulo} className="flex justify-between rounded-xl border border-slate-100 p-3 text-sm"><span>{item.articulo}</span><b>{item.incidencias} multas · ${Number(item.monto).toLocaleString('es-MX')}</b></div>)}</div>
        {!!analytics.reincidentes?.length && <div className="mt-4 border-t border-slate-100 pt-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Departamentos reincidentes</p>{analytics.reincidentes.map((item) => <div key={item.numero_depto} className="mb-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><b>Depto. {item.numero_depto}: {item.total_multas} multas</b><p className="mt-1 text-xs">{item.articulos}</p></div>)}</div>}
      </section>
    </div>

    {canManageFinances && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Reportes para Excel</h2><div className="mt-4 flex flex-wrap gap-2">{(canExportAll ? ['residentes','pagos','multas','visitas','auditoria'] : ['pagos','multas']).map((name) => <button key={name} onClick={() => void exportReport(name)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold capitalize"><Download size={15}/>{name}</button>)}</div></section>}

    {canViewAccounts &&
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Cuentas del comité y personal</h2><p className="text-sm text-slate-500">{isAdministrator ? 'Puedes crear cuentas, administrar permisos y atender solicitudes de contraseña.' : 'Puedes crear cuentas subordinadas del comité y restablecer sus contraseñas. Los roles protegidos requieren al Administrador.'}</p></div><ShieldCheck className="text-indigo-600"/></div>
        {canCreateAccounts && <form className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={(event) => { event.preventDefault(); void action('create-account', () => managementApi.createAdministrator(account).then(() => setAccount({ nombre: '', email: '', password: '', rol: 'VOCAL' })), 'Cuenta creada correctamente.'); }}>
          <input value={account.nombre} onChange={(e) => setAccount({ ...account, nombre: e.target.value })} placeholder="Nombre completo" autoComplete="name" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" required />
          <input value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} type="email" placeholder="correo@condominio.mx" autoComplete="email" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" required />
          <input value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} type="password" minLength={12} placeholder="Contraseña segura" autoComplete="new-password" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" required />
          <select value={account.rol} onChange={(e) => setAccount({ ...account, rol: e.target.value as AdminRole })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{createAccountRoles.map((item) => <option key={item}>{item}</option>)}</select>
          <button disabled={!!working} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><UserPlus size={16}/>{working === 'create-account' ? 'Creando…' : 'Crear cuenta'}</button>
          <p className="text-xs text-slate-500 md:col-span-2 xl:col-span-5">La contraseña debe tener al menos 12 caracteres e incluir mayúscula, minúscula, número y símbolo.</p>
        </form>}
        <div className="mt-4 space-y-2">{admins.map((admin) => <div key={admin.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${admin.activo ? 'border-slate-100' : 'border-rose-100 bg-rose-50/50'}`}><div><div className="flex items-center gap-2"><b className="text-sm">{admin.nombre}</b><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${admin.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{admin.activo ? 'ACTIVO' : 'INACTIVO'}</span></div><p className="text-xs text-slate-500">{admin.email} · {admin.rol}{admin.ultimo_acceso ? ` · Último acceso ${new Date(admin.ultimo_acceso).toLocaleString('es-MX')}` : ''}</p></div><div className="flex flex-wrap items-center gap-2">{isAdministrator && admin.rol !== 'ADMINISTRADOR' && <><select value={admin.rol} disabled={!admin.activo || !!working} onChange={(e) => void action(`role-${admin.id}`, () => managementApi.setAdministratorRole(admin.id, e.target.value), 'Rol actualizado.')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">{ASSIGNABLE_ROLES.map((item) => <option key={item}>{item}</option>)}</select><button type="button" disabled={!!working} onClick={() => void action(`active-${admin.id}`, () => managementApi.setAdministratorActive(admin.id, !admin.activo), admin.activo ? 'Cuenta desactivada.' : 'Cuenta reactivada.')} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${admin.activo ? 'bg-rose-50 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}><Power size={14}/>{admin.activo ? 'Desactivar' : 'Reactivar'}</button></>}{canResetAccount(admin) && <button type="button" onClick={() => setResetTarget(admin)} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"><KeyRound size={14}/>Restablecer contraseña</button>}{admin.rol === 'ADMINISTRADOR' && <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">ADMINISTRADOR · PROTEGIDO</span>}</div></div>)}</div>
      </section>
    }
    {['ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'].includes(role) && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Historial de auditoría</h2>{canCreateBackups && <button onClick={() => void action('backup', () => managementApi.createBackup(), 'Respaldo creado correctamente.')} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Crear respaldo</button>}</div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-400"><tr><th className="py-2">Administrador</th><th>Rol</th><th>Acción</th><th>Módulo</th><th>Fecha</th></tr></thead><tbody>{audit.slice(0, 50).map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="py-3">{item.administrador_email}</td><td>{item.rol}</td><td>{item.accion}</td><td>{item.modulo}</td><td>{new Date(item.creado_en).toLocaleString('es-MX')}</td></tr>)}</tbody></table></div></section>}
    {resetTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); void submitReset(); }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="mb-3 inline-flex rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><KeyRound/></div><h3 className="text-xl font-bold">Restablecer contraseña</h3><p className="mt-1 text-sm text-slate-500">{resetTarget.nombre} · {resetTarget.email}</p></div><button type="button" onClick={closeReset} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Cerrar"><X/></button></div><label className="mt-5 block text-sm font-semibold">Contraseña nueva</label><div className="relative mt-2"><input autoFocus type={showResetPassword ? 'text' : 'password'} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" className="w-full rounded-xl border border-slate-200 px-3 py-3 pr-11" required/><button type="button" onClick={() => setShowResetPassword((value) => !value)} className="absolute right-3 top-3 text-slate-400" aria-label="Mostrar u ocultar contraseña">{showResetPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div><label className="mt-4 block text-sm font-semibold">Confirmar contraseña</label><input type={showResetPassword ? 'text' : 'password'} value={resetConfirmation} onChange={(e) => setResetConfirmation(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" required/><p className="mt-3 text-xs text-slate-500">Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo.</p><button disabled={!!working} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{working ? <Loader2 size={16} className="animate-spin"/> : <KeyRound size={16}/>}Guardar nueva contraseña</button></form></div>}
  </div>;
}
