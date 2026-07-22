import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { api } from '../../services/api';
import { useTheme } from '../../styles/ThemeContext';
import { useToast } from '../../styles/ToastContext';

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
  | 'SYSTEM';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  referenceId?: string; // jobId, requestId, disputeId, etc.
  createdAt: string;
}

// ─────────────────────────────────────────────────────────
//  Icon + colour mapping
// ─────────────────────────────────────────────────────────

const NOTIF_META: Record<NotifType, { icon: string; color: string }> = {
  NEW_BID: { icon: 'pricetag-outline', color: '#7C3AED' },
  BID_ACCEPTED: { icon: 'checkmark-circle-outline', color: '#10B981' },
  JOB_STARTED: { icon: 'play-circle-outline', color: '#3B82F6' },
  JOB_COMPLETE: { icon: 'trophy-outline', color: '#F59E0B' },
  PAYMENT_RELEASED: { icon: 'wallet-outline', color: '#10B981' },
  DISPUTE_UPDATE: { icon: 'alert-circle-outline', color: '#EF4444' },
  REVIEW_REQUEST: { icon: 'star-outline', color: '#F59E0B' },
  SYSTEM: { icon: 'information-circle-outline', color: '#6B7280' },
};

const getMeta = (type: NotifType) =>
  NOTIF_META[type] ?? NOTIF_META.SYSTEM;

// ─────────────────────────────────────────────────────────
//  Relative time helper
// ─────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─────────────────────────────────────────────────────────
//  Navigation resolver: determine where each notification leads
// ─────────────────────────────────────────────────────────

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
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────
//  Notification row component
// ─────────────────────────────────────────────────────────

function NotificationRow({
  item,
  colors,
  onPress,
  onDelete,
}: {
  item: Notification;
  colors: any;
  onPress: (n: Notification) => void;
  onDelete: (id: string) => void;
}) {
  const meta = getMeta(item.type);
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: item.read ? colors.cardBackground : colors.inputBackground,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.rowPressable}
        onPress={() => onPress(item)}
        activeOpacity={0.75}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon as any} size={22} color={meta.color} />
        </View>

        {/* Content */}
        <View style={styles.textWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
          </View>
          <Text style={[styles.rowBody, { color: colors.textMuted }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.rowTime, { color: colors.textMuted }]}>{relativeTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>

      {/* Delete button */}
      <TouchableOpacity 
        style={styles.deleteItemBtn} 
        onPress={() => onDelete(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
//  Main screen
// ─────────────────────────────────────────────────────────

export default function NotificationCenterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const { user } = useAuthStore();
  const isViewingAsProvider = user?.role === 'PROVIDER';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/notifications');
      const rawList = res.data?.content ?? (Array.isArray(res.data) ? res.data : []);
      const mapped = rawList.map((n: any) => ({
        id: n.id,
        type: n.type || 'SYSTEM',
        title: n.title,
        body: n.message || n.body || '',
        read: n.isRead ?? n.read ?? false,
        referenceId: n.referenceId,
        createdAt: n.createdAt,
      }));
      setNotifications(mapped);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  const filteredNotifications = (notifications ?? []).filter((item) => {
    const isProvType = ['BID_ACCEPTED', 'PAYMENT_RELEASED'].includes(item.type);
    if (isViewingAsProvider) {
      return isProvType || item.type === 'SYSTEM' || item.type === 'DISPUTE_UPDATE';
    } else {
      return !isProvType;
    }
  });

  const handlePress = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        setNotifications((prev) =>
          (prev ?? []).map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
        );
      } catch (error: any) {
        console.error("Failed to mark notification as read:", error.response?.data || error.message);
        showToast({
          status: 'error',
          title: 'Failed to mark notification as read',
          subtitle: error.response?.data || error.message
        });
      }
    }

    // Navigate to relevant screen
    const target = resolveNavigationTarget(notification);
    if (target) {
      let finalScreen = target.screen;
      const finalParams = target.params;

      // Guard and redirect based on role view
      if (isViewingAsProvider) {
        if (finalScreen === 'RequestDetails') {
          finalScreen = 'RequestDetailForProvider';
        } else if (finalScreen === 'RateProvider') {
          // Providers don't rate providers
          return;
        }
      } else {
        // Client view
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
      setNotifications((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
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
              setNotifications([]);
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
      setNotifications((prev) => (prev ?? []).filter((n) => n.id !== id));
      showToast({ status: 'success', title: 'Notification deleted.' });
    } catch {
      showToast({ status: 'error', title: 'Failed to delete notification.' });
    }
  };

  const unreadCount = (filteredNotifications ?? []).filter((n) => !n.read).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 60, justifyContent: 'flex-end' }}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={{ padding: 4 }}>
              <Ionicons name="mail-open-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          {filteredNotifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow 
              item={item} 
              colors={colors} 
              onPress={handlePress} 
              onDelete={handleDeleteNotification}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centeredState}>
              <Ionicons name="notifications-off-outline" size={52} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                You're all caught up! Notifications for bids, job updates, and payments will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  markAllBtn: { paddingHorizontal: 8 },
  markAllText: { fontSize: 13, fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingRight: 8,
  },
  rowPressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    flex: 1,
    gap: 12,
  },
  deleteItemBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  rowBody: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  rowTime: { fontSize: 11 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'center',
    flexShrink: 0,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
