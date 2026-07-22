import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import { useNotificationStore } from '@/store/notificationStore';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { API_BASE_URL } from '@/lib/api';

export const useAdminStomp = () => {
  const { addNotification } = useNotificationStore();
  const { accessToken } = useAdminAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const baseHost = API_BASE_URL.replace(/^https?:\/\//, '');
    const brokerURL = `${isHttps ? 'wss' : 'ws'}://${baseHost}/ws/chats`;

    const client = new Client({
      brokerURL: brokerURL,
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
      onConnect: () => {
        client.subscribe('/topic/admin/notifications', (message) => {
          if (message.body) {
            const data = JSON.parse(message.body);
            addNotification({
              title: data.title || 'Notification',
              message: data.message || 'You have a new notification.',
              type: data.type || 'INFO',
            });
          }
        });
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [accessToken, addNotification]);
};
