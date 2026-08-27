export type EstatusCargo = 'PENDIENTE' | 'PAGADO' | 'CANCELADO';

export interface ICargo {
  id: string;
  depto_id: string;
  concepto: string;
  monto: number;
  estatus: EstatusCargo;
  fecha_vencimiento?: Date;
  creado_en: Date;
}