import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { X, Loader2, MessageSquare } from 'lucide-react';

interface ChatViewerModalProps {
  jobId: string;
  onClose: () => void;
}

export function ChatViewerModal({ jobId, onClose }: ChatViewerModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChat();
  }, [jobId]);

  useEffect(() => {
    if (data?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data]);

  const fetchChat = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/chats/job/${jobId}`);
      setData(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('No chat history found for this job.');
      } else {
        setError('Failed to load chat history.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[600px] h-[80vh] bg-[#162B4D] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0A192F]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Chat Transcript</h2>
            <span className="text-xs text-[#94A3B8] ml-2">Job: {jobId.slice(-6)}</span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[#0F2744]">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
            </div>
          )}

          {error && (
            <div className="flex h-full items-center justify-center text-[#94A3B8]">
              {error}
            </div>
          )}

          {data && data.messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-[#94A3B8]">
              No messages in this chat.
            </div>
          )}

          {data && data.messages.map((msg: any, idx: number) => {
            const isSystem = msg.type === 'SYSTEM';
            // We assume participant1 is Requester, participant2 is Provider
            const isRequester = msg.senderId === data.thread.participant1Id;
            
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <div className="bg-black/20 px-4 py-1.5 rounded-full border border-white/5 text-xs text-[#94A3B8] italic">
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={msg.id} 
                className={`flex mb-4 ${isRequester ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isRequester 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-[#162B4D] border border-white/10 text-[#E2E8F0] rounded-tl-sm'
                  }`}
                >
                  <div className="text-[10px] opacity-70 mb-1">
                    {isRequester ? 'Requester' : 'Provider'} • {msg.senderId.slice(-6)}
                  </div>
                  {msg.type === 'VOICE_NOTE' ? (
                    <div className="italic text-sm">[Voice Note]</div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  )}
                  <div className="text-[10px] opacity-50 text-right mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-3 bg-[#0A192F] border-t border-white/10 text-center text-xs text-[#64748B]">
          Read-only view of counterparty chat
        </div>
      </div>
    </div>
  );
}
