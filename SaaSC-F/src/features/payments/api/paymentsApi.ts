import api from '../../../api';
import type { PaymentProof,PaymentSummary } from '../../../types/domain';
export interface CashPaymentOptions { residentes:Array<{usuario_id:string;nombre:string;depto_id:string;numero_depto:string;cargos:Array<{id:string;concepto:string;periodo:string;monto:string}>}>; receptores:Array<{id:string;nombre:string;rol:string}> }
export const paymentsApi={
  async summary(){return(await api.get<PaymentSummary>('/api/pagos/resumen')).data;},
  async pending(){return(await api.get<PaymentProof[]>('/api/pagos/pending')).data;},
  async review(id:string,payload:{pago_id:string;estatus:'APROBADO';monto_aprobado:number}|{pago_id:string;estatus:'RECHAZADO';motivo_rechazo:string}){return(await api.post(`/api/pagos/${id}/revision`,payload)).data;},
  async cashOptions(){return(await api.get<CashPaymentOptions>('/api/pagos/efectivo/opciones')).data;},
  async registerCash(payload:{usuario_id:string;depto_id:string;cargo_id:string;recibido_por:string;fecha_pago:string;notas:string}){return(await api.post<{notificado:boolean}>('/api/pagos/efectivo',payload)).data;},
};
