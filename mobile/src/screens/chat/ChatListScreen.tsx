import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { stompClient } from '../../services/socket';
import { getChats, ChatThread } from '../../services/chatService';
import { BASE_URL } from '../../services/api';
import AnimatedBackground from '../../components/AnimatedBackground';

function getFullImageUrl(url?: string | null) {
  if (!url) return null;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://') ||
    url.startsWith('content://') ||
    url.startsWith('ph://') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function Avatar({ uri, name, size = 48 }: { uri?: string | null; name?: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const imageUri = getFullImageUrl(uri);
  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ddd' }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.35 }}>{initials}</Text>
    </View>
  );
}

function ThreadRow({ thread, onPress, colors, userId }: {
  thread: ChatThread; onPress: () => void; colors: any; userId: string;
}) {
  const hasUnread = thread.unreadCount > 0;
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <Avatar uri={thread.otherUserAvatar} name={thread.otherUserName} size={50} />
        <View style={[styles.onlineDot, { backgroundColor: '#10B981' }]} />
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.nameText, { color: colors.text }, hasUnread && styles.bold]} numberOfLines={1}>
            {thread.otherUserName || 'User'}
          </Text>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {timeAgo(thread.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[
              styles.previewText,
              { color: hasUnread ? colors.text : colors.textMuted },
              hasUnread && styles.bold,
            ]}
            numberOfLines={1}
          >
            {thread.lastMessageSenderId === userId ? `You: ${thread.lastMessage}` : thread.lastMessage ?? 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{thread.unreadCount > 99 ? '99+' : thread.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: threads, isLoading, isRefetching, refetch } = useQuery<ChatThread[]>({
    queryKey: ['chat-list'],
    queryFn: getChats,
    staleTime: 30_000,
  });

  // Refresh on focus
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Live update: subscribe to the user's notification topic.
  // The backend already publishes a CHAT_MESSAGE notification for every new
  // incoming message. When we receive one, invalidate the chat-list query so
  // React Query refetches the thread list with updated preview + unread count.
  useEffect(() => {
    const { accessToken, user: authUser } = useAuthStore.getState();
    if (!accessToken || !authUser?.id) return;

    stompClient.connect(accessToken);
    const subId = stompClient.subscribe(
      `/topic/user/${authUser.id}/notifications`,
      (payload: any) => {
        if (payload?.type === 'CHAT_MESSAGE') {
          qc.invalidateQueries({ queryKey: ['chat-list'] });
        }
      }
    );

    return () => {
      stompClient.unsubscribe(subId);
    };
  }, [qc]);

  const renderItem = ({ item }: { item: ChatThread }) => (
    <ThreadRow
      thread={item}
      colors={colors}
      userId={user?.id ?? ''}
      onPress={() => navigation.navigate('ChatThread', { threadId: item.id, otherUserName: item.otherUserName, otherUserAvatar: item.otherUserAvatar })}
    />
  );

  return (
    <AnimatedBackground style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={threads ?? []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Browse providers and tap "Chat" to start a conversation.
              </Text>
            </View>
          }
          contentContainerStyle={threads?.length === 0 ? { flex: 1 } : { paddingBottom: insets.bottom + 16 }}
        />
      )}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrapper: { position: 'relative', marginRight: 12 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff',
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  nameText: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  timeText: { fontSize: 12 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewText: { fontSize: 13, flex: 1, marginRight: 8 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bold: { fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
