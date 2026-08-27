import { useCallback,useEffect,useState } from 'react';
import type { AdminRole,PaymentProof,PaymentSummary } from '../../../types/domain';
import { paymentsApi } from '../api/paymentsApi';
const EMPTY_SUMMARY:PaymentSummary={total:0,pendientes:0,aprobados:0,rechazados:0,monto_aprobado:'0'};
export function usePayments(role:AdminRole|undefined,enabled:boolean){
  const [payments,setPayments]=useState<PaymentProof[]>([]);const [summary,setSummary]=useState<PaymentSummary>(EMPTY_SUMMARY);const [loading,setLoading]=useState(false);
  const reload=useCallback(async()=>{if(!enabled||!role)return;setLoading(true);try{const canReview=['ADMINISTRADOR','PRESIDENTE','TESORERO'].includes(role);const [nextSummary,nextPayments]=await Promise.all([paymentsApi.summary(),canReview?paymentsApi.pending():Promise.resolve([])]);setSummary(nextSummary);setPayments(nextPayments);}finally{setLoading(false);}},[enabled,role]);
  useEffect(()=>{void reload();},[reload]);
  return{payments,summary,loading,reload,review:paymentsApi.review};
}
