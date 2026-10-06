import axiosInstance from '../utils/axiosInstance';

const dashboardService = {
  getMetrics: () =>
    axiosInstance.get('/v1/dashboard'),

  // Single aggregated call for the Admin Dashboard — replaces the 9+ individual calls
  getAdminDashboard: () =>
    axiosInstance.get('/v1/dashboard/admin'),

  getOperatorPerformance: () =>
    axiosInstance.get('/v1/dashboard/operator-performance'),

  getOperatorDashboard: () =>
    axiosInstance.get('/v1/dashboard/operator'),

  getLiveOperations: () =>
    axiosInstance.get('/v1/dashboard/live-operations'),
};

export default dashboardService;
