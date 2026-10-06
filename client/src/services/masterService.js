import axiosInstance from '../utils/axiosInstance';

const masterService = {
  // Bays
  getBays: () => axiosInstance.get('/v1/masters/bays'),
  getAllBays: () => axiosInstance.get('/v1/masters/bays?all=true'),
  createBay: (data) => axiosInstance.post('/v1/masters/bays', data),
  updateBay: (bayId, data) => axiosInstance.put(`/v1/masters/bays/${bayId}`, data),
  deleteBay: (bayId) => axiosInstance.delete(`/v1/masters/bays/${bayId}`),

  // Tanks
  getTanks: (bayId) => {
    const url = bayId ? `/v1/masters/tanks?bayId=${bayId}` : '/v1/masters/tanks';
    return axiosInstance.get(url);
  },
  createTank: (data) => axiosInstance.post('/v1/masters/tanks', data),
  updateTank: (tankId, data) => axiosInstance.put(`/v1/masters/tanks/${tankId}`, data),
  deleteTank: (tankId) => axiosInstance.delete(`/v1/masters/tanks/${tankId}`),

  // Materials
  getMaterials: () => axiosInstance.get('/v1/masters/materials'),
  getAllMaterials: () => axiosInstance.get('/v1/masters/materials?all=true'),
  createMaterial: (data) => axiosInstance.post('/v1/masters/materials', data),
  updateMaterial: (id, data) => axiosInstance.put(`/v1/masters/materials/${id}`, data),
  deleteMaterial: (id) => axiosInstance.delete(`/v1/masters/materials/${id}`),

  // Lookups
  getBinTypes: () => axiosInstance.get('/v1/masters/bin-types'),
  getBinCategories: () => axiosInstance.get('/v1/masters/bin-categories'),
};

export default masterService;