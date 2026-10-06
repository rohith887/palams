import axiosInstance from '../utils/axiosInstance';

const binSummaryService = {
  getSummary: async (params) => {
    const res = await axiosInstance.get('/v1/bin-summary', { params });
    return res;
  },
};

export default binSummaryService;
