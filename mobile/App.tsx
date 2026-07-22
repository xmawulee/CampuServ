import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { ThemeProvider, useTheme } from './src/styles/ThemeContext';
import { navigationRef } from './src/navigation/navigationRef';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const loadStoredAuth = useAuthStore((state) => state.loadStoredAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const { isDark } = useTheme();
  const [appIsReady, setAppIsReady] = useState(false);

  // Fonts are now rendered via SVG using lucide-react-native to bypass Expo Go native font cache bugs
  const fontsLoaded = true;
  const fontError = null;

  useEffect(() => {
    async function prepare() {
      try {
        // Safety timeout: If SecureStore takes more than 1.5s, proceed to prevent hanging
        await Promise.race([
          loadStoredAuth(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Auth loading timed out")), 1500))
        ]);
      } catch (e) {
        console.warn("SecureStore or prepare error:", e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, [loadStoredAuth]);

  useEffect(() => {
    if (appIsReady && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appIsReady, fontsLoaded]);

  if (!appIsReady || !fontsLoaded) {
    if (fontError) {
      console.warn("Font loading error:", fontError);
    }
    return null;
  }

  // This key changes whenever the authentication state changes (login/logout/role change).
  // A new key forces NavigationContainer to fully remount, which causes AppNavigator to
  // re-evaluate its route decision tree and navigate to the correct screen set.
  const navKey = isAuthenticated ? `authenticated-${user?.role ?? 'unknown'}` : 'unauthenticated';
  
  const linking = {
    prefixes: ['campusserv://', 'https://campusserv.app'],
    config: {
      screens: {
        VerifyEmail: 'verify-email',
      },
    },
  };

  return (
    <NavigationContainer key={navKey} ref={navigationRef} linking={linking}>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
