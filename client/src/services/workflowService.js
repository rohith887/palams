import axiosInstance from '../utils/axiosInstance';

const workflowService = {
  validateTransition: (data) =>
    axiosInstance.post('/v1/workflow/validate', data),

  getBinStatus: (binId) =>
    axiosInstance.get(`/v1/bins/${binId}`),

  validateScan: (binData, userRole) =>
    axiosInstance.post('/v1/workflow/validate-scan', { binData, userRole }),
};

export default workflowService;