export interface Usuario {
    id: string;
    nombre: string;
    telefono_whatsapp: string;
    depto_id: string;
    numero_depto: string;
    condominio_id: string;
}

export interface Cargo {
    id: string;
    depto_id: string;
    monto: number;
    estado: 'PENDIENTE' | 'PAGADO';
    descripcion?: string;
    creado_en: Date;
}
