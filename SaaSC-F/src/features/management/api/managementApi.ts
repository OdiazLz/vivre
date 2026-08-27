import api from '../../../api';

export const managementApi = {
  financialState: () => api.get('/api/gestion/finanzas/estado'),
  analytics: () => api.get('/api/gestion/analitica'),
  audit: () => api.get('/api/gestion/auditoria'),
  administrators: () => api.get('/api/gestion/administradores'),
  exportReport: (moduleName: string) => api.get(`/api/gestion/exportar/${moduleName}`, { responseType: 'blob' }),
  createExpense: (payload: unknown) => api.post('/api/gestion/gastos', payload),
  resetPassword: (id: string, password: string) => api.patch(`/api/gestion/administradores/${id}/password`, { password }),
  generateCharges: () => api.post('/api/gestion/cuotas/generar', {}),
  publishFinancialState: () => api.post('/api/gestion/finanzas/publicar', {}),
  createAdministrator: (payload: unknown) => api.post('/api/gestion/administradores', payload),
  setAdministratorRole: (id: string, rol: string) => api.patch(`/api/gestion/administradores/${id}/rol`, { rol }),
  setAdministratorActive: (id: string, activo: boolean) => api.patch(`/api/gestion/administradores/${id}/activo`, { activo }),
  createBackup: () => api.post('/api/gestion/respaldos'),
};
