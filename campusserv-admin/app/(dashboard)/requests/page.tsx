"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Search, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/admin/requests');
      setRequests(res.data || []);
    } catch (error) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleForceCancel = async (id: string) => {
    const reason = prompt('Please enter a reason for force-cancelling this request:');
    if (reason === null) return;
    const finalReason = reason.trim() || 'Force cancelled by Admin';
    try {
      await api.put(`/admin/requests/${id}/cancel`, { reason: finalReason });
      toast.success('Request cancelled successfully');
      fetchRequests();
      if (selectedRequest?.id === id) setSelectedRequest(null);
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const filteredRequests = requests.filter(r => 
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex h-[calc(100vh-100px)] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-bold">Service Requests</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 font-medium" />
          <input 
            type="text" 
            placeholder="Search requests..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-slate-900 font-bold placeholder:text-slate-500 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white border border-gray-200"
          />
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* List Panel */}
        <div className="w-1/3 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredRequests.map((req) => (
              <div 
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className={`p-4 rounded-lg cursor-pointer transition-all border ${
                  selectedRequest?.id === req.id 
                    ? 'bg-slate-50 border-accent-default' 
                    : 'bg-slate-50 border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-slate-900 font-bold truncate pr-2">{req.title || 'Untitled Request'}</h3>
                  <span className={`text-xs px-2 py-1 rounded font-medium shrink-0 ${
                    req.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' :
                    req.status === 'ASSIGNED' ? 'bg-purple-500/20 text-purple-400' :
                    req.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium truncate">{req.category?.name || 'General'}</p>
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="text-center py-8 text-slate-500 font-medium">No requests found.</div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="flex-1 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl flex flex-col overflow-hidden">
          {selectedRequest ? (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 font-bold mb-2">{selectedRequest.title || 'Untitled Request'}</h2>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <span>ID: {selectedRequest.id}</span>
                    <span>•</span>
                    <span>{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {['OPEN', 'ASSIGNED'].includes(selectedRequest.status) && (
                  <button 
                    onClick={() => handleForceCancel(selectedRequest.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Force Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                  <span className="block text-sm text-slate-500 font-medium mb-1">Status</span>
                  <span className="text-slate-900 font-bold font-medium">{selectedRequest.status}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                  <span className="block text-sm text-slate-500 font-medium mb-1">Category</span>
                  <span className="text-slate-900 font-bold font-medium">{selectedRequest.category?.name || 'General'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                  <span className="block text-sm text-slate-500 font-medium mb-1">Budget</span>
                  <span className="text-slate-900 font-bold font-medium">GHS {selectedRequest.budgetMin} - {selectedRequest.budgetMax}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                  <span className="block text-sm text-slate-500 font-medium mb-1">Requester ID</span>
                  <span className="text-slate-900 font-bold font-medium truncate">{selectedRequest.requesterId}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                  <span className="block text-sm text-slate-500 font-medium mb-1">Location</span>
                  <span className="text-slate-900 font-bold font-medium">
                    {selectedRequest.locationType === 'REMOTE' ? 'Remote' : (selectedRequest.location || 'Choose Location')}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                  <span className="block text-sm text-slate-500 font-medium mb-1">Send-To Mode</span>
                  <span className="text-slate-900 font-bold font-medium">
                    {selectedRequest.deliveryMode === 'targeted'
                      ? `Specific Provider: ${selectedRequest.targetProviderId || 'Targeted'}`
                      : 'All matching providers'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 font-bold mb-3">Description</h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-gray-100 text-slate-700 whitespace-pre-wrap">
                  {selectedRequest.description || 'No description provided.'}
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-200">
                  Force cancelling a request will notify the requester and any interested providers immediately. Use this only for TOS violations or duplicate requests.
                </p>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-medium">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a request to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

