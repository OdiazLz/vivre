import api from '../../../api';

export const broadcastsApi = {
  list: () => api.get('/api/avisos/comunicados'),
  remove: (id: string) => api.delete(`/api/avisos/comunicados/${id}`),
  send: (payload: unknown) => api.post('/api/avisos/masivos', payload),
};
