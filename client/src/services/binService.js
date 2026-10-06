import axiosInstance from '../utils/axiosInstance';

const binService = {
  getBins: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.binTypeId) params.append('binTypeId', filters.binTypeId);
    if (filters.binCategoryId) params.append('binCategoryId', filters.binCategoryId);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.bayId) params.append('bayId', filters.bayId);
    if (filters.search) params.append('search', filters.search);
    return axiosInstance.get(`/v1/bins?${params.toString()}`);
  },
  scanBin: (qrCode) => axiosInstance.get(`/v1/bins/scan/${encodeURIComponent(qrCode)}`),
  getBin: (binId) => axiosInstance.get(`/v1/bins/${binId}`),
  registerBin: (data) => axiosInstance.post('/v1/bins', data),
  updateBin: (binId, data) => axiosInstance.put(`/v1/bins/${binId}`, data),
  deactivateBin: (binId) => axiosInstance.delete(`/v1/bins/${binId}`),
  getBinByCode: (binCode) => axiosInstance.get(`/v1/bins/by-code/${encodeURIComponent(binCode)}`),
  regenerateQr: (binId) => axiosInstance.post(`/v1/bins/${binId}/regenerate-qr`),
};

export default binService;
