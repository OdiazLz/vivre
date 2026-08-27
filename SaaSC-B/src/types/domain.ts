export const ADMIN_ROLES = ['SUPERADMIN','ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL','SEGURIDAD','MANTENIMIENTO'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];
export const ASSIGNABLE_ADMIN_ROLES = ['PRESIDENTE','SECRETARIO','TESORERO','VOCAL','SEGURIDAD','MANTENIMIENTO'] as const;
export type AssignableAdminRole = typeof ASSIGNABLE_ADMIN_ROLES[number];
export const PRESIDENT_ASSIGNABLE_ADMIN_ROLES = ['SECRETARIO','TESORERO','VOCAL','SEGURIDAD','MANTENIMIENTO'] as const;
export const CONDOMINIUM_STATUSES = ['ACTIVO','SUSPENDIDO'] as const;
export type CondominiumStatus = typeof CONDOMINIUM_STATUSES[number];
export interface RegulationArticle { id:string; codigo:string; nombre:string; etiqueta:string; descripcion:string|null; orden:number }
export type RegulationStatus = 'BORRADOR'|'VIGENTE'|'DEROGADO';
