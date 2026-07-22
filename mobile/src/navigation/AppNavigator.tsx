import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../components/CustomIcons';
import { useTheme } from '../styles/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { stompClient } from '../services/socket';
import { ToastProvider, useToast } from '../styles/ToastContext';

// ── Screens ────────────────────────────────────────────────────────────────
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import ClientSignUpScreen from '../screens/auth/ClientSignUpScreen';
import ProviderSignUpScreen from '../screens/auth/ProviderSignUpScreen';
// OtpVerifyScreen removed — email verification is exclusively via deep-link. See EmailSentScreen.
import IdCaptureScreen from '../screens/auth/IdCaptureScreen';
import CategorySelectScreen from '../screens/auth/CategorySelectScreen';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';
import RejectedApplicationScreen from '../screens/auth/RejectedApplicationScreen';
import ProviderBioScreen from '../screens/auth/ProviderBioScreen';
import ProviderReviewScreen from '../screens/auth/ProviderReviewScreen';

import HomeScreen from '../screens/core/HomeScreen';
import RequestDetailsScreen from '../screens/core/RequestDetailsScreen';
import RequestDetailForProviderScreen from '../screens/provider/RequestDetailForProviderScreen';
import SelectProviderScreen from '../screens/core/SelectProviderScreen';
import RateProviderScreen from '../screens/core/RateProviderScreen';
import MyRequestsScreen from '../screens/core/MyRequestsScreen';
import PostRequestScreen from '../screens/core/PostRequestScreen';
import StudentWalletScreen from '../screens/wallet/StudentWalletScreen';
import ProviderWalletScreen from '../screens/wallet/ProviderWalletScreen';
import { WithdrawalScreen } from '../screens/wallet/WithdrawalScreen';
import { DepositScreen } from '../screens/wallet/DepositScreen';
import WalletReceiptScreen from '../screens/wallet/WalletReceiptScreen';
import TransactionReceiptScreen from '../screens/wallet/TransactionReceiptScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import CategoryProvidersScreen from '../screens/core/CategoryProvidersScreen';
import ProviderProfileScreen from '../screens/core/ProviderProfileScreen';
import ActiveJobScreen from '../screens/core/ActiveJobScreen';
import RiderLiveTrackingScreen from '../screens/core/RiderLiveTrackingScreen';
import { ReviewSubmissionScreen } from '../screens/core/ReviewSubmissionScreen';
import NotificationCenterScreen from '../screens/core/NotificationCenterScreen';
import AccountRestrictedScreen from '../screens/auth/AccountRestrictedScreen';
import ChatScreen from '../screens/chat/ChatScreen';

import ProviderDashboardHomeScreen from '../screens/provider/ProviderDashboardHomeScreen';
import IncomingRequestsScreen from '../screens/provider/IncomingRequestsScreen';
import ProviderJobListScreen from '../screens/provider/ProviderJobListScreen';
import CreateEditListingScreen from '../screens/provider/CreateEditListingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Tab Bar Icon Helper ───────────────────────────────────────────────────
function TabIcon({ name, focused, colors }: { name: string; focused: boolean; colors: any }) {
  return (
    <View style={styles.tabIconWrap}>
      <Ionicons name={name as any} size={22} color={focused ? colors.primary : colors.textMuted} />
      {focused && <View style={[styles.tabDot, { backgroundColor: colors.primary }]} />}
    </View>
  );
}

// ── Provider Bottom Tabs ────────────────────────────────────────────────────
function ProviderNavigator() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="ProviderDashboardHome"
          component={ProviderDashboardHomeScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} colors={colors} />
            ),
            title: 'Dashboard',
          }}
        />
        <Tab.Screen
          name="IncomingRequests"
          component={IncomingRequestsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? 'flash' : 'flash-outline'} focused={focused} colors={colors} />
            ),
            title: 'Requests',
          }}
        />
        <Tab.Screen
          name="ProviderJobList"
          component={ProviderJobListScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} colors={colors} />
            ),
            title: 'My Jobs',
          }}
        />
        <Tab.Screen
          name="Wallet"
          component={ProviderWalletScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} colors={colors} />
            ),
            title: 'Earnings',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} colors={colors} />
            ),
            title: 'Account',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// ── Client Bottom Tabs ──────────────────────────────────────────────────────
function AppTabs() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} colors={colors} />
            ),
            title: 'Explore',
          }}
        />
        <Tab.Screen
          name="MyRequests"
          component={MyRequestsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? 'list' : 'list-outline'} focused={focused} colors={colors} />
            ),
            title: 'My Requests',
          }}
        />
        <Tab.Screen
          name="Wallet"
          component={StudentWalletScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} colors={colors} />
            ),
            title: 'Escrow Wallet',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} colors={colors} />
            ),
            title: 'Account',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// ── Account-state router ───────────────────────────────────────────────────
