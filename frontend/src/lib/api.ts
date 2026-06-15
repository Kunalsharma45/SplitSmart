import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('expense_access_token');
  const publicEndpoints = ['/auth/login/', '/auth/register/', '/auth/token/refresh/'];
  const isPublic = config.url && publicEndpoints.some(endpoint => config.url?.includes(endpoint));
  if (token && config.headers && !isPublic) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
