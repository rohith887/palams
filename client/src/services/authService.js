

import axiosInstance from '../utils/axiosInstance';

const authService = {
  /**
   * Login with credentials.
   * @param {{ username: string, password: string }} credentials
   * @returns {Promise}
   */
  login: (credentials) => {
    // Stub — full implementation in PBLMS-2-06
    return axiosInstance.post('/v1/auth/login', credentials);
  },

  /**
   * Silent token refresh.
   * Called by Axios interceptor on 401 responses.
   * @returns {Promise}
   */
  refresh: () => {
    // Stub — full implementation in PBLMS-2-06
    return axiosInstance.post('/v1/auth/refresh');
  },

  /**
   * Logout — revoke refresh token.
   * @returns {Promise}
   */
  logout: () => {
    // Stub — full implementation in PBLMS-2-06
    return axiosInstance.post('/v1/auth/logout');
  },
};

export default authService;