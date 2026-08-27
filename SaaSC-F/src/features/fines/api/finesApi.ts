import api from '../../../api';
import type { DepartmentOption,Fine } from '../../../types/domain';
export interface FineInput { depto_id:string;articulo_reglamento:string;motivo:string;monto:number;evidencia_url:string }
export const finesApi={async list(){return(await api.get<Fine[]>('/api/multas')).data;},async departments(){return(await api.get<DepartmentOption[]>('/api/departamentos')).data;},async create(input:FineInput){return(await api.post('/api/multas',input)).data;},async markPaid(id:string){return(await api.patch(`/api/multas/${id}/pagar`)).data;}};
