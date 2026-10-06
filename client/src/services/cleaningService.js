import axiosInstance from '../utils/axiosInstance';

const cleaningService = {
  startCleaning: (data) =>
    axiosInstance.post('/v1/cleaning/start', data),

  completeCleaning: (data) =>
    axiosInstance.post('/v1/cleaning/complete', data),
};

export default cleaningService;