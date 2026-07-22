import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { api } from '../../services/api';
import { stompClient } from '../../services/socket';

const SUPPORT_EMAIL = 'marshalldalton435@gmail.com';
const SUPPORT_WHATSAPP = 'https://wa.me/233205352535';

export default function AccountRestrictedScreen() {
  const { colors } = useTheme();
  const { user, updateUser, logout } = useAuthStore();
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBanned = user?.accountStatus === 'BANNED';

  // Self-healing: poll + WebSocket listener to detect admin reinstatement.
  // If this screen is open and the admin reinstates the account, the user
  // should automatically leave this screen without needing to sign out and back in.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    // Immediate check on mount
    import('../../services/accountStatusService').then(({ fetchAndResolveAccountStatus }) => {
      fetchAndResolveAccountStatus('AccountRestrictedScreen mount');
    });

    // Poll every 10 seconds (floor frequency)
    pollIntervalRef.current = setInterval(() => {
      import('../../services/accountStatusService').then(({ fetchAndResolveAccountStatus }) => {
        fetchAndResolveAccountStatus('AccountRestrictedScreen poll');
      });
    }, 10000);

    // Also listen for live STOMP push from admin reinstatement
    const token = useAuthStore.getState().accessToken;
    if (token) stompClient.connect(token);
    const subId = stompClient.subscribe(`/topic/user/${userId}/status`, (payload: any) => {
      if (!payload) return;
      console.log('[AccountStatus] AccountRestrictedScreen STOMP push received:', payload);
      // Trigger fresh server check through authoritative resolver
      import('../../services/accountStatusService').then(({ fetchAndResolveAccountStatus }) => {
        fetchAndResolveAccountStatus('WebSocket Push (AccountRestrictedScreen)');
      });
    });

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (subId) stompClient.unsubscribe(subId);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContactEmail = () => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=Account%20Restriction%20Appeal%20%E2%80%94%20${user?.id ?? ''}`
    ).catch(() => {});
  };

  const handleContactWhatsApp = () => {
    Linking.openURL(SUPPORT_WHATSAPP).catch(() => {});
  };

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: colors.errorLight ?? '#FEE2E2' }]}>
          <Ionicons name="ban-outline" size={52} color={colors.error ?? '#EF4444'} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {isBanned ? 'Account Permanently Banned' : 'Account Suspended'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {isBanned
            ? 'Your account has been permanently banned due to a violation of the CampusServ Terms of Service. If you believe this is an error, please contact our support team.'
            : 'Your account has been temporarily suspended. This may be due to a reported issue or a policy violation. Please contact support for more information.'}
        </Text>

        {/* What this means */}
        <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.error ?? '#EF4444'} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              You cannot access any CampusServ features while your account is {isBanned ? 'banned' : 'suspended'}.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              You can still contact support to appeal or get more information.
            </Text>
          </View>
        </View>

        {/* Support CTAs */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Contact Support</Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: '#25D366' }]}
          onPress={handleContactWhatsApp}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>Chat on WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={handleContactEmail}
          activeOpacity={0.85}
        >
          <Ionicons name="mail-outline" size={18} color={colors.primary} />
          <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Email Support</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.border }]}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error ?? '#EF4444'} />
          <Text style={[styles.signOutText, { color: colors.error ?? '#EF4444' }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 28, alignItems: 'center', paddingBottom: 48 },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28, paddingHorizontal: 4 },
  infoCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    marginBottom: 32,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    width: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    width: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  signOutText: { fontSize: 14, fontWeight: '700' },
});
