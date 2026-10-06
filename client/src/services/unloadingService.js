import axiosInstance from '../utils/axiosInstance';

const unloadingService = {
  completeUnloading: (data) =>
    axiosInstance.post('/v1/unloading/complete', data),
};

export default unloadingService;
