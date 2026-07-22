import { api } from './api';

export interface ChatThreadResponse {
  id: string;
  requestId: string;
  clientId: string;
  providerId: string;
  status: 'OPEN' | 'LOCKED';
  createdAt: string;
  otherParticipant: {
    id: string;
    fullName: string;
    profilePictureUrl: string | null;
  };
  hasHistory: boolean;
}

export interface ChatMessageResponse {
  id: string;
  threadId: string;
  senderId: string;
  type: 'TEXT' | 'VOICE_NOTE' | 'SYSTEM';
  content: string | null;
  mediaUrl: string | null;
  mediaDurationSeconds: number | null;
  status: 'SENT';
  createdAt: string;
  clientTempId?: string;
}

export interface PaginatedChatHistory {
  content: ChatMessageResponse[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}


// Fetch thread details for a specific request ID (handles auto-initialization on backend)
export async function getThreadForRequest(requestId: string): Promise<ChatThreadResponse> {
  const res = await api.get<ChatThreadResponse>(`/chats/thread/request/${requestId}`);
  return res.data;
}

// Fetch paginated message history for a specific thread ID
export async function getChatHistory(threadId: string, page = 0, size = 30): Promise<PaginatedChatHistory> {
  const res = await api.get<PaginatedChatHistory>(`/chats/history/${threadId}`, {
    params: { page, size },
  });
  return res.data;
}


