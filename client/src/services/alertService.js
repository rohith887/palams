import axiosInstance from '../utils/axiosInstance';

const alertService = {
  getAlerts: (params = {}) =>
    axiosInstance.get('/v1/alerts', { params }),

  acknowledgeAlert: (alertId) =>
    axiosInstance.patch(`/v1/alerts/${alertId}/acknowledge`),

  assignAlert: (alertId, assigneeId) =>
    axiosInstance.patch(`/v1/alerts/${alertId}/assign`, { assigneeId }),

  resolveAlert: (alertId) =>
    axiosInstance.patch(`/v1/alerts/${alertId}/resolve`),

  getSeverityCounts: () =>
    axiosInstance.get('/v1/alerts/counts'),
};

export default alertService;