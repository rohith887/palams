import axiosInstance from '../utils/axiosInstance';

const loadingService = {
  completeLoading: (data) =>
    axiosInstance.post('/v1/loading/complete', data),
};

export default loadingService;