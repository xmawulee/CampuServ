import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import type { ProviderJob, ProviderWallet } from '../../types/provider';
import { getProviderJobSummary, JobSummary } from '../../services/jobService';
import { stompClient } from '../../services/socket';
import { RoleSwitcher } from '../../components/RoleSwitcher';

type DashboardStats = {
  balance: number;
  pendingEscrow: number;
  jobSummary: JobSummary | null;
  pendingBidsCount: number;
};

export default function ProviderDashboardHomeScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const [stats, setStats] = useState<DashboardStats>({
    balance: 0,
    pendingEscrow: 0,
    jobSummary: null,
    pendingBidsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const [walletRes, summaryRes] = await Promise.allSettled([
        api.get('/payments/provider/wallet'),
        getProviderJobSummary(user.id),
      ]);

      const wallet: ProviderWallet | null =
        walletRes.status === 'fulfilled' ? walletRes.value.data : null;
      const summary: JobSummary | null =
        summaryRes.status === 'fulfilled' ? summaryRes.value : null;

      setStats({
        balance: wallet?.balance ?? 0,
        pendingEscrow: wallet?.escrowHeld ?? 0,
        jobSummary: summary,
        pendingBidsCount: 0,
      });
    } catch (e) {
      // Keep existing state on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  React.useEffect(() => {
    let subId: string | null = null;
    let debounceTimer: NodeJS.Timeout;

    const setupStomp = async () => {
      if (!user) return;
      try {
        const token = useAuthStore.getState().accessToken;
        if (!token) return;

        stompClient.connect(token);
        const topic = `/topic/provider/${user.id}/job-updates`;

        subId = stompClient.subscribe(topic, (msg: any) => {
          console.log('STOMP WS: Job update for provider:', msg);
          // Debounce the re-fetch to avoid spamming the backend
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchDashboardData();
          }, 300);
        });
      } catch (err) {
        console.warn('Failed to setup STOMP in Provider Dashboard:', err);
      }
    };

    setupStomp();

    return () => {
      clearTimeout(debounceTimer);
      if (subId) stompClient.unsubscribe(subId);
    };
  }, [user, fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return colors.primary;
      case 'IN_PROGRESS': return colors.success;
      case 'PROOF_SUBMITTED': return colors.warning;
      case 'DISPUTED': return colors.error;
      default: return colors.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'ACCEPTED';
      case 'IN_PROGRESS': return 'IN PROGRESS';
      case 'PROOF_SUBMITTED': return 'FINISHED';
      case 'DISPUTED': return 'DISPUTED';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.greetingSub, { color: colors.textMuted }]}>Dashboard</Text>
            <Text style={[styles.greetingName, { color: colors.text }]}>
              {getGreeting()}, {user?.fullName?.split(' ')[0]} 👋
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <RoleSwitcher />
            <TouchableOpacity
              style={[styles.notificationBtn, { backgroundColor: colors.inputBackground }]}
              onPress={() => navigation.navigate('NotificationCenter')}
              accessibilityLabel="Open Notifications"
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Earnings Card ── */}
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceCardLabel}>Available Earnings</Text>
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => navigation.navigate('Wallet')}
              activeOpacity={0.8}
            >
              <Text style={styles.withdrawBtnText}>Wallet →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceCardAmount}>
            {stats.balance.toFixed(2)} GHS
          </Text>
        </View>

        {/* ── Snapshot Grid ── */}
        <View style={styles.snapshotGrid}>
          <TouchableOpacity
            style={[styles.snapshotCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => navigation.navigate('ProviderJobs')}
            activeOpacity={0.8}
          >
            <View style={[styles.snapshotIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="briefcase" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.snapshotValue, { color: colors.text }]}>
              {stats.jobSummary?.active?.count ?? 0}
            </Text>
            <Text style={[styles.snapshotLabel, { color: colors.textMuted }]}>Active Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.snapshotCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => navigation.navigate('ProviderJobs')}
            activeOpacity={0.8}
          >
            <View style={[styles.snapshotIconWrap, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            </View>
            <Text style={[styles.snapshotValue, { color: colors.text }]}>
              {stats.jobSummary?.inProgress?.count ?? 0}
            </Text>
            <Text style={[styles.snapshotLabel, { color: colors.textMuted }]}>In Progress</Text>
          </TouchableOpacity>
        </View>

        {/* ── Active Jobs List ── */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Jobs</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProviderJobs')} activeOpacity={0.7}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {!stats.jobSummary?.active?.jobs || stats.jobSummary.active.jobs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="briefcase-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Jobs</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Browse the Opportunity Feed to find and bid on student requests.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('IncomingRequests')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyBtnText}>Browse Requests</Text>
            </TouchableOpacity>
          </View>
        ) : (
          stats.jobSummary.active.jobs.slice(0, 3).map((job) => {
            const statusColor = getStatusColor(job.status);
            return (
              <TouchableOpacity
                key={job.id}
                style={[styles.jobCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => navigation.navigate('ActiveJob', { jobId: job.id })}
                activeOpacity={0.85}
              >
                <View style={styles.jobTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.jobId, { color: colors.textMuted }]}>
                      Job #{job.id.slice(-6).toUpperCase()}
                    </Text>
                    <Text style={[styles.jobRequestId, { color: colors.text }]} numberOfLines={1}>
                      Request: {job.requestId}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusPillText, { color: statusColor }]}>
                      {getStatusLabel(job.status)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.jobFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.jobDate, { color: colors.textMuted }]}>
                    Started {new Date(job.createdAt).toLocaleDateString()}
                  </Text>
                  <View style={styles.jobActions}>
                    <TouchableOpacity
                      style={[styles.actionChip, { backgroundColor: colors.primaryLight }]}
                      onPress={() => navigation.navigate('ActiveJob', { jobId: job.id })}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.actionChipText, { color: colors.primary }]}>Manage →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 110 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24, paddingTop: 8,
  },
  greetingSub: { fontSize: 12, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  greetingName: { fontSize: 24, fontWeight: '800' },
  notificationBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Balance card
  balanceCard: {
    borderRadius: 24, padding: 22, marginBottom: 24,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  balanceCardLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  withdrawBtn: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  withdrawBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  balanceCardAmount: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', marginBottom: 16 },
  escrowRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, gap: 8 },
  escrowText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  // Snapshot grid
  snapshotGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  snapshotCard: { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1 },
  snapshotIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  snapshotValue: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  snapshotLabel: { fontSize: 12, fontWeight: '600' },

  // Section header
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },

  // Empty state
  emptyCard: {
    borderRadius: 20, borderWidth: 1, padding: 32,
    alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 },
  emptyBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Job card
  jobCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  jobId: { fontSize: 11, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  jobRequestId: { fontSize: 13, fontWeight: '600' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 1 },
  jobDate: { fontSize: 12 },
  jobActions: { flexDirection: 'row', gap: 8 },
  actionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  actionChipText: { fontSize: 12, fontWeight: '700' },
});
