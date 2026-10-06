import axiosInstance from '../utils/axiosInstance';

const userService = {
  listUsers: (params = {}) => axiosInstance.get('/v1/users', { params }),
  getUserById: (userId) => axiosInstance.get(`/v1/users/${userId}`),
  createUser: (data) => axiosInstance.post('/v1/users', data),
  updateUser: (userId, data) => axiosInstance.put(`/v1/users/${userId}`, data),
  deactivateUser: (userId) => axiosInstance.patch(`/v1/users/${userId}/deactivate`),
  activateUser: (userId) => axiosInstance.patch(`/v1/users/${userId}/activate`),
  resetPassword: (userId) => axiosInstance.post(`/v1/users/${userId}/reset-password`),
  deleteUser: (userId) => axiosInstance.delete(`/v1/users/${userId}`),
  getRoles: () => axiosInstance.get('/v1/users/roles'),
};

export default userService;