/**
 * Pure function — single source of truth for all navigation routing.
 *
 * State table (evaluated top-to-bottom, first match wins):
 * | primaryRoleVerified | secondaryRole | secondaryRoleStatus   | activeView | → Destination         |
 * |---------------------|---------------|-----------------------|------------|-----------------------|
 * | false               | any           | any                   | any        | idCapture             |
 * | true                | any           | any                   | STUDENT    | client                |
 * | true                | PROVIDER      | PENDING_VERIFICATION  | PROVIDER   | pendingApproval       |
 * | true                | PROVIDER      | REJECTED              | PROVIDER   | rejectedApplication   |
 * | true                | PROVIDER      | APPROVED              | PROVIDER   | provider              |
 * | true                | PROVIDER      | other                 | PROVIDER   | client (safe fallback)|
 * | true                | NONE/absent   | NONE                  | PROVIDER   | client                |
 */
/**
 * Deep Link & Push Notification Route Guard
 * Prevents cross-stack navigation (e.g. provider pushed into a student route or vice versa).
 */
export function validateDeepLinkForRole(targetRoute: string, userRole: string): boolean {
  if (!userRole) return false;

  const clientOnlyRoutes = [
    'PostRequest',
    'CategoryProviders',
    'SelectProvider',
    'RateProvider',
    'ClientTabs',
  ];

  const providerOnlyRoutes = [
    'ProviderJobs',
    'RequestDetailForProvider',
    'CreateEditListing',
    'ProviderTabs',
  ];

  const isProvider = userRole.toUpperCase() === 'PROVIDER';
  const isClient = userRole.toUpperCase() === 'STUDENT';

  if (isProvider && clientOnlyRoutes.includes(targetRoute)) {
    console.warn(`[SecurityGuard] Blocked provider navigation to client route "${targetRoute}"`);
    return false;
  }

  if (isClient && providerOnlyRoutes.includes(targetRoute)) {
    console.warn(`[SecurityGuard] Blocked client navigation to provider route "${targetRoute}"`);
    return false;
  }

  return true;
}

function resolveRoute(
  isAuthenticated: boolean,
  user: {
    role: string;
    primaryRoleVerified?: boolean;
    accountStatus?: string;
    studentIdPhotoUrl?: string;
    rejectionReason?: string;
    isVerified?: boolean;
    verificationStatus?: string;
    serviceCategory?: string;
  } | null,
): string {
  if (!isAuthenticated || !user || !user.role) return 'auth';

  // Hard stop on unrecognized role type - fail closed, never fail open
  const normalizedRole = user.role.toUpperCase();
  if (normalizedRole !== 'PROVIDER' && normalizedRole !== 'STUDENT' && normalizedRole !== 'ADMIN') {
    return 'auth';
  }

  // Full-app block: suspended or banned accounts
  if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'BANNED') {
    return 'accountRestricted';
  }

  // Provider account onboarding & approval check
  if (normalizedRole === 'PROVIDER') {
    // 1. Incomplete onboarding flow
    if (user.accountStatus === 'INCOMPLETE') {
      return 'providerOnboarding';
    }

    // Backwards compatibility for old incomplete logic
    if (!user.studentIdPhotoUrl || !user.serviceCategory) {
      return 'providerOnboarding';
    }

    if (user.primaryRoleVerified === false || user.verificationStatus === 'PENDING_VERIFICATION' || user.verificationStatus === 'PENDING_REVIEW' || user.accountStatus === 'PENDING_VERIFICATION') {
      if (user.rejectionReason) return 'rejectedApplication';
      return 'pendingApproval';
    }

    return 'provider';
  }

  // Student role routing
  if (normalizedRole === 'STUDENT' || normalizedRole === 'ADMIN') {
    return 'client';
  }

  return 'auth';
}

// ── Root Navigator ─────────────────────────────────────────────────────────

