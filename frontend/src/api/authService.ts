import { api, setAuthToken } from './client';
import type { User, UserCreate, UserLogin, AuthResponse } from '../types';

// Store reference to auth context login function
let authLoginCallback: ((user: User) => void) | null = null;

export function setAuthLoginCallback(callback: (user: User) => void) {
  authLoginCallback = callback;
}

export const login = async (credentials: UserLogin): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', credentials);
  return data;
};

export const performLogin = async (credentials: UserLogin) => {
    const data = await login(credentials);
    setAuthToken(data.access_token);
    if (authLoginCallback) {
      authLoginCallback(data.user);
    }
    return data;
  };

export const signUp = async (user: UserCreate): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/users/', user);
  setAuthToken(data.access_token);
  if (authLoginCallback) {
    authLoginCallback(data.user);
  }
  return data;
};

export const getMe = async (): Promise<User> => {
  const { data } = await api.get<User>('/users/me');
  return data;
};

export interface StorageStats {
  storage_used_bytes: number;
  storage_limit_bytes: number;
  storage_used_percentage: number;
  account_tier: string;
}

export const getStorageStats = async (): Promise<StorageStats> => {
  const { data } = await api.get<StorageStats>('/users/me/storage-stats');
  return data;
};
