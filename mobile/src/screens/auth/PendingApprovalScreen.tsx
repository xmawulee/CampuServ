import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { stompClient } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { api } from '../../services/api';

export default function PendingApprovalScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, accessToken, setAuth, updateUser, logout } = useAuthStore();
  const socketSubRef = useRef<string | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMsg, setTransitionMsg] = useState('');

  const canPopStack = navigation.canGoBack();

  const handleBackPress = () => {
    Alert.alert(
      "Sign Out Confirmation",
      "Are you sure you want to sign out? Your provider application will continue to be reviewed while you are away.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: () => logout() 
        }
      ]
    );
  };

  useEffect(() => {
    if (!accessToken || !user) return;

    let transitioned = false;
    let isMounted = true;

    const handleStatusUpdate = async (status: string, reason?: string | null) => {
      if (transitioned || !isMounted) return;
      transitioned = true;

      const normalizedStatus = status.toUpperCase();
      if (normalizedStatus === 'APPROVED' || normalizedStatus === 'VERIFIED') {
        setTransitionMsg("Application approved! Taking you to your dashboard...");
        setIsTransitioning(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));

        try {
          const storedRefreshToken = useAuthStore.getState().refreshToken;
          if (storedRefreshToken) {
            const refreshRes = await api.post('/auth/refresh', { refreshToken: storedRefreshToken });
            const { accessToken: newAccess, refreshToken: newRefresh, user: newUser } = refreshRes.data;
            const updatedUser = { ...newUser, primaryRoleVerified: true, verificationStatus: 'APPROVED', isVerified: true, accountStatus: 'ACTIVE' };
            await setAuth(newAccess, newRefresh, updatedUser, 'PROVIDER');
          } else {
            await updateUser({ primaryRoleVerified: true, verificationStatus: 'APPROVED', isVerified: true, accountStatus: 'ACTIVE' });
          }
        } catch (err) {
          await updateUser({ primaryRoleVerified: true, verificationStatus: 'APPROVED', isVerified: true, accountStatus: 'ACTIVE' });
        }
        
        // The AppNavigator will automatically detect the updated authStore state and unmount this screen,
        // routing the user seamlessly to the Provider dashboard. No manual navigation.reset() needed!
      } else if (normalizedStatus === 'REJECTED') {
        setTransitionMsg("Application update received...");
        setIsTransitioning(true);

        const finalReason = reason || 'Application was not approved.';
        await updateUser({
          primaryRoleVerified: false,
          verificationStatus: 'REJECTED',
          isVerified: false,
          rejectionReason: finalReason,
        });
      }
    };

    const checkStatus = async () => {
      if (transitioned || !isMounted || !user.email) return;
      try {
        const response = await api.get('/auth/check-status', { params: { email: user.email } });
        const data = response.data;
        const currentStatus = data?.verificationStatus || (data?.primaryRoleVerified ? 'APPROVED' : 'PENDING_VERIFICATION');

        if (currentStatus === 'APPROVED' || data?.primaryRoleVerified === true) {
          handleStatusUpdate('APPROVED');
        } else if (currentStatus === 'REJECTED' || (data?.rejectionReason && data?.primaryRoleVerified === false)) {
          handleStatusUpdate('REJECTED', data?.rejectionReason);
        }
      } catch (err) {
        // Silently ignore status fetch errors during polling
      }
    };

    // 1. Immediate mount-time check
    checkStatus();

    // 2. Primary real-time mechanism: STOMP WebSocket topic subscription with onConnect auto-check
    stompClient.connect(
      accessToken,
      () => {
        // On successful socket connection or reconnection, perform an immediate status check
        checkStatus();
      }
    );

    const subId = stompClient.subscribe(`/topic/user/${user.id}/status`, (payload: any) => {
      if (!payload || transitioned || !isMounted) return;
      try {
        const status = payload.verificationStatus || payload.status || '';
        const reason = payload.rejectionReason || payload.reason || null;
        if (status) {
          handleStatusUpdate(status, reason);
        }
      } catch (err) {
        // Ignore parse errors
      }
    });
    socketSubRef.current = subId;

    // 3. 5-second Fallback polling interval
    const pollInterval = setInterval(checkStatus, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (socketSubRef.current) {
        stompClient.unsubscribe(socketSubRef.current);
        socketSubRef.current = null;
      }
    };
  }, [accessToken, user, navigation, setAuth, updateUser]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Navigation Bar with Context-Aware Back Action */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={handleBackPress}
          activeOpacity={0.7}
          accessibilityLabel="Sign Out"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.text} />
          <Text style={[styles.backButtonText, { color: colors.text }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Amber pulsing icon */}
        <View style={[styles.iconRing, { borderColor: colors.primaryLight }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="time-outline" size={44} color="#FFF" />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Application Submitted</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Your Student ID has been received. Our admin team is reviewing your application — this typically takes less than 24 hours.
        </Text>

        {/* Live status card */}
        <View style={[styles.statusCard, { backgroundColor: isTransitioning ? colors.primaryLight : colors.cardBackground }]}>
          {isTransitioning ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
          )}
          <Text style={[styles.statusText, { color: isTransitioning ? colors.primary : colors.textMuted, fontWeight: isTransitioning ? '700' : '400' }]}>
            {isTransitioning ? transitionMsg : "Waiting for admin review... This page will update automatically when a decision is made."}
          </Text>
        </View>

        {/* Progress Steps */}
        <View style={[styles.stepsCard, { backgroundColor: colors.cardBackground }]}>
          {[
            { icon: 'checkmark-circle', color: '#8DC63F', text: 'Account created', done: true },
            { icon: 'checkmark-circle', color: '#8DC63F', text: 'Student ID submitted', done: true },
            { icon: 'time-outline', color: colors.primary, text: 'Admin verification (in progress)', done: false },
            { icon: 'lock-closed-outline', color: colors.border, text: 'Provider access unlocked', done: false },
          ].map((step, i, arr) => (
            <View key={i}>
              <View style={styles.stepRow}>
                <Ionicons name={step.icon as 'checkmark-circle'} size={22} color={step.color} />
                <Text style={[styles.stepText, { color: step.done ? colors.text : colors.textMuted }]}>{step.text}</Text>
              </View>
              {i < arr.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: i < 2 ? '#8DC63F' : colors.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.signOutBtn, { backgroundColor: colors.text }]}
            onPress={handleBackPress}
            activeOpacity={0.88}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFF" />
            <Text style={styles.btnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Provider-only scope reminder — low emphasis, consistent with RoleSelectScreen */}
        <Text style={[styles.scopeNote, { color: colors.textMuted }]}>
          Reminder: this is a provider-only account — no student access on this account.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24, paddingHorizontal: 8 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 13, flex: 1, lineHeight: 18 },
  stepsCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    gap: 4,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepText: { fontSize: 14, fontWeight: '600' },
  stepLine: { width: 2, height: 16, marginLeft: 10, marginVertical: 2 },
  actionContainer: { width: '100%' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  scopeNote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },
});
