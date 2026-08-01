import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../components/CustomIcons';
import { useTheme } from '../styles/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { stompClient } from '../services/socket';
import { ToastProvider, useToast } from '../styles/ToastContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { useGlobalStompListener } from '../hooks/useGlobalStompListener';

// ── Screens ────────────────────────────────────────────────────────────────
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import ClientSignUpScreen from '../screens/auth/ClientSignUpScreen';
import ProviderSignUpScreen from '../screens/auth/ProviderSignUpScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import IdCaptureScreen from '../screens/auth/IdCaptureScreen';
import CategorySelectScreen from '../screens/auth/CategorySelectScreen';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';
import RejectedApplicationScreen from '../screens/auth/RejectedApplicationScreen';
import ProviderBioScreen from '../screens/auth/ProviderBioScreen';
import ProviderReviewScreen from '../screens/auth/ProviderReviewScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import ResetPasswordCodeScreen from '../screens/auth/ResetPasswordCodeScreen';

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
import DeleteAccountScreen from '../screens/settings/DeleteAccountScreen';
import CategoryProvidersScreen from '../screens/core/CategoryProvidersScreen';
import ProviderProfileScreen from '../screens/core/ProviderProfileScreen';
import ListingDetailScreen from '../screens/provider/ListingDetailScreen';
import ActiveJobScreen from '../screens/core/ActiveJobScreen';
import RiderLiveTrackingScreen from '../screens/core/RiderLiveTrackingScreen';
import { ReviewSubmissionScreen } from '../screens/core/ReviewSubmissionScreen';
import NotificationCenterScreen from '../screens/core/NotificationCenterScreen';
import { RaiseDisputeScreen } from '../screens/core/RaiseDisputeScreen';
import { DisputeThreadScreen } from '../screens/core/DisputeThreadScreen';
import AccountRestrictedScreen from '../screens/auth/AccountRestrictedScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatThreadScreen from '../screens/chat/ChatThreadScreen';

