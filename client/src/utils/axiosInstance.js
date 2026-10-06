import axios from 'axios';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const axiosInstance = axios.create({
  baseURL: VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let accessTokenRef = null;
let authContextRef = null;
let authServiceRef = null;
let isRefreshing = false;
let failedQueue = [];

export function registerAuthDependencies(authContext, authService) {
  authContextRef = authContext;
  authServiceRef = authService;
}

export function setAccessToken(token) {
  accessTokenRef = token;
}

export function getAccessToken() {
  return accessTokenRef;
}

axiosInstance.interceptors.request.use(
  (config) => {
    if (accessTokenRef) {
      config.headers.Authorization = `Bearer ${accessTokenRef}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      if (!authServiceRef || !authServiceRef.refresh) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      const response = await authServiceRef.refresh();
      const newToken = response.data?.data?.accessToken;

      if (newToken) {
        setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      }

      throw new Error('Refresh failed');
    } catch (refreshError) {
      processQueue(refreshError, null);
      if (authContextRef && authContextRef.logout) {
        authContextRef.logout();
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
