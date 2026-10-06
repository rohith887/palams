import axiosInstance from '../utils/axiosInstance';

const reportService = {
  generateReport: async (data) => {
    const res = await axiosInstance.post('/v1/reports/generate', data);
    return res;
  },

  getExceptions: async () => {
    const res = await axiosInstance.get('/v1/reports/exceptions');
    return res;
  },
};

export default reportService;