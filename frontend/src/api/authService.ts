import { api, setAuthToken } from './client';
import type { User, UserCreate, UserLogin, AuthResponse } from '../types';

// Store reference to auth context login function
let authLoginCallback: ((user: User) => void) | null = null;

export function setAuthLoginCallback(callback: (user: User) => void) {
  authLoginCallback = callback;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Signup — returns email only, no JWT (verification required first)
// ---------------------------------------------------------------------------

export interface SignUpResponse {
  detail: string;
  email: string;
}

export const signUp = async (user: UserCreate): Promise<SignUpResponse> => {
  const { data } = await api.post<SignUpResponse>('/auth/signup', user);
  // Store email so the /verify-email holding page can display it
  localStorage.setItem('pending_verification_email', data.email);
  return data;
};

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export const resendVerification = async (email: string): Promise<void> => {
  await api.post('/auth/resend-verification', { email });
};

// ---------------------------------------------------------------------------
// Token verification — universal handler, backend decides the type
// ---------------------------------------------------------------------------

export interface TokenVerifyResponse {
  valid: boolean;
  type: 'email_verification' | 'email_change' | 'password_reset' | null;
  payload: string | null;
  access_token?: string | null;
  token_type?: string | null;
  user?: User | null;
}

export const verifyToken = async (token: string): Promise<TokenVerifyResponse> => {
  const { data } = await api.post<TokenVerifyResponse>('/auth/verify-token', { token });
  return data;
};

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export const requestPasswordReset = async (email: string): Promise<void> => {
  await api.post('/auth/request-password-reset', { email });
};

export const resetPassword = async (token: string, new_password: string): Promise<void> => {
  await api.post('/auth/reset-password', { token, new_password });
};

// ---------------------------------------------------------------------------
// Email change (authenticated, verified users only)
// ---------------------------------------------------------------------------

export const requestEmailChange = async (
  current_password: string,
  new_email: string,
): Promise<void> => {
  await api.post('/auth/request-email-change', { current_password, new_email });
};

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Account deletion
// ---------------------------------------------------------------------------

export const deleteAccount = async (): Promise<void> => {
  await api.delete('/users/me');
};
