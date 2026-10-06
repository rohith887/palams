import axiosInstance from '../utils/axiosInstance';

const systemLogService = {
  getLogs: (params = {}) =>
    axiosInstance.get('/v1/logs', { params }),

  downloadLogs: (params = {}) =>
    axiosInstance.get('/v1/logs/download', { params, responseType: 'blob' }),

  getModules: () =>
    axiosInstance.get('/v1/logs/modules'),

  getActions: () =>
    axiosInstance.get('/v1/logs/actions'),

  getLevels: () =>
    axiosInstance.get('/v1/logs/levels'),
};

export default systemLogService;
