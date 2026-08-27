import api from '../../../api';
export const incidentsApi={list:()=>api.get('/api/incidencias'),residents:()=>api.get('/api/usuarios'),resolve:(id:string)=>api.patch(`/api/incidencias/${id}/estatus`,{estatus:'RESUELTO'}),create:(payload:unknown)=>api.post('/api/incidencias',payload),remove:(id:string)=>api.delete(`/api/incidencias/${id}`)};