import ProviderDashboardHomeScreen from '../screens/provider/ProviderDashboardHomeScreen';
import IncomingRequestsScreen from '../screens/provider/IncomingRequestsScreen';
import ProviderJobListScreen from '../screens/provider/ProviderJobListScreen';
import CreateEditListingScreen from '../screens/provider/CreateEditListingScreen';
import MyListingsScreen from '../screens/provider/MyListingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation, colors, isDark }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        position: 'absolute',
        bottom: 16 + insets.bottom,
        left: 16,
        right: 16,
        height: 64,
        borderRadius: 32,
        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            (navigation as any).navigate(route.name, route.params, { merge: true });
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        // Determine icon name
        let iconName = 'help-outline';
        if (route.name === 'ProviderDashboardHome') iconName = isFocused ? 'grid' : 'grid-outline';
        else if (route.name === 'IncomingRequests') iconName = isFocused ? 'flash' : 'flash-outline';
        else if (route.name === 'Listings') iconName = isFocused ? 'list' : 'list-outline';
        else if (route.name === 'ProviderJobList') iconName = isFocused ? 'briefcase' : 'briefcase-outline';
        else if (route.name === 'Wallet') iconName = isFocused ? 'wallet' : 'wallet-outline';
        else if (route.name === 'Settings') iconName = isFocused ? 'person' : 'person-outline';
        else if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
        else if (route.name === 'Search') iconName = isFocused ? 'add-circle' : 'add-circle-outline';
        else if (route.name === 'MyRequests') iconName = isFocused ? 'list' : 'list-outline';

        // Override label for bottom tabs
        let displayLabel = label;
        if (route.name === 'ProviderDashboardHome') displayLabel = 'Dashboard';
        else if (route.name === 'IncomingRequests') displayLabel = 'Requests';
        else if (route.name === 'Listings') displayLabel = 'Listings';
        else if (route.name === 'ProviderJobList') displayLabel = 'Jobs';
        else if (route.name === 'Wallet') displayLabel = 'Wallet';
        else if (route.name === 'Settings') displayLabel = 'Account';
        else if (route.name === 'Home') displayLabel = 'Home';
        else if (route.name === 'Search') displayLabel = 'Post';
        else if (route.name === 'MyRequests') displayLabel = 'Requests';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
              {
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              },
              isFocused && { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons name={iconName as any} size={20} color={isFocused ? '#FFF' : colors.textMuted} />
            {isFocused && (
              <Text style={{ color: '#FFF', marginLeft: 6, fontWeight: '700', fontSize: 13 }}>
                {displayLabel}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Provider Bottom Tabs ────────────────────────────────────────────────────
function ProviderNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} colors={colors} isDark={isDark} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="ProviderDashboardHome" component={ProviderDashboardHomeScreen} />
        <Tab.Screen name="IncomingRequests" component={IncomingRequestsScreen} />
        <Tab.Screen name="Listings" component={MyListingsScreen} />
        <Tab.Screen name="ProviderJobList" component={ProviderJobListScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </View>
  );
}

// ── Client Bottom Tabs ──────────────────────────────────────────────────────
function AppTabs() {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} colors={colors} isDark={isDark} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Search" component={PostRequestScreen} />
        <Tab.Screen name="MyRequests" component={MyRequestsScreen} />
        <Tab.Screen name="Wallet" component={StudentWalletScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </View>
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
    'ListingDetail',
    'ProviderProfile',
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
    emailVerified?: boolean;
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

  // Gating access: email verification check
  if (user.emailVerified === false) {
    return 'emailVerification';
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

  // Activate global STOMP listener for notifications, job updates, and query cache invalidations
  useGlobalStompListener();

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
  const activeViewKey = `${user?.role || 'STUDENT'}-${user?.accountStatus || 'ACTIVE'}-${user?.emailVerified === true ? 'verified' : 'unverified'}`;

  // Shared sub-screens
  const sharedScreens = (
    <>
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ActiveJob" component={ActiveJobScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RiderLiveTracking" component={RiderLiveTrackingScreen} options={{ title: 'Track Provider', headerShown: false }} />
      <Stack.Screen name="ReviewSubmission" component={ReviewSubmissionScreen} options={{ title: 'Submit Review', presentation: 'modal' }} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} options={{ title: 'Withdraw Funds' }} />
      <Stack.Screen name="Deposit" component={DepositScreen} options={{ title: 'Deposit Funds' }} />
      <Stack.Screen name="WalletReceiptScreen" component={WalletReceiptScreen} options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RaiseDispute" component={RaiseDisputeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DisputeThread" component={DisputeThreadScreen} options={{ headerShown: false }} />

      {/* Pushed onboarding screens */}
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ResetPasswordCode" component={ResetPasswordCodeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
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
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* ── Unauthenticated ── */}
      {route === 'auth' && (
        <>
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ResetPasswordCode" component={ResetPasswordCodeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ClientSignUp" component={ClientSignUpScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProviderSignUp" component={ProviderSignUpScreen} options={{ headerShown: false }} />
          {/* OtpVerify removed — verification is via email deep-link only (EmailSentScreen) */}
          <Stack.Screen name="IdCapture" component={IdCaptureScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CategorySelect" component={CategorySelectScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RejectedApplication" component={RejectedApplicationScreen} options={{ headerShown: false }} />
        </>
      )}

      {/* ── Email Verification Gate ── */}
      {route === 'emailVerification' && (
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ headerShown: false }} />
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
          <Stack.Screen name="Listings" component={MyListingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Wallet" component={ProviderWalletScreen} options={{ headerShown: false }} />
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
          <Stack.Screen name="ProviderProfile" component={ListingDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
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
      <OfflineBanner />
      <AppNavigatorInner />
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 32,
    borderRadius: 16,
  },
});
