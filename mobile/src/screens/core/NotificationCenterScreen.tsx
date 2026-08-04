import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { api } from '../../services/api';
import { useTheme } from '../../styles/ThemeContext';
import { useToast } from '../../styles/ToastContext';
import AnimatedBackground from '../../components/AnimatedBackground';

// ─────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────

type NotifType =
  | 'NEW_BID'
  | 'BID_ACCEPTED'
  | 'JOB_STARTED'
  | 'JOB_COMPLETE'
  | 'PAYMENT_RELEASED'
  | 'DISPUTE_UPDATE'
  | 'REVIEW_REQUEST'
  | 'SYSTEM'
  | 'ANNOUNCEMENT'
  | 'CHAT_MESSAGE';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  referenceId?: string;
  createdAt: string;
  isAnnouncement?: boolean;
  severity?: string;
}

// ─────────────────────────────────────────────────────────
//  Icon + colour mapping
// ─────────────────────────────────────────────────────────

const NOTIF_META: Record<NotifType, { icon: string; color: string }> = {
  NEW_BID: { icon: 'pricetag-outline', color: '#FF6B35' },
  BID_ACCEPTED: { icon: 'checkmark-circle-outline', color: '#10B981' },
  JOB_STARTED: { icon: 'play-circle-outline', color: '#3B82F6' },
  JOB_COMPLETE: { icon: 'trophy-outline', color: '#F59E0B' },
  PAYMENT_RELEASED: { icon: 'wallet-outline', color: '#10B981' },
  DISPUTE_UPDATE: { icon: 'alert-circle-outline', color: '#EF4444' },
  REVIEW_REQUEST: { icon: 'star-outline', color: '#F59E0B' },
  SYSTEM: { icon: 'information-circle-outline', color: '#6B7280' },
  ANNOUNCEMENT: { icon: 'megaphone-outline', color: '#3B82F6' },
  CHAT_MESSAGE: { icon: 'chatbubble-outline', color: '#8B5CF6' },
};

const getMeta = (type: NotifType) =>
  NOTIF_META[type] ?? NOTIF_META.SYSTEM;

function relativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (isNaN(diff)) return '';
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function resolveNavigationTarget(notification: Notification): { screen: string; params: Record<string, any> } | null {
  const { type, referenceId } = notification;
  if (!referenceId) return null;
  switch (type) {
    case 'NEW_BID':
    case 'BID_ACCEPTED':
      return { screen: 'RequestDetails', params: { requestId: referenceId } };
    case 'JOB_STARTED':
    case 'JOB_COMPLETE':
    case 'PAYMENT_RELEASED':
      return { screen: 'ActiveJob', params: { jobId: referenceId } };
    case 'DISPUTE_UPDATE':
      return { screen: 'DisputeThread', params: { disputeId: referenceId } };
    case 'REVIEW_REQUEST':
      return { screen: 'RateProvider', params: { jobId: referenceId } };
    case 'CHAT_MESSAGE':
      return { screen: 'ChatList', params: {} };
    default:
      return null;
  }
}

function NotificationRow({
  item,
  colors,
  isDark,
  onPress,
  onDelete,
}: {
  item: Notification;
  colors: any;
  isDark: boolean;
  onPress: (n: Notification) => void;
  onDelete: (id: string) => void;
}) {
  let meta = getMeta(item.type);
  if (item.isAnnouncement) {
    if (item.severity === 'HIGH') meta = { icon: 'megaphone-outline', color: '#EF4444' };
    else if (item.severity === 'WARNING') meta = { icon: 'warning-outline', color: '#F59E0B' };
    else meta = { icon: 'megaphone-outline', color: '#3B82F6' };
  }
  const isUnread = !item.read;

  return (
    <View
      style={[
        styles.rowCard,
        {
          backgroundColor: isUnread
            ? (isDark ? 'rgba(255, 107, 53, 0.08)' : '#FFF9F5')
            : colors.cardBackground,
          borderColor: isUnread ? colors.primary + '50' : colors.border,
          borderWidth: 1,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.rowPressable}
        onPress={() => onPress(item)}
        activeOpacity={0.88}
      >
        {/* Icon Container */}
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={22} color={meta.color} />
        </View>

        {/* Content */}
        <View style={styles.textWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {isUnread && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
            </View>
          </View>
          <Text style={[styles.rowBody, { color: colors.textMuted }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.rowTime, { color: colors.textMuted }]}>{relativeTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>

      {/* Delete button */}
      {!item.isAnnouncement && (
        <TouchableOpacity 
          style={styles.deleteItemBtn} 
          onPress={() => onDelete(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function NotificationCenterScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'UNREAD' | 'BIDS'>('ALL');

  const { user } = useAuthStore();
  const isViewingAsProvider = user?.role === 'PROVIDER';

  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading: loading, isRefetching: refreshing, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const [notifRes, annRes] = await Promise.all([
        api.get('/notifications').catch(() => ({ data: [] })),
        api.get('/announcements/active').catch(() => ({ data: [] }))
      ]);

      const rawList = notifRes.data?.content ?? (Array.isArray(notifRes.data) ? notifRes.data : []);
      const mapped = rawList.map((n: any) => ({
        id: n.id,
        type: n.type || 'SYSTEM',
        title: n.title,
        body: n.message || n.body || '',
        read: n.isRead ?? n.read ?? false,
        referenceId: n.referenceId,
        createdAt: n.createdAt,
      }));

      const rawAnn = annRes.data ?? [];
      const mappedAnn = rawAnn.map((a: any) => ({
        id: a.id,
        type: 'ANNOUNCEMENT',
        title: a.title,
        body: a.message,
        read: true,
        referenceId: undefined,
        createdAt: a.createdAt,
        isAnnouncement: true,
        severity: a.severity
      }));

      const combined = [...mapped, ...mappedAnn].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return combined as Notification[];
    },
  });

  const notifications = notificationsData || [];

  const roleFilteredNotifications = useMemo(() => {
    return (notifications ?? []).filter((item) => {
      if (item.isAnnouncement) return true;
      const isProvType = ['BID_ACCEPTED', 'PAYMENT_RELEASED'].includes(item.type);
      if (isViewingAsProvider) {
        return isProvType || item.type === 'SYSTEM' || item.type === 'DISPUTE_UPDATE';
      } else {
        return !isProvType;
      }
    });
  }, [notifications, isViewingAsProvider]);

  const displayNotifications = useMemo(() => {
    if (activeTabFilter === 'UNREAD') {
      return roleFilteredNotifications.filter(n => !n.read);
    }
    if (activeTabFilter === 'BIDS') {
      return roleFilteredNotifications.filter(n => n.type === 'NEW_BID' || n.type === 'BID_ACCEPTED');
    }
    return roleFilteredNotifications;
  }, [roleFilteredNotifications, activeTabFilter]);

  const handlePress = async (notification: Notification) => {
    if (notification.isAnnouncement) {
      Alert.alert(notification.title, notification.body);
      return;
    }
    if (!notification.read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        queryClient.setQueryData(['notifications'], (prev: Notification[] | undefined) =>
          (prev ?? []).map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
        );
      } catch (error: any) {
        console.error("Failed to mark notification as read:", error.response?.data || error.message);
      }
    }

    const target = resolveNavigationTarget(notification);
    if (target) {
      let finalScreen = target.screen;
      const finalParams = target.params;

      if (isViewingAsProvider) {
        if (finalScreen === 'RequestDetails') {
          finalScreen = 'RequestDetailForProvider';
        } else if (finalScreen === 'RateProvider') {
          return;
        }
      } else {
        if (finalScreen === 'RequestDetailForProvider') {
          finalScreen = 'RequestDetails';
        }
      }

      navigation.navigate(finalScreen, finalParams);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      queryClient.setQueryData(['notifications'], (prev: Notification[] | undefined) => (prev ?? []).map((n) => n.isAnnouncement ? n : { ...n, read: true }));
      showToast({ status: 'success', title: 'All notifications marked as read.' });
    } catch {
      showToast({ status: 'error', title: 'Failed to mark all as read.' });
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to delete all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive", 
          onPress: async () => {
            try {
              await api.delete('/notifications');
              queryClient.setQueryData(['notifications'], (prev: Notification[] | undefined) => (prev ?? []).filter(n => n.isAnnouncement));
              showToast({ status: 'success', title: 'All notifications cleared.' });
            } catch {
              showToast({ status: 'error', title: 'Failed to clear notifications.' });
            }
          } 
        }
      ]
    );
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      queryClient.setQueryData(['notifications'], (prev: Notification[] | undefined) => (prev ?? []).filter((n) => n.id !== id));
      showToast({ status: 'success', title: 'Notification deleted.' });
    } catch {
      showToast({ status: 'error', title: 'Failed to delete notification.' });
    }
  };

  const unreadCount = (roleFilteredNotifications ?? []).filter((n) => !n.read).length;

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={handleMarkAllRead} style={[styles.headerActionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Ionicons name="mail-open" size={18} color="#10B981" />
              </TouchableOpacity>
            )}
            {roleFilteredNotifications.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} style={[styles.headerActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Ionicons name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab Filters */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'UNREAD', label: `Unread (${unreadCount})` },
              { id: 'BIDS', label: 'Bids & Offers' },
            ].map(tab => {
              const isActive = activeTabFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabPill,
                    isActive
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }
                  ]}
                  onPress={() => setActiveTabFilter(tab.id as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabPillText, { color: isActive ? '#FFF' : colors.text, fontWeight: isActive ? '800' : '600' }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={displayNotifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationRow 
                item={item} 
                colors={colors}
                isDark={isDark} 
                onPress={handlePress} 
                onDelete={handleDeleteNotification}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom + 24, 40) },
            ]}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => refetch()}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.centeredState}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="notifications-off-outline" size={44} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  You're all caught up! Notifications for bids, job updates, and payments will appear here.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerActionBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tabPillText: {
    fontSize: 12,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rowPressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    flex: 1,
    gap: 14,
  },
  deleteItemBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: { flex: 1, paddingTop: 2 },
  rowTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  rowBody: { fontSize: 13, lineHeight: 19, marginBottom: 6, marginTop: 2 },
  rowTime: { fontSize: 11, fontWeight: '600' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
    marginTop: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
