import { create } from 'zustand';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminAuthState {
  adminUser: AdminUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, refreshToken: string, user: AdminUser) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  adminUser: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  setAuth: (accessToken, refreshToken, adminUser) => set({ adminUser, accessToken, refreshToken, isAuthenticated: true }),
  logout: () => set({ adminUser: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
}));

export default useAdminAuthStore;
