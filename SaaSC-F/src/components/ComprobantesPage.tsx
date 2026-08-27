import { useState } from 'react';
import { Eye, Download, Banknote, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi } from '../features/payments/api/paymentsApi';
import type { PaymentProof } from '../types/domain';

interface ComprobantesPageProps {
  pagos: PaymentProof[];
  onSelectPago: (pago: PaymentProof) => void;
  onRefresh: () => void;
  isFetching: boolean;
  role: string;
}

interface CashResident { usuario_id:string; nombre:string; depto_id:string; numero_depto:string; cargos:Array<{id:string;concepto:string;periodo:string;monto:string}> }
interface CashRecipient { id:string; nombre:string; rol:string }

export default function ComprobantesPage({ pagos, onSelectPago, onRefresh, isFetching, role }: ComprobantesPageProps) {
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTE_REVISION' | 'APROBADO' | 'RECHAZADO'>('TODOS');
  const [cashOpen,setCashOpen]=useState(false); const [cashLoading,setCashLoading]=useState(false);
  const [residents,setResidents]=useState<CashResident[]>([]); const [recipients,setRecipients]=useState<CashRecipient[]>([]);
  const [cash,setCash]=useState({residentKey:'',cargo_id:'',recibido_por:'',fecha_pago:new Date().toISOString().slice(0,10),notas:''});
  const canRegisterCash=['ADMINISTRADOR','PRESIDENTE','TESORERO'].includes(role);
  const selectedResident=residents.find((item)=>`${item.usuario_id}:${item.depto_id}`===cash.residentKey);
  const selectedCharge=selectedResident?.cargos.find((item)=>item.id===cash.cargo_id);
  const openCash=async()=>{setCashLoading(true);try{const data=await paymentsApi.cashOptions();setResidents(data.residentes);setRecipients(data.receptores);setCash((current)=>({...current,recibido_por:data.receptores[0]?.id||''}));setCashOpen(true);}catch{toast.error('No se pudieron cargar los cargos pendientes.');}finally{setCashLoading(false);}};
  const submitCash=async(e:React.FormEvent)=>{e.preventDefault();if(!selectedResident)return;setCashLoading(true);try{const data=await paymentsApi.registerCash({usuario_id:selectedResident.usuario_id,depto_id:selectedResident.depto_id,cargo_id:cash.cargo_id,recibido_por:cash.recibido_por,fecha_pago:cash.fecha_pago,notas:cash.notas});if(data.notificado)toast.success('Pago registrado y residente notificado.');else toast('Pago registrado; WhatsApp no pudo entregar la notificación.',{icon:'⚠️'});setCashOpen(false);setCash({...cash,residentKey:'',cargo_id:'',notas:''});onRefresh();}catch{toast.error('El cargo ya fue pagado o los datos cambiaron.');}finally{setCashLoading(false);}};
  const comprobantes = pagos
    .filter((pago) => statusFilter === 'TODOS' || pago.estatus === statusFilter)
    .map((pago) => ({
    depto: pago.numero_depto,
    residente: pago.usuario_nombre,
    monto: pago.monto || "$510",
    fecha: new Date(pago.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    estado: pago.estatus === 'PENDIENTE_REVISION' ? 'Pendiente' : pago.estatus === 'APROBADO' ? 'Revisado' : 'Rechazado',
    pago_id: pago.pago_id,
    comprobante_url: pago.comprobante_url,
    metodo_pago: pago.metodo_pago,
    receptor_nombre: pago.receptor_nombre,
    originalPago: pago,
  }));

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return { bg: '#fffbeb', color: '#d97706' };
      case 'Revisado':
        return { bg: '#ecfdf5', color: '#10b981' };
      case 'Rechazado':
        return { bg: '#fef2f2', color: '#ef4444' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  return (
    <div className="min-w-0 max-w-full space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Comprobantes de Pago
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona y revisa todos los comprobantes de pago
          </p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
          {canRegisterCash && <button disabled={cashLoading} onClick={()=>void openCash()} className="col-span-2 flex min-w-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:col-span-1 sm:px-4 sm:py-2"><Banknote size={16} className="shrink-0"/><span>{cashLoading?'Cargando…':'Registrar efectivo'}</span></button>}
          <button
            onClick={onRefresh}
            className="flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 sm:px-4 sm:py-2"
            style={{ background: 'linear-gradient(135deg, #4f6ef7, #4338ca)' }}
          >
            <Eye size={16} className={isFetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition-all hover:bg-muted sm:px-4 sm:py-2">
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">{pagos.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pagos.filter(p => p.estatus === 'PENDIENTE_REVISION').length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Aprobados</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{pagos.filter(p => p.estatus === 'APROBADO').length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Rechazados</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{pagos.filter(p => p.estatus === 'RECHAZADO').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex min-w-0 items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="w-full min-w-0 rounded-xl border border-gray-200 bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-auto"
          aria-label="Filtrar comprobantes por estatus"
        >
          <option value="TODOS">Todos los estatus</option>
          <option value="PENDIENTE_REVISION">Pendientes</option>
          <option value="APROBADO">Aprobados</option>
          <option value="RECHAZADO">Rechazados</option>
        </select>
      </div>

      {/* Table */}
      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border bg-card">
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Departamento", "Residente", "Monto", "Fecha", "Estado", "Acciones"].map(
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
              {comprobantes.map((c, i) => {
                const badge = getEstadoBadge(c.estado);
                return (
                  <tr key={i} className="transition-colors hover:bg-muted/50 group">
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ background: "#eff2fe", color: "#4f6ef7", fontFamily: "JetBrains Mono, monospace" }}
                      >
                        {c.depto}
                      </span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <span className="text-sm font-medium text-foreground">{c.residente}</span>
                      {c.metodo_pago === 'EFECTIVO' && <span className="mt-1 block text-[11px] font-semibold text-emerald-700">Efectivo · recibió {c.receptor_nombre || 'Comité'}</span>}
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <span className="text-sm font-bold text-green-600" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {c.monto}
                      </span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-sm text-muted-foreground whitespace-nowrap">{c.fecha}</td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <button
                        onClick={() => c.originalPago.estatus === 'PENDIENTE_REVISION' && onSelectPago(c.originalPago)}
                        disabled={c.originalPago.estatus !== 'PENDIENTE_REVISION'}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: "#eff2fe", color: "#4f6ef7" }}
                      >
                        <Eye size={12} />
                        <span className="hidden sm:inline">{c.originalPago.estatus === 'PENDIENTE_REVISION' ? 'Revisar' : c.metodo_pago === 'EFECTIVO' ? 'Efectivo' : 'Registrado'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {comprobantes.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No hay comprobantes registrados</p>
          </div>
        )}
      </div>
      {cashOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(e)=>e.target===e.currentTarget&&setCashOpen(false)}><form onSubmit={submitCash} className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl"><Banknote className="shrink-0 text-emerald-600"/>Registrar pago en efectivo</h2><p className="mt-1 text-sm text-slate-500">El monto se toma del cargo pendiente y quedará aprobado inmediatamente.</p></div><button type="button" onClick={()=>setCashOpen(false)} className="shrink-0 rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 grid gap-4"><label className="text-xs font-bold text-slate-600">Residente y departamento<select required value={cash.residentKey} onChange={(e)=>setCash({...cash,residentKey:e.target.value,cargo_id:''})} className="mt-1 w-full min-w-0 rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Selecciona residente</option>{residents.map((item)=><option key={`${item.usuario_id}:${item.depto_id}`} value={`${item.usuario_id}:${item.depto_id}`}>{item.numero_depto} · {item.nombre}</option>)}</select></label><label className="text-xs font-bold text-slate-600">Cargo que está pagando<select required disabled={!selectedResident} value={cash.cargo_id} onChange={(e)=>setCash({...cash,cargo_id:e.target.value})} className="mt-1 w-full min-w-0 rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Selecciona cargo pendiente</option>{selectedResident?.cargos.map((item)=><option key={item.id} value={item.id}>{item.periodo} · {item.concepto} · ${Number(item.monto).toLocaleString('es-MX',{minimumFractionDigits:2})}</option>)}</select></label>{selectedResident&&!selectedResident.cargos.length&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Este departamento no tiene cargos pendientes.</p>}<div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Recibió el efectivo<select required value={cash.recibido_por} onChange={(e)=>setCash({...cash,recibido_por:e.target.value})} className="mt-1 w-full min-w-0 rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Selecciona integrante</option>{recipients.map((item)=><option key={item.id} value={item.id}>{item.nombre} · {item.rol}</option>)}</select></label><label className="text-xs font-bold text-slate-600">Fecha del pago<input required type="date" max={new Date().toISOString().slice(0,10)} value={cash.fecha_pago} onChange={(e)=>setCash({...cash,fecha_pago:e.target.value})} className="mt-1 w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm"/></label></div><label className="text-xs font-bold text-slate-600">Notas opcionales<textarea maxLength={300} rows={2} value={cash.notas} onChange={(e)=>setCash({...cash,notas:e.target.value})} className="mt-1 w-full resize-none rounded-xl border px-3 py-2.5 text-sm" placeholder="Ej. Recibido durante reunión del comité"/></label>{selectedCharge&&<div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold uppercase text-emerald-700">Monto a registrar</p><p className="text-xl font-bold text-emerald-800 sm:text-2xl">${Number(selectedCharge.monto).toLocaleString('es-MX',{minimumFractionDigits:2})} MXN</p></div>}</div><div className="mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={()=>setCashOpen(false)} className="w-full rounded-xl border px-4 py-2.5 text-sm font-semibold sm:w-auto sm:py-2">Cancelar</button><button disabled={cashLoading||!selectedCharge} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:w-auto sm:py-2">{cashLoading&&<Loader2 size={15} className="animate-spin"/>}Confirmar y notificar</button></div></form></div>}
    </div>
  );
}