function AppNavigatorInner() {
  const { isAuthenticated, user, sessionExpired, updateUser } = useAuthStore();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const sessionExpiredShown = useRef(false);

  // Re-fetch user status from server on auth boot via authoritative resolver
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    import('../services/accountStatusService').then(({ fetchAndResolveAccountStatus }) => {
      fetchAndResolveAccountStatus('AppNavigator launch check');
    });
  }, [isAuthenticated]);

  // Foreground fallback check for missed WebSocket events
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && user?.email) {
        console.log('[AppNavigator] App returned to foreground, verifying account status...');
        import('../services/accountStatusService').then(({ fetchAndResolveAccountStatus }) => {
          fetchAndResolveAccountStatus('Foreground return check');
        });
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user?.email]);

  // Global real-time STOMP status listener for account restrictions (suspend / ban / activate)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const token = useAuthStore.getState().accessToken;
    if (token) {
      stompClient.connect(token);
    }
    const subId = stompClient.subscribe(`/topic/user/${user.id}/status`, (payload: any) => {
      if (!payload) return;
      console.log('[AccountStatus] AppNavigator STOMP push received:', payload);
      // Do not trust push payload directly as new truth; trigger fresh server check via resolver
      import('../services/accountStatusService').then(({ fetchAndResolveAccountStatus }) => {
        fetchAndResolveAccountStatus('WebSocket Push (AppNavigator)');
      });
    });

    return () => {
      if (subId) {
        stompClient.unsubscribe(subId);
      }
    };
  }, [isAuthenticated, user?.id]);

  // Show session-expired toast exactly once after forced sign-out
  useEffect(() => {
    if (sessionExpired && !sessionExpiredShown.current) {
      sessionExpiredShown.current = true;
      const t = setTimeout(() => {
        showToast({
          status: 'error',
          title: 'Session Expired',
          subtitle: 'Please sign in again to continue.',
          duration: 5000,
        });
        useAuthStore.setState({ sessionExpired: false });
      }, 400);
      return () => clearTimeout(t);
    }
    if (!sessionExpired) sessionExpiredShown.current = false;
  }, [sessionExpired, showToast]);

  const route = resolveRoute(isAuthenticated, user);
  // Include accountStatus in the key so the navigator fully remounts when an account
  // transitions from SUSPENDED/BANNED → ACTIVE. Without this, React Navigation keeps
  // the old screen in its internal state even after resolveRoute() returns a different
  // route, meaning the AccountRestrictedScreen stays visible despite correct store state.
  const activeViewKey = `${user?.role || 'STUDENT'}-${user?.accountStatus || 'ACTIVE'}`;

  // Shared sub-screens
  const sharedScreens = (
    <>
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Live Chat' }} />
      <Stack.Screen name="ActiveJob" component={ActiveJobScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RiderLiveTracking" component={RiderLiveTrackingScreen} options={{ title: 'Track Provider', headerShown: false }} />
      <Stack.Screen name="ReviewSubmission" component={ReviewSubmissionScreen} options={{ title: 'Submit Review', presentation: 'modal' }} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} options={{ title: 'Withdraw Funds' }} />
      <Stack.Screen name="Deposit" component={DepositScreen} options={{ title: 'Deposit Funds' }} />
      <Stack.Screen name="WalletReceiptScreen" component={WalletReceiptScreen} options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ headerShown: false }} />

      {/* Pushed onboarding screens */}
      <Stack.Screen name="IdCapture" component={IdCaptureScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CategorySelect" component={CategorySelectScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RejectedApplication" component={RejectedApplicationScreen} options={{ headerShown: false }} />
    </>
  );

  return (
    <Stack.Navigator
      key={activeViewKey}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
      }}
    >
      {/* ── Unauthenticated ── */}
      {route === 'auth' && (
        <>
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ClientSignUp" component={ClientSignUpScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProviderSignUp" component={ProviderSignUpScreen} options={{ headerShown: false }} />
          {/* OtpVerify removed — verification is via email deep-link only (EmailSentScreen) */}
          <Stack.Screen name="IdCapture" component={IdCaptureScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CategorySelect" component={CategorySelectScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RejectedApplication" component={RejectedApplicationScreen} options={{ headerShown: false }} />
        </>
      )}

      {/* ── Account Restricted — full-app block ── */}
      {route === 'accountRestricted' && (
        <Stack.Screen name="AccountRestricted" component={AccountRestrictedScreen} options={{ headerShown: false }} />
      )}

      {/* ── Unverified Primary Role Onboarding ── */}
      {route === 'providerOnboarding' && (
        <>
          <Stack.Screen name="IdCapture" component={IdCaptureScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CategorySelect" component={CategorySelectScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProviderBio" component={ProviderBioScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProviderReview" component={ProviderReviewScreen} options={{ headerShown: false }} />
        </>
      )}

      {/* ── Provider Application Pending ── */}
      {route === 'pendingApproval' && (
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} options={{ headerShown: false }} />
      )}

      {/* ── Provider Application Rejected ── */}
      {route === 'rejectedApplication' && (
        <Stack.Screen name="RejectedApplication" component={RejectedApplicationScreen} options={{ headerShown: false }} />
      )}

      {/* ── Verified Provider View ── */}
      {route === 'provider' && (
        <>
          <Stack.Screen name="Main" component={ProviderNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="ProviderJobs" component={ProviderJobListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RequestDetailForProvider" component={RequestDetailForProviderScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateEditListing" component={CreateEditListingScreen} options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="TransactionReceipt" component={TransactionReceiptScreen} options={{ presentation: 'modal', headerShown: false }} />
          {sharedScreens}
        </>
      )}

      {/* ── Client (Student View) ── */}
      {route === 'client' && (
        <>
          <Stack.Screen name="Main" component={AppTabs} options={{ headerShown: false }} />
          <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} options={{ title: 'Request Details' }} />
          <Stack.Screen name="PostRequest" component={PostRequestScreen} options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="CategoryProviders" component={CategoryProvidersScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProviderProfile" component={ProviderProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SelectProvider" component={SelectProviderScreen} options={{ title: 'Select Provider', presentation: 'card' }} />
          <Stack.Screen name="RateProvider" component={RateProviderScreen} options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="TransactionReceipt" component={TransactionReceiptScreen} options={{ presentation: 'modal', headerShown: false }} />
          {sharedScreens}
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <ToastProvider>
      <AppNavigatorInner />
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
