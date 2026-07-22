"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Search, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const res = await api.get('/admin/finance/withdrawals');
      setWithdrawals(res.data?.content || res.data || []);
    } catch (error) {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.put(`/admin/finance/withdrawals/${id}/${action.toLowerCase()}`);
      toast.success(`Withdrawal ${action.toLowerCase()}d successfully`);
      fetchWithdrawals();
    } catch (error) {
      toast.error(`Failed to ${action.toLowerCase()} withdrawal`);
    }
  };

  if (loading) {
    return <div className="flex h-[calc(100vh-100px)] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-bold">Withdrawal Requests</h1>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-500 font-medium">
            <thead className="bg-slate-50 text-xs uppercase text-slate-900 font-bold font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No withdrawals found.</td>
                </tr>
              ) : (
                withdrawals.map((w: any) => (
                  <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-slate-900 font-bold font-medium">{w.id.substring(0,8)}</td>
                    <td className="px-6 py-4">{w.userId}</td>
                    <td className="px-6 py-4 text-slate-900 font-bold font-semibold">GHS {w.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        w.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                        w.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(w.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {w.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleProcess(w.id, 'APPROVE')} className="p-1 hover:bg-green-500/20 text-green-400 rounded">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleProcess(w.id, 'REJECT')} className="p-1 hover:bg-red-500/20 text-red-400 rounded">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

