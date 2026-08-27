export type EstadoPago = 'PENDIENTE_REVISION' | 'APROBADO' | 'RECHAZADO';

export interface IPago {
    id: string,
    cargo_id?: string | null;
    depto_id: string;
    monto: number;
    comprobante_url: string;
    estatus: EstadoPago;
    creado_en: Date;
}

export interface CreatePaymentDTO {
    depto_id: string;
    comprobante_url: string;
    monto?: number;
    cargo_id?: string | null;
}

export interface UpdatePaymentStatusDTO {
    estatus: EstadoPago;
    monto_aprobado?: number;
    motivo_rechazo?: string;
}