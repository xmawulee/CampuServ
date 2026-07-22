import { create } from 'zustand';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notif) => set((state) => {
    const newNotif: AppNotification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    return {
      notifications: [newNotif, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    };
  }),
  markAsRead: (id) => set((state) => {
    const notifs = state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    return {
      notifications: notifs,
      unreadCount: notifs.filter(n => !n.isRead).length
    };
  }),
  markAllAsRead: () => set((state) => {
    const notifs = state.notifications.map(n => ({ ...n, isRead: true }));
    return {
      notifications: notifs,
      unreadCount: 0
    };
  }),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));

export default useNotificationStore;
