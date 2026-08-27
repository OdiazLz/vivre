import api from '../../../api';

export const assembliesApi = {
  list: () => api.get('/api/asambleas'),
  detail: (id: string) => api.get(`/api/asambleas/${id}`),
  create: (payload: unknown) => api.post('/api/asambleas', payload),
  setStatus: (id: string, estatus: 'ABIERTA' | 'CERRADA' | 'CANCELADA') => api.patch(`/api/asambleas/${id}/estatus`, { estatus }),
};
