import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { stompClient } from '../services/socket';

export interface User {
  id: string;
  email: string;
  fullName: string;
  profilePictureUrl?: string;
  role: 'STUDENT' | 'PROVIDER' | 'ADMIN';
  primaryRoleVerified?: boolean;
  isVerified?: boolean;
  verificationStatus?: string;
  accountStatus?: 'INCOMPLETE' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  isProvider?: boolean;
  rejectionCount?: number;
  studentIdPhotoUrl?: string;
  rejectionReason?: string;
  serviceCategory?: string;
  bio?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  roleMode: 'CLIENT' | 'PROVIDER' | null;
  /** True when the session was cleared due to an expired/invalid refresh token (not a voluntary logout). */
  sessionExpired: boolean;
  setAuth: (accessToken: string, refreshToken: string, user: User, roleMode?: 'CLIENT' | 'PROVIDER') => Promise<void>;
  updateUser: (userUpdates: Partial<User>) => Promise<void>;
  updateAccessToken: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuth: () => Promise<void>;
  /** Call this when a refresh token fails — clears auth and marks session as expired so the UI can show a specific message. */
  setSessionExpired: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  roleMode: null,
  sessionExpired: false,
  setAuth: async (accessToken, refreshToken, user) => {
    const derivedRoleMode = user.role === 'PROVIDER' ? 'PROVIDER' : 'CLIENT';
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    await SecureStore.setItemAsync('roleMode', derivedRoleMode);
    set({ accessToken, refreshToken, user, isAuthenticated: true, roleMode: derivedRoleMode, sessionExpired: false });
  },
  updateUser: async (userUpdates) => {
    const currentUser = get().user;
    if (currentUser) {
      const hasChanges = Object.keys(userUpdates).some(
        (key) => (currentUser as any)[key] !== (userUpdates as any)[key]
      );
      if (!hasChanges) {
        return; // Avoid unnecessary re-renders and SecureStore writes if state hasn't changed
      }
      const updatedUser = { ...currentUser, ...userUpdates };
      const derivedRoleMode = updatedUser.role === 'PROVIDER' ? 'PROVIDER' : 'CLIENT';
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
      await SecureStore.setItemAsync('roleMode', derivedRoleMode);
      set({ user: updatedUser, roleMode: derivedRoleMode });
    }
  },
  updateAccessToken: async (accessToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    set({ accessToken });
    stompClient.connect(accessToken);
  },
  logout: async () => {
    stompClient.disconnect();
    const currentRefToken = get().refreshToken;
    if (currentRefToken) {
      try {
        const { api } = await import('../services/api');
        await api.post('/auth/logout', { refreshToken: currentRefToken });
      } catch (e) {
        // Silently catch network errors on logout
      }
    }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('roleMode');
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false, roleMode: null, sessionExpired: false });
  },
  clearAuth: async () => {
    stompClient.disconnect();
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('roleMode');
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false, roleMode: null, sessionExpired: false });
  },
  setSessionExpired: async () => {
    stompClient.disconnect();
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('roleMode');
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false, roleMode: null, sessionExpired: true });
  },
  loadStoredAuth: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const storedUser = await SecureStore.getItemAsync('user');

      if (accessToken && refreshToken && storedUser) {
        const user: User = JSON.parse(storedUser);
        const derivedRoleMode = user.role === 'PROVIDER' ? 'PROVIDER' : 'CLIENT';
        set({ accessToken, refreshToken, user, isAuthenticated: true, roleMode: derivedRoleMode });
      }
    } catch (e) {
      console.warn("SecureStore load error", e);
    }
  },
}));
