import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 15000
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 significa sesión ausente/expirada. Un 403 sólo indica que el rol
    // autenticado no tiene permiso y no debe cerrar toda la sesión.
    if (error.response?.status === 401) {
      const hadSession = Boolean(localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token'));
      localStorage.removeItem('saas_token');
      sessionStorage.removeItem('saas_token');
      if (hadSession) window.dispatchEvent(new Event('saas:unauthorized'));
    }
    if (error.response?.status === 403 && error.response?.data?.error === 'CONDOMINIO_SUSPENDIDO') {
      window.dispatchEvent(new Event('saas:condominio-suspendido'));
    }
    return Promise.reject(error);
  }
);

// Inyectar el Token en cada petición HTTP
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
