import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
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

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
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

function Avatar({ uri, name, colors, isDark, size = 48 }: { uri?: string | null; name?: string | null; colors: any; isDark: boolean; size?: number }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const imageUri = getFullImageUrl(uri);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.primaryLight,
      borderColor: isDark ? 'rgba(255,107,53,0.3)' : '#FCE2D6',
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

function ThreadRow({ thread, onPress, colors, isDark, userId }: {
  thread: ChatThread; onPress: () => void; colors: any; isDark: boolean; userId: string;
}) {
  const hasUnread = thread.unreadCount > 0;
  return (
    <TouchableOpacity
      style={[
        styles.rowCard,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          borderWidth: 1,
        },
        hasUnread && {
          borderColor: colors.primary + '50',
          backgroundColor: isDark ? 'rgba(255, 107, 53, 0.08)' : '#FFF9F5',
        }
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Avatar Container */}
      <View style={styles.avatarWrapper}>
        <Avatar uri={thread.otherUserAvatar} name={thread.otherUserName} colors={colors} isDark={isDark} size={50} />
        <View style={[styles.onlineDot, { backgroundColor: '#10B981', borderColor: colors.cardBackground }]} />
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.nameText, { color: colors.text }, hasUnread && styles.boldText]} numberOfLines={1}>
            {thread.otherUserName || 'User'}
          </Text>
          <Text style={[styles.timeText, { color: hasUnread ? colors.primary : colors.textMuted }]}>
            {timeAgo(thread.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[
              styles.previewText,
              { color: hasUnread ? colors.text : colors.textMuted },
              hasUnread && styles.boldText,
            ]}
            numberOfLines={1}
          >
            {thread.lastMessageSenderId === userId ? `You: ${thread.lastMessage || 'Sent a message'}` : thread.lastMessage ?? 'No messages yet'}
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
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: threads, isLoading, isRefetching, refetch } = useQuery<ChatThread[]>({
    queryKey: ['chat-list'],
    queryFn: getChats,
    staleTime: 30_000,
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

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

  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase().trim();
    return threads.filter(
      (t) =>
        t.otherUserName?.toLowerCase().includes(q) ||
        t.lastMessage?.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const renderItem = ({ item }: { item: ChatThread }) => (
    <ThreadRow
      thread={item}
      colors={colors}
      isDark={isDark}
      userId={user?.id ?? ''}
      onPress={() => navigation.navigate('ChatThread', { threadId: item.id, otherUserName: item.otherUserName, otherUserAvatar: item.otherUserAvatar })}
    />
  );

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: 'transparent' }]}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'))}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <View style={[styles.searchBarWrap, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }]}>
            <Ionicons name="search-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search conversations..."
              placeholderTextColor={colors.placeholderText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredThreads}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 24 }
            ]}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="chatbubbles-outline" size={48} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  {searchQuery ? 'Try matching another name or message.' : 'Browse providers and tap "Chat" to start a conversation.'}
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
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 13, height: 13, borderRadius: 6.5, borderWidth: 2,
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  nameText: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8, letterSpacing: -0.2 },
  timeText: { fontSize: 12, fontWeight: '500' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewText: { fontSize: 13, flex: 1, marginRight: 8, lineHeight: 18 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  boldText: { fontWeight: '800' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12, marginTop: 60 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
