import api from '../../../api';
import type { DepartmentOption,Resident,ResidentInput } from '../../../types/domain';
export const residentsApi={
  async list(){return(await api.get<Resident[]>('/api/usuarios')).data;},async departments(){return(await api.get<DepartmentOption[]>('/api/departamentos')).data;},
  async create(input:ResidentInput){return(await api.post('/api/usuarios',input)).data;},async update(id:string,input:ResidentInput){return(await api.put(`/api/usuarios/${id}`,input)).data;},
  async remove(id:string){return(await api.delete(`/api/usuarios/${id}`)).data;},async setGateAccess(id:string,enabled:boolean){return(await api.patch(`/api/usuarios/${id}/acceso`,{acceso_porton:enabled})).data;},
  async importMany(residentes:Array<{fila:number;nombre:string;numero_depto:string;telefono_whatsapp:string}>,notificar_whatsapp:boolean){return(await api.post<{creados:number;omitidos:number}>('/api/usuarios/importar',{residentes,notificar_whatsapp})).data;},
};
