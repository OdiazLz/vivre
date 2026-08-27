import api from '../../../api';

export const registrationApi = {
  invitations: () => api.get('/api/registro/invitaciones'),
  requests: () => api.get('/api/registro/solicitudes'),
  createInvitation: (payload: unknown) => api.post('/api/registro/invitaciones', payload),
  review: (id: string, approve: boolean, motivo = '') => api.post(`/api/registro/solicitudes/${id}/${approve ? 'aprobar' : 'rechazar'}`, approve ? {} : { motivo }),
  deactivateInvitation: (id: string) => api.delete(`/api/registro/invitaciones/${id}`),
};
