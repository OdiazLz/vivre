import api from '../../../api';

export const visitsApi = {
  list: () => api.get('/api/visitas'),
  releaseReservation: (id: string) => api.post(`/api/cajones/reservas/${id}/liberar`),
  finishVisit: (id: string) => api.patch(`/api/visitas/${id}/salida`),
};
