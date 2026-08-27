export const ADMIN_ROLES = ['SUPERADMIN','ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL','SEGURIDAD','MANTENIMIENTO'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];
export const ASSIGNABLE_ADMIN_ROLES = ['PRESIDENTE','SECRETARIO','TESORERO','VOCAL','SEGURIDAD','MANTENIMIENTO'] as const;
export type AssignableAdminRole = typeof ASSIGNABLE_ADMIN_ROLES[number];
export const PRESIDENT_ASSIGNABLE_ADMIN_ROLES = ['SECRETARIO','TESORERO','VOCAL','SEGURIDAD','MANTENIMIENTO'] as const;
export interface AuthenticatedUser { nombre:string; email:string; rol:AdminRole; condominio_estatus?:'ACTIVO'|'SUSPENDIDO'|null }
export interface RegulationArticle { id:string; codigo:string; nombre:string; etiqueta:string; descripcion?:string|null; orden:number }
export type RegulationStatus = 'BORRADOR'|'VIGENTE'|'DEROGADO';
export interface RegulationClause { id?:string; codigo:string|null; texto:string; orden?:number }
export interface RegulationDocumentArticle { id?:string; codigo:string; titulo:string; orden?:number; clausulas:RegulationClause[] }
export interface RegulationDocument {
  id:string; nombre:string; version:number; estatus:RegulationStatus; vigente_desde?:string|null; vigente_hasta?:string|null;
  documento_key?:string|null; documento_nombre?:string|null; creado_en?:string; actualizado_en?:string; publicado_en?:string|null;
  total_articulos?:number; total_clausulas?:number; articulos:RegulationDocumentArticle[];
}
export interface PaymentProof { pago_id:string; usuario_nombre:string; numero_depto:string; comprobante_url:string; creado_en:string; estatus:string; monto?:string; metodo_pago?:string; receptor_nombre?:string; fecha_pago?:string }
export interface PaymentSummary { total:number; pendientes:number; aprobados:number; rechazados:number; monto_aprobado:string }
export interface DepartmentOption { id:string; numero_depto:string }
export interface Resident { id:string;depto_id:string;nombre:string;numero_depto:string;telefono_whatsapp:string;estatus?:string;activo?:boolean;acceso_porton?:boolean;creado_en:string }
export interface ResidentInput { nombre:string;depto_id:string;numero_depto:string;telefono_whatsapp:string;activo:boolean }
export interface Fine { id:string;numero_depto:string;articulo_reglamento:string;motivo:string;monto:number;evidencia_url?:string;estatus:'PENDIENTE'|'PAGADA';creado_en:string }
