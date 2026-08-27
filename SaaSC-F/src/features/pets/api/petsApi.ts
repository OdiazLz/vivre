import api from '../../../api';
export const petsApi={list:()=>api.get('/api/mascotas'),residents:()=>api.get('/api/usuarios'),create:(payload:unknown)=>api.post('/api/mascotas',payload),remove:(id:string)=>api.delete(`/api/mascotas/${id}`)};
