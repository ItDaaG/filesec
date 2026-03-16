import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000'
const AUTH_TOKEN_KEY = 'auth_token'

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (
      error.response?.status === 403 &&
      (error.response.data as { detail?: string })?.detail === 'Email not verified'
    ) {
      // Avoid redirect loops if we're already on the holding page
      if (!window.location.pathname.startsWith('/verify-email')) {
        window.location.href = '/verify-email'
      }
    }
    return Promise.reject(error)
  },
)

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}
