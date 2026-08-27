import api from '../../../api';

export const authApi = {
  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),
};
