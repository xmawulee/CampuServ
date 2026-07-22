import { useAuthStore } from '../store/authStore';
import { api } from './api';

let lastCheckTime = 0;
let lastStatusUpdateTimestamp = 0;
let isCheckingStatus = false;

/**
 * Authoritative account status resolver.
 * All status checks (polling, WebSocket pushes, API 403 interceptor, AppNavigator launch)
 * funnel through this single function.
 * 
 * - Discards out-of-order or stale status updates using timestamps.
 * - Prevents rapid duplicate network requests via a floor frequency (3s).
 * - Only updates authStore if the server status actually changed.
 */
export async function fetchAndResolveAccountStatus(source: string): Promise<'ACTIVE' | 'SUSPENDED' | 'BANNED' | null> {
  const now = Date.now();
  // Floor frequency: minimum 3 seconds between status network checks
  if (now - lastCheckTime < 3000 && isCheckingStatus) {
    console.log(`[AccountStatus] Throttling check from "${source}" (${now - lastCheckTime}ms since last check)`);
    return null;
  }

  const user = useAuthStore.getState().user;
  if (!user?.email) return null;

  isCheckingStatus = true;
  lastCheckTime = now;
  const fetchTimestamp = now;

  try {
    console.log(`[AccountStatus] Executing check-status request for ${user.email} (Source: ${source}, ts: ${fetchTimestamp})`);
    const res = await api.get('/auth/check-status', { params: { email: user.email } });
    const serverStatus = (res.data?.accountStatus || 'ACTIVE').toUpperCase() as 'ACTIVE' | 'SUSPENDED' | 'BANNED';

    console.log(`[AccountStatus] "${source}" received server status: ${serverStatus}`);

    if (fetchTimestamp >= lastStatusUpdateTimestamp) {
      lastStatusUpdateTimestamp = fetchTimestamp;
      const currentStatus = useAuthStore.getState().user?.accountStatus;
      if (currentStatus !== serverStatus) {
        console.log(`[AccountStatus] APPLYING STATUS UPDATE (${source}): ${currentStatus} -> ${serverStatus}`);
        await useAuthStore.getState().updateUser({ accountStatus: serverStatus });
      } else {
        console.log(`[AccountStatus] Status unchanged (${serverStatus}), skipping store write.`);
      }
    } else {
      console.log(`[AccountStatus] Discarded stale fetch result from "${source}" (ts ${fetchTimestamp} < latest ${lastStatusUpdateTimestamp})`);
    }

    return serverStatus;
  } catch (err) {
    console.warn(`[AccountStatus] Failed to check status from "${source}":`, err);
    return null;
  } finally {
    isCheckingStatus = false;
  }
}
