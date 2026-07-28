import { api } from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatThread {
  id: string;
  studentId: string;
  providerId: string;
  createdAt: string;
  lastMessageAt: string;
  // Other participant info
  otherUserId: string;
  otherUserName: string | null;
  otherUserAvatar: string | null;
  // Preview
  lastMessage?: string;
  lastMessageSenderId?: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  sentAt: string;
  readAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// API functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Idempotently open (or retrieve) a chat thread between the current student and a provider.
 */
export async function startChat(providerId: string): Promise<ChatThread> {
  const res = await api.post<ChatThread>('/chats/start', { providerId });
  return res.data;
}

/**
 * Idempotently open (or retrieve) a chat thread between the current provider and a student.
 */
export async function startChatWithStudent(studentId: string): Promise<ChatThread> {
  const res = await api.post<ChatThread>('/chats/start', { studentId });
  return res.data;
}

/**
 * List all chat threads for the authenticated user, sorted by most recent activity.
 */
export async function getChats(): Promise<ChatThread[]> {
  const res = await api.get<ChatThread[]>('/chats');
  return res.data;
}

/**
 * Fetch paginated message history for a thread (newest first).
 */
export async function getChatMessages(
  threadId: string,
  page = 0,
  size = 40,
): Promise<ChatMessage[]> {
  const res = await api.get<ChatMessage[]>(`/chats/${threadId}/messages`, {
    params: { page, size },
  });
  return res.data;
}

/**
 * Send a text message to a thread.
 */
export async function sendMessage(
  threadId: string,
  content: string,
  imageUrl?: string,
): Promise<ChatMessage> {
  const res = await api.post<ChatMessage>(`/chats/${threadId}/messages`, {
    content,
    imageUrl,
  });
  return res.data;
}

/**
 * Upload and send an image message to a thread.
 */
export async function sendImageMessage(
  threadId: string,
  file: FormData,
): Promise<ChatMessage> {
  const res = await api.post<ChatMessage>(`/chats/${threadId}/messages/image`, file, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Mark all unread messages in a thread as read.
 */
export async function markAsRead(threadId: string): Promise<{ marked: number }> {
  const res = await api.post<{ marked: number }>(`/chats/${threadId}/read`);
  return res.data;
}
