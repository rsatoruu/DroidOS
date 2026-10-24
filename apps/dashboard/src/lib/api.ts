import axios from 'axios';
import { useAuthStore } from '../store/auth';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor – attach JWT token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);
