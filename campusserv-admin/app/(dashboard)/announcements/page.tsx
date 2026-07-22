"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Search, Send, Megaphone, CheckCircle, PowerOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('INFO');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/admin/announcements');
      setAnnouncements(res.data || []);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required.');
      return;
    }

    try {
      await api.post('/admin/announcements', { title, message, severity });
      toast.success('Announcement broadcasted successfully!');
      setTitle('');
      setMessage('');
      setSeverity('INFO');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to broadcast announcement');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this announcement?')) return;
    try {
      await api.put(`/admin/announcements/${id}/deactivate`);
      toast.success('Announcement deactivated');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to deactivate announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/announcements/${id}`);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex h-[calc(100vh-100px)] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-bold">System Announcements</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 font-medium" />
          <input 
            type="text" 
            placeholder="Search announcements..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-slate-900 font-bold placeholder:text-slate-500 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white border border-gray-200"
          />
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        
        {/* Composer Panel */}
        <div className="w-1/3 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl flex flex-col p-6">
          <div className="flex items-center gap-2 mb-6">
            <Megaphone className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 font-bold">Broadcast New Notice</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-500 font-medium mb-1">Title</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System Maintenance"
                className="w-full bg-slate-50 border border-gray-200 rounded-lg p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white border border-gray-200"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-500 font-medium mb-1">Severity</label>
              <select 
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-lg p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white border border-gray-200"
              >
                <option value="INFO">Info (Blue)</option>
                <option value="WARNING">Warning (Yellow)</option>
                <option value="CRITICAL">Critical (Red)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-500 font-medium mb-1">Message</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message body..."
                className="w-full bg-slate-50 border border-gray-200 rounded-lg p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white border border-gray-200 min-h-[120px]"
              />
            </div>
            
            <button 
              onClick={handleCreate}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-slate-900 font-bold font-semibold rounded-lg transition-colors mt-4"
            >
              <Send className="w-4 h-4" />
              Broadcast Now
            </button>
            <p className="text-xs text-slate-400 text-center mt-2">
              This will be sent to all online clients immediately and shown on next app launch.
            </p>
          </div>
        </div>

        {/* History Panel */}
        <div className="flex-1 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 font-bold">Announcement History</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filteredAnnouncements.map((a) => (
              <div key={a.id} className="bg-slate-50 border border-gray-200 p-5 rounded-xl relative group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${
                      a.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                      a.severity === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {a.severity}
                    </span>
                    <h3 className="font-semibold text-slate-900 font-bold text-lg">{a.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.isActive ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded mr-1">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 mr-1">Inactive</span>
                    )}
                    {a.isActive && (
                      <button 
                        onClick={() => handleDeactivate(a.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Deactivate"
                      >
                        <PowerOff className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-slate-500 font-medium text-sm whitespace-pre-wrap">{a.message}</p>
                <div className="text-[10px] text-slate-400 mt-4">
                  Broadcasted: {new Date(a.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {filteredAnnouncements.length === 0 && (
              <div className="text-center py-8 text-slate-500 font-medium">No announcements found.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

