import axios from 'axios';
import { getSession } from 'next-auth/react';
import { rewriteMediaInJson } from './imageUrl';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const session = await getSession();
    const token = session?.accessToken || localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data != null) {
      response.data = rewriteMediaInJson(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
