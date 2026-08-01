import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { stompClient } from '../services/socket';
import { useToast } from '../styles/ToastContext';

/**
 * A global listener that maintains the STOMP connection when the user is logged in
 * and automatically invalidates React Query caches whenever real-time events arrive.
 */
export function useGlobalStompListener() {
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuthStore();
  const { showToast } = useToast();

  useEffect(() => {
    if (!accessToken || !user?.id) {
      // If user logs out, we should probably disconnect.
      // Assuming socket.ts handles disconnection safely if called multiple times.
      stompClient.disconnect();
      return;
    }

    // Attempt connection
    stompClient.connect(accessToken);

    // Subscribe to general user notifications (messages, requests, status changes)
    const notifTopic = `/topic/user/${user.id}/notifications`;
    const notifSubId = stompClient.subscribe(notifTopic, (msg: any) => {
      console.log('[Global STOMP] Notification received:', msg);

      // Show in-app toast for provider-facing new request match notifications
      if (msg?.type === 'MATCHING_REQUEST_CREATED') {
        showToast({
          status: 'info',
          title: 'New Matching Request 📋',
          subtitle: msg.message || 'A new request matches your service category.',
        });
        queryClient.invalidateQueries({ queryKey: ['providerIncomingRequests'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        return;
      }

      // Invalidate relevant caches globally
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['providerJobSummary'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['chat-list'] });
      queryClient.invalidateQueries({ queryKey: ['transactionReceipt'] });
      queryClient.invalidateQueries({ queryKey: ['walletReceipt'] });
      
      // If a specific job status changes, invalidate the job cache.
      // Often notifications contain jobId or requestId
      const targetJobId = msg.jobId || msg.referenceId;
      if (targetJobId) {
        queryClient.invalidateQueries({ queryKey: ['job', targetJobId] });
      }
    });

    // Subscribe to provider-specific job updates if provider
    let providerSubId: string | null = null;
    if (user.isProvider || user.role === 'PROVIDER') {
      const providerTopic = `/topic/provider/${user.id}/job-updates`;
      providerSubId = stompClient.subscribe(providerTopic, (msg: any) => {
        console.log('[Global STOMP] Provider Job update received:', msg);
        queryClient.invalidateQueries({ queryKey: ['providerJobSummary'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['myRequests'] });
        
        const targetJobId = msg.jobId || msg.referenceId;
        if (targetJobId) {
          queryClient.invalidateQueries({ queryKey: ['job', targetJobId] });
        }
      });
    }

    return () => {
      // Unsubscribe on cleanup
      stompClient.unsubscribe(notifSubId);
      if (providerSubId) {
        stompClient.unsubscribe(providerSubId);
      }
    };
  }, [accessToken, user?.id, user?.isProvider, user?.role, queryClient, showToast]);
}
