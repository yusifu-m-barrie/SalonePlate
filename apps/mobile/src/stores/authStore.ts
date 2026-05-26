import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken } from '../lib/api';
import type { SignupProfilePayload } from '../types/signup';

interface User {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  loyaltyPoints?: number;
  referralCode?: string;
  language?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (tokens: AuthTokens) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  sendRegisterCode: (email: string) => Promise<{
    devCode?: string;
    retryAfter?: number;
    delivery?: string;
    message?: string;
  }>;
  verifyRegisterCode: (email: string, code: string) => Promise<boolean>;
  registerWithEmail: (payload: SignupProfilePayload & { email: string; code: string; password: string }) => Promise<User>;
  signInWithGoogle: (idToken: string, payload: SignupProfilePayload) => Promise<User>;
  /** Customer only — creates account or signs in with one Google tap. */
  customerGoogleAuth: (idToken: string, profile?: Partial<SignupProfilePayload>) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  loginPhone: (phone: string, code: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setSession: async ({ accessToken, refreshToken, user }) => {
    await setAuthToken(accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ user, isAuthenticated: true });
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await get().setSession(data);
  },

  sendRegisterCode: async (email) => {
    const { data } = await api.post<{
      message: string;
      expiresIn: number;
      devCode?: string;
      retryAfter?: number;
      delivery?: string;
    }>('/auth/register/send-code', { email: email.trim().toLowerCase() });
    return {
      devCode: data.devCode,
      retryAfter: data.retryAfter,
      delivery: data.delivery,
      message: data.message,
    };
  },

  verifyRegisterCode: async (email, code) => {
    const { data } = await api.post<{ verified: boolean }>('/auth/register/verify-code', {
      email: email.trim().toLowerCase(),
      code: code.trim(),
    });
    return data.verified === true;
  },

  registerWithEmail: async (payload) => {
    const { data } = await api.post('/auth/register', {
      ...payload,
      email: payload.email.trim().toLowerCase(),
      citySlug: 'makeni',
    });
    await get().setSession(data);
    return data.user;
  },

  signInWithGoogle: async (idToken, payload) => {
    const { data } = await api.post('/auth/google', {
      idToken,
      ...payload,
      citySlug: 'makeni',
    });
    await get().setSession(data);
    return data.user;
  },

  customerGoogleAuth: async (idToken, profile) => {
    const { data } = await api.post('/auth/google', {
      idToken,
      role: 'CUSTOMER',
      citySlug: 'makeni',
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      phone: profile?.phone,
    });
    await get().setSession(data);
    return data.user;
  },

  loginWithGoogle: async (idToken) => {
    const { data } = await api.post('/auth/google/login', { idToken });
    await get().setSession(data);
    return data.user;
  },

  requestOtp: async (phone) => {
    await api.post('/auth/phone/request-otp', { phone });
  },

  loginPhone: async (phone, code) => {
    const { data } = await api.post('/auth/otp/verify', { phone, code, purpose: 'LOGIN' });
    await get().setSession(data);
  },

  refreshUser: async () => {
    const { data } = await api.get('/users/me');
    set({ user: data });
  },

  logout: async () => {
    await setAuthToken(null);
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const { data } = await api.get('/users/me');
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          await get().setSession(data);
          set({ isLoading: false });
          return;
        } catch {
          /* fall through */
        }
      }
      await setAuthToken(null);
      await SecureStore.deleteItemAsync('refreshToken');
      set({ isLoading: false });
    }
  },
}));
