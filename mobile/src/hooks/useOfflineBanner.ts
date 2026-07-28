import { useEffect, useState } from 'react';
import * as Network from 'expo-network';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Returns true when the device has no active internet connection.
 * Checks on mount, on AppState foreground resume, and every 10 seconds.
 */
export function useOfflineBanner(): boolean {
  const [isOffline, setIsOffline] = useState(false);

  const checkNetwork = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsOffline(!state.isConnected || !state.isInternetReachable);
    } catch {
      // If the API fails, assume online so we don't false-positive block the UI
      setIsOffline(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkNetwork();

    // Re-check when app comes back to foreground
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkNetwork();
      }
    });

    // Periodic polling every 10 seconds while mounted
    const interval = setInterval(checkNetwork, 10_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return isOffline;
}
