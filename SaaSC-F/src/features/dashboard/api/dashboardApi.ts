import api from '../../../api';

export const dashboardApi = {
  collection: () => api.get('/api/metrics/recaudacion'),
};
