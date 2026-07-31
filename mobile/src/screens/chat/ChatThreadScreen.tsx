import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { stompClient } from '../../services/socket';
import {
  getChatMessages,
  markAsRead,
  sendMessage,
  sendImageMessage,
  ChatMessage,
} from '../../services/chatService';
import { BASE_URL } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
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

function timeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ uri, name, size = 36 }: { uri?: string | null; name?: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
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
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.35 }}>{initials}</Text>
    </View>
  );
}

interface MessageBubbleProps {
  msg: ChatMessage;
  isMine: boolean;
  colors: any;
  showAvatar: boolean;
  otherUserAvatar?: string | null;
  otherUserName?: string | null;
  onImagePress?: (url: string) => void;
}

function MessageBubble({ msg, isMine, colors, showAvatar, otherUserAvatar, otherUserName, onImagePress }: MessageBubbleProps) {
  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
      {!isMine && (
        <View style={styles.avatarSlot}>
          {showAvatar ? <Avatar uri={otherUserAvatar} name={otherUserName} size={28} /> : <View style={{ width: 28 }} />}
        </View>
      )}
      <View style={[
        styles.bubble,
        isMine
          ? [styles.bubbleMine, { backgroundColor: colors.primary }]
          : [styles.bubbleOther, { backgroundColor: colors.cardBackground, borderColor: colors.border }],
      ]}>
        {msg.imageUrl ? (
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => onImagePress?.(getFullImageUrl(msg.imageUrl)!)}
          >
            <Image
              source={{ uri: getFullImageUrl(msg.imageUrl) || undefined }}
              style={styles.imageMsg}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : null}
        {msg.content ? (
          <Text style={[styles.bubbleText, { color: isMine ? '#fff' : colors.text }]}>
            {msg.content}
          </Text>
        ) : null}
        <Text style={[styles.bubbleTime, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
          {timeLabel(msg.sentAt)}
        </Text>
      </View>
    </View>
  );
}

export default function ChatThreadScreen({ route, navigation }: any) {
  const { threadId, otherUserName, otherUserAvatar } = route.params as {
    threadId: string;
    otherUserName?: string | null;
    otherUserAvatar?: string | null;
  };

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  // Load initial messages
  const loadMessages = useCallback(async (p = 0) => {
    try {
      const data = await getChatMessages(threadId, p, 40);
      if (p === 0) {
        setMessages(data);
      } else {
        setMessages(prev => [...prev, ...data]);
      }
      setHasMore(data.length === 40);
    } catch (e) {
      console.warn('Failed to load messages:', e);
    }
  }, [threadId]);

  useEffect(() => {
    setLoading(true);
    loadMessages(0).finally(() => setLoading(false));
  }, [loadMessages]);

  // Mark as read when screen is focused
  useFocusEffect(useCallback(() => {
    markAsRead(threadId).catch(() => {});
  }, [threadId]));

  // STOMP live subscription
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (token) stompClient.connect(token);

    const subId = stompClient.subscribe(`/topic/chat.thread.${threadId}`, (payload: any) => {
      try {
        const raw = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const incoming: ChatMessage = {
          id: raw.id,
          threadId: raw.threadId,
          senderId: raw.senderId,
          content: raw.content ?? null,
          imageUrl: raw.imageUrl ?? null,
          sentAt: Array.isArray(raw.sentAt)
            ? new Date(Date.UTC(raw.sentAt[0], raw.sentAt[1] - 1, raw.sentAt[2], raw.sentAt[3] || 0, raw.sentAt[4] || 0, raw.sentAt[5] || 0)).toISOString()
            : (raw.sentAt ?? new Date().toISOString()),
          readAt: raw.readAt ?? null,
        };

        // Deduplicate
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
        markAsRead(threadId).catch(() => {});
      } catch (err) {
        console.warn('Failed to parse incoming chat message:', err);
      }
    });

    return () => {
      stompClient.unsubscribe(subId);
    };
  }, [threadId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      const sent = await sendMessage(threadId, trimmed);
      setMessages(prev => {
        if (prev.some(m => m.id === sent.id)) return prev;
        return [sent, ...prev];
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll access is needed to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingImage(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      const mimeType = asset.mimeType || 'image/jpeg';
      const fileExt = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
      const filename = `chat_${Date.now()}.${fileExt}`;
      formData.append('file', { uri: asset.uri, name: filename, type: mimeType } as any);
      const sent = await sendImageMessage(threadId, formData);
      setMessages(prev => {
        if (prev.some(m => m.id === sent.id)) return prev;
        return [sent, ...prev];
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadMessages(nextPage);
    setLoadingMore(false);
  };

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.senderId === user?.id;
    const nextItem = messages[index + 1];
    const showAvatar = !nextItem || nextItem.senderId !== item.senderId;
    return (
      <MessageBubble
        msg={item}
        isMine={isMine}
        colors={colors}
        showAvatar={showAvatar}
        otherUserAvatar={otherUserAvatar}
        otherUserName={otherUserName}
        onImagePress={setImageModalUrl}
      />
    );
  };

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: 'transparent' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Avatar uri={otherUserAvatar} name={otherUserName} size={36} />
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
              {otherUserName ?? 'Chat'}
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          inverted
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ padding: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyMsg}>
              <Text style={[styles.emptyMsgText, { color: colors.textMuted }]}>
                No messages yet. Say hello! 👋
              </Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 6, borderTopColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity onPress={handlePickImage} style={styles.attachBtn} disabled={uploadingImage}>
          {uploadingImage
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="image-outline" size={24} color={colors.textMuted} />
          }
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
          placeholder="Message..."
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.inputBackground }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color={text.trim() ? '#fff' : colors.textMuted} />
          }
        </TouchableOpacity>
      </View>

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={!!imageModalUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalUrl(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlayViewer}
          activeOpacity={1}
          onPress={() => setImageModalUrl(null)}
        >
          <SafeAreaView style={styles.viewerContainer}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.viewerCloseBtn} 
              onPress={() => setImageModalUrl(null)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {imageModalUrl ? (
              <Image
                source={{ uri: imageModalUrl }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            ) : null}
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubbleRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  avatarSlot: { width: 36, marginRight: 6 },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  imageMsg: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },
  emptyMsg: { alignItems: 'center', paddingVertical: 60 },
  emptyMsgText: { fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  attachBtn: { padding: 6, marginBottom: 2 },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  modalOverlayViewer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
});
