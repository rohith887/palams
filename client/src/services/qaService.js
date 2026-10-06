import axiosInstance from '../utils/axiosInstance';

const qaService = {
  getDashboard: () =>
    axiosInstance.get('/v1/qa/dashboard'),

  getQueue: (params) =>
    axiosInstance.get('/v1/qa/queue', { params }),

  getWorkspace: (binId) =>
    axiosInstance.get(`/v1/qa/workspace/${binId}`),

  startQA: (data) =>
    axiosInstance.post('/v1/qa/start', data),

  completeQA: (data) =>
    axiosInstance.post('/v1/qa/complete', data),
};

export default qaService;