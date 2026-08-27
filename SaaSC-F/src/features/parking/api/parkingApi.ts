import api from '../../../api';
export const parkingApi={monitor:()=>api.get('/api/cajones/monitor'),releaseReservation:(id:string)=>api.post(`/api/cajones/reservas/${id}/liberar`),finishVisit:(id:string)=>api.patch(`/api/visitas/${id}/salida`)};
