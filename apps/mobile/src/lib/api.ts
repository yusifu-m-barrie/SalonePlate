import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { rewriteMediaInJson } from './imageUrl';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
    if (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK') {
      error.message =
        `Cannot reach API at ${API_URL}. Same Wi‑Fi as PC, run npm run sync:ip, npm run dev:api, npm run firewall:api (Admin), then expo start -c.`;
    }
    return Promise.reject(error);
  },
);

export const setAuthToken = async (token: string | null) => {
  if (token) {
    await SecureStore.setItemAsync('accessToken', token);
  } else {
    await SecureStore.deleteItemAsync('accessToken');
  }
};
