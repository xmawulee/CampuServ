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
  whatsappNumber?: string;
  portfolio?: string[];
  keyServices?: string[];
  emailVerified?: boolean;
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
    set({ accessToken, refreshToken, user, isAuthenticated: true, roleMode: derivedRoleMode, sessionExpired: false });
    try {
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      await SecureStore.setItemAsync('roleMode', derivedRoleMode);
    } catch (err) {
      console.warn('[authStore] Failed to save auth data to SecureStore:', err);
    }
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
      // Update in-memory state immediately to unblock the UI
      set({ user: updatedUser, roleMode: derivedRoleMode });
      // Then try to persist, ignoring errors if size is too large
      try {
        await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
        await SecureStore.setItemAsync('roleMode', derivedRoleMode);
      } catch (err) {
        console.warn('[authStore] Failed to save user to SecureStore:', err);
      }
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
    const currentUser = get().user;

    // 1. Immediately reset state to unblock UI navigation (< 1ms)
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      roleMode: null,
      sessionExpired: false
    });

    // 2. Fire backend revocation asynchronously without blocking UI
    if (currentRefToken) {
      import('../services/api').then(({ api }) => {
        api.post('/auth/logout', 
          { refreshToken: currentRefToken }, 
          { headers: currentUser?.id ? { 'X-User-Id': currentUser.id } : {} }
        ).catch(() => {});
      }).catch(() => {});
    }

    // 3. Clear SecureStore in parallel
    Promise.all([
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('refreshToken'),
      SecureStore.deleteItemAsync('user'),
      SecureStore.deleteItemAsync('roleMode'),
    ]).catch((err) => console.warn('[authStore] SecureStore clear error:', err));
  },
  clearAuth: async () => {
    stompClient.disconnect();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      roleMode: null,
      sessionExpired: false
    });
    Promise.all([
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('refreshToken'),
      SecureStore.deleteItemAsync('user'),
      SecureStore.deleteItemAsync('roleMode'),
    ]).catch((err) => console.warn('[authStore] SecureStore clear error:', err));
  },
  setSessionExpired: async () => {
    stompClient.disconnect();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      roleMode: null,
      sessionExpired: true
    });
    Promise.all([
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('refreshToken'),
      SecureStore.deleteItemAsync('user'),
      SecureStore.deleteItemAsync('roleMode'),
    ]).catch((err) => console.warn('[authStore] SecureStore clear error:', err));
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
