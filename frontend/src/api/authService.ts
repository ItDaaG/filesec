import { api, setAuthToken } from './client';
import type { User, UserCreate, UserLogin, AuthResponse } from '../types';

export const login = async (credentials: UserLogin): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', credentials);
  return data;
};

export const performLogin = async (credentials: UserLogin) => {
    const data = await login(credentials);
    setAuthToken(data.access_token)
    return data;
  };

export const signUp = async (user: UserCreate): Promise<User> => {
  const { data } = await api.post<User>('/users/signup', user);
  return data;
};

export const getMe = async (): Promise<User> => {
  const { data } = await api.get<User>('/users/me');
  return data;
};
