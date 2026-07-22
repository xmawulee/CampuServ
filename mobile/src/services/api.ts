import axios from 'axios';
import { useAuthStore } from '../store/authStore';

import ENV from '../config/env';

export const BASE_URL = ENV.apiBaseUrl ?? 'http://localhost:8080';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check for explicit Account Restricted status (Banned or Suspended)
    const errData = error.response?.data;
    const isAccountRestricted = 
      errData?.error === 'ACCOUNT_RESTRICTED' ||
      (error.response?.status === 403 && (
        errData?.error === 'ACCOUNT_RESTRICTED' ||
        (typeof errData?.message === 'string' && (
          errData.message.toLowerCase().includes('suspended') ||
          errData.message.toLowerCase().includes('banned') ||
          errData.message.toLowerCase().includes('restricted')
        ))
      ));

    if (isAccountRestricted) {
      import('./accountStatusService').then(({ fetchAndResolveAccountStatus }) => {
        fetchAndResolveAccountStatus('api.ts interceptor');
      }).catch(() => {});
      return Promise.reject(error);
    }

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh') || originalRequest?.url?.includes('/auth/register');

    // Check if the error is 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue the request until token is refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call the auth service refresh endpoint directly (bypassing authorization interceptor check since we supply body)
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken: refreshToken,
        });

        const { accessToken: newAccessToken } = response.data;
        
        // Update the Zustand store
        await useAuthStore.getState().updateAccessToken(newAccessToken);

        // Process any queued requests
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        // Normalize refreshError if it contains a Cloudflare or Spring Boot JSON object
        if (refreshError.response && refreshError.response.data && typeof refreshError.response.data === 'object') {
          const data = refreshError.response.data;
          if (data.cloudflare_error || data.ray_id) {
            refreshError.response.data = "Connection to server failed. The server might be down or restarting.";
          } else if (typeof data.message === 'string') {
            refreshError.response.data = data.message;
          } else if (typeof data.error === 'string') {
            refreshError.response.data = data.error;
          } else {
            refreshError.response.data = "An unexpected server error occurred.";
          }
        }

        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Signal session expired (not a voluntary logout) so navigator can show a targeted message
        await useAuthStore.getState().setSessionExpired();
        return Promise.reject(refreshError);
      }
    }

    // Normalize error.response.data to a string to prevent React rendering crashes
    // Cloudflare tunnels and Spring Boot can sometimes return JSON objects on error
    if (error.response && error.response.data && typeof error.response.data === 'object') {
      const data = error.response.data;
      // Do not normalize known structured errors that need to be handled programmatically by components
      if (data.error === 'EMAIL_UNVERIFIED' || data.error === 'REMOTE_NOT_SUPPORTED') {
        // Keep as object
      } else if (data.cloudflare_error || data.ray_id) {
        error.response.data = "Connection to server failed. The server might be down or restarting.";
      } else if (typeof data.message === 'string') {
        error.response.data = data.message;
      } else if (typeof data.error === 'string') {
        error.response.data = data.error;
      } else {
        error.response.data = "An unexpected server error occurred.";
      }
    }

    return Promise.reject(error);
  }
);
