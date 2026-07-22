import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Vibration,
  Alert,
} from 'react-native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { stompClient } from '../../services/socket';
import * as crypto from 'expo-crypto';

import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { useToast } from '../../styles/ToastContext';
import { 
  getChatHistory, 
  getThreadForRequest, 
  ChatThreadResponse, 
  ChatMessageResponse, 
  PaginatedChatHistory 
} from '../../services/chatService';
import { BASE_URL } from '../../services/api';
import { MAX_MESSAGE_LENGTH } from '../../constants/chat';
import ENV from '../../config/env';

export default function ChatScreen({ route, navigation }: any) {
  const { requestId } = route.params;
  const { user, accessToken } = useAuthStore();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [thread, setThread] = useState<ChatThreadResponse | null>(null);
  const [inputText, setInputText] = useState('');
  const [connected, setConnected] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 1. Initial Load of Thread Info
  useEffect(() => {
    let isMounted = true;
    const initThread = async () => {
      try {
        const chatThread = await getThreadForRequest(requestId);
        if (isMounted) {
          setThread(chatThread);
          setIsLocked(chatThread.status === 'LOCKED');
        }
      } catch (e) {
        console.warn('Failed to load thread details', e);
      }
    };
    initThread();
    return () => { isMounted = false; };
  }, [requestId]);

  // Set Up Custom Screen Header
  useEffect(() => {
    if (thread && thread.otherParticipant) {
      const otherUser = thread.otherParticipant;
      const avatarUrl = otherUser.profilePictureUrl;
      const name = otherUser.fullName || 'User';

      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerContainer}>
            {avatarUrl ? (
              <Image
                source={{
                  uri: avatarUrl.startsWith('http')
                    ? avatarUrl
                    : `${BASE_URL}${avatarUrl}`,
                }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.headerAvatarPlaceholderText, { color: colors.primary }]}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.headerSubtext, { color: isLocked ? colors.error : colors.success }]}>
                {isLocked ? 'Closed' : 'Active'}
              </Text>
            </View>
          </View>
        ),
      });
    }
  }, [thread, isLocked, colors, navigation]);

  // 2. Load History using Infinite Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHistory,
  } = useInfiniteQuery<PaginatedChatHistory, Error, { pages: PaginatedChatHistory[], pageParams: number[] }, readonly string[], number>({
    queryKey: ['chatHistory', thread?.id ?? ''],
    queryFn: ({ pageParam = 0 }) => getChatHistory(thread!.id, pageParam, 30),
    getNextPageParam: (lastPage: PaginatedChatHistory) => 
      lastPage.currentPage < lastPage.totalPages - 1 ? lastPage.currentPage + 1 : undefined,
    initialPageParam: 0,
    enabled: !!thread?.id,
  });

  const messages = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page: PaginatedChatHistory) => page.content);
  }, [data]);

  // Helper to safely update query cache
  const updateMessageInCache = useCallback((updater: (pages: PaginatedChatHistory[]) => PaginatedChatHistory[]) => {
    if (!thread?.id) return;
    queryClient.setQueryData<{ pages: PaginatedChatHistory[], pageParams: any[] }>(
      ['chatHistory', thread.id],
      (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: updater(oldData.pages),
        };
      }
    );
  }, [thread?.id, queryClient]);

  // 3. Connect STOMP Client
  useEffect(() => {
    if (!thread?.id || !accessToken) return;

    let subId: string | null = null;

    stompClient.connect(
      accessToken,
      () => {
        setConnected(true);
        
        // Subscribe to thread topic
        subId = stompClient.subscribe(`/topic/chat/${thread.id}`, (newMsg: any) => {
          try {
            if (newMsg.senderId !== user?.id) {
              if (Platform.OS !== 'web') Vibration.vibrate(80);
            }

            // Reconcile/Add to cache
            updateMessageInCache((pages) => {
              const newPages = [...pages];
              if (newPages.length === 0) return newPages;
              
              // If it's an echo of our own message, replace optimistic bubble
              if (newMsg.clientTempId) {
                const tempIndex = newPages[0].content.findIndex(m => m.clientTempId === newMsg.clientTempId);
                if (tempIndex !== -1) {
                  const updatedContent = [...newPages[0].content];
                  updatedContent[tempIndex] = newMsg;
                  newPages[0] = { ...newPages[0], content: updatedContent };
                  return newPages;
                }
              }
              
              // Prevent duplicate insertion by actual ID
              if (!newPages[0].content.some(m => m.id === newMsg.id)) {
                newPages[0] = { ...newPages[0], content: [newMsg, ...newPages[0].content] };
              }
              return newPages;
            });

            // If system message locking thread
            if (newMsg.type === 'SYSTEM' && newMsg.content?.includes('closed')) {
              setIsLocked(true);
            }

          } catch (e) {
            console.warn('STOMP Parse Error:', e);
          }
        });
        
        // Re-fetch latest history to cover gaps during disconnect
        queryClient.invalidateQueries({ queryKey: ['chatHistory', thread.id] });
      },
      () => {
        setConnected(false);
      }
    );

    return () => {
      if (subId) stompClient.unsubscribe(subId);
    };
  }, [thread?.id, accessToken, user?.id, updateMessageInCache, queryClient]);

  // 3.5 Handle text input
  const handleTextChange = (text: string) => {
    setInputText(text);
  };

  // 4. Send Message
  const handleSend = (text: string = inputText) => {
    if (!text.trim() || !user || !thread || !connected || isLocked) return;

    const contentText = text.trim();
    if (contentText.length > MAX_MESSAGE_LENGTH) {
      showToast({ status: 'error', title: 'Too Long', subtitle: `Messages must be under ${MAX_MESSAGE_LENGTH} characters.` });
      return;
    }
    
    setInputText('');

    const tempId = `temp-${crypto.randomUUID()}`;
    const optMessage: ChatMessageResponse = {
      id: tempId, // Temporary ID
      threadId: thread.id,
      senderId: user.id,
      type: 'TEXT',
      content: contentText,
      mediaUrl: null,
      mediaDurationSeconds: null,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      clientTempId: tempId,
    };

    // Add optimistic bubble
    updateMessageInCache((pages) => {
      const newPages = [...pages];
      if (newPages.length === 0) return [{ content: [optMessage], currentPage: 0, totalPages: 1, totalItems: 1 }];
      newPages[0] = { ...newPages[0], content: [optMessage, ...newPages[0].content] };
      return newPages;
    });

    // Publish via STOMP
    try {
      stompClient.sendMessage(`/app/chat/${thread.id}/send`, { content: contentText, clientTempId: tempId });
    } catch (e) {
      console.warn("Failed to send message", e);
    }
  };


  // Render Single Message
  const renderMessageItem = ({ item }: { item: ChatMessageResponse }) => {
    if (item.type === 'SYSTEM') {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={[styles.systemMessageText, { color: colors.textMuted }]}>{item.content}</Text>
        </View>
      );
    }

    const isMe = item.senderId === user?.id;

    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.myBubbleWrapper : styles.otherBubbleWrapper]}>
        <View
          style={[
            styles.bubble,
            isMe
              ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
              : { backgroundColor: colors.inputBackground, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.messageText, isMe ? styles.myMessageText : { color: colors.text }]}>
            {item.content}
          </Text>

          <View style={styles.footerRow}>
            <Text style={[styles.timestamp, { color: isMe ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!thread) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Reconnecting Banner */}
      {!connected && (
        <View style={styles.reconnectingBanner}>
          <Text style={styles.reconnectingBannerText}>Reconnecting...</Text>
        </View>
      )}

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyExtractor={(item) => item.clientTempId || item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messageList}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage || isLoadingHistory ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
          ) : null
        }
        ListEmptyComponent={
          !isLoadingHistory ? (
            <View style={styles.emptyChat}>
              <Text style={[styles.emptyChatText, { color: colors.textMuted }]}>
                No messages yet. Say hello to get started!
              </Text>
            </View>
          ) : null
        }
      />


      {/* Input Area */}
      {isLocked ? (
        <View style={styles.lockedBanner}>
          <Text style={styles.lockedBannerText}>This conversation is closed.</Text>
        </View>
      ) : (
        <View style={[styles.inputArea, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, paddingBottom: Math.max(12, insets.bottom) }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder={connected ? "Type a message..." : "Waiting for connection..."}
            placeholderTextColor={colors.placeholderText}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            editable={connected}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() && connected ? colors.primary : colors.inputBackground }
            ]}
            onPress={() => handleSend(inputText)}
            disabled={!inputText.trim() || !connected}
          >
            <Ionicons name="send" size={18} color={inputText.trim() && connected ? "#FFFFFF" : colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', maxWidth: 220 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerAvatarPlaceholderText: { fontSize: 16, fontWeight: '700' },
  headerName: { fontSize: 15, fontWeight: '700' },
  headerSubtext: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  reconnectingBanner: { paddingVertical: 6, alignItems: 'center', backgroundColor: '#FEF3C7' },
  reconnectingBannerText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  messageList: { padding: 16, gap: 10 },
  bubbleWrapper: { flexDirection: 'column', width: '100%', marginBottom: 6 },
  myBubbleWrapper: { alignItems: 'flex-end' },
  otherBubbleWrapper: { alignItems: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  messageText: { fontSize: 14, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF', fontWeight: '500' },
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  timestamp: { fontSize: 10 },
  inputArea: { flexDirection: 'row', padding: 12, paddingTop: 12, borderTopWidth: 1, gap: 10, alignItems: 'center' },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 90, minHeight: 40, fontSize: 14, borderWidth: 1 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  lockedBanner: { padding: 12, backgroundColor: '#F1F5F9', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  lockedBannerText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  systemMessageContainer: { alignSelf: 'center', marginVertical: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
  systemMessageText: { fontSize: 12, fontStyle: 'italic' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, transform: [{ scaleY: -1 }] },
  emptyChatText: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 },
});
