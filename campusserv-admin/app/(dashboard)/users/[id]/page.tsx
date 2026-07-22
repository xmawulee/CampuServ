"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, ArrowLeft, ShieldAlert, Ban, CheckCircle, Info, Calendar, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { AnimatedStaggerContainer, AnimatedStaggerItem } from '@/components/ui/AnimatedFadeIn';

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'jobs' | 'transactions'>('jobs');

  useEffect(() => {
    if (id) fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      // 1. Fetch profile from user-service
      const profileRes = await api.get(`/admin/users/${id}`);
      setUser(profileRes.data);

      // 2. Fetch jobs from job-service
      const jobsRes = await api.get(`/admin/jobs/user/${id}`);
      setJobs(jobsRes.data || []);

      // 3. Fetch transactions from payment-service
      const txRes = await api.get(`/admin/finance/ledger?userId=${id}`);
      setTransactions(txRes.data || []);
      
    } catch (error) {
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const [actionLoading, setActionLoading] = useState(false);

  const updateStatus = async (status: 'ACTIVE' | 'SUSPENDED' | 'BANNED') => {
    const actionVerb = status === 'ACTIVE' ? 'activate/unsuspend' : status === 'SUSPENDED' ? 'suspend' : 'ban';
    if (!confirm(`Are you sure you want to ${actionVerb} this user?`)) return;
    const reason = prompt(`Reason for changing status to ${status}:`);

    try {
      setActionLoading(true);
      await api.put(`/admin/users/${id}/status`, { status, reason: reason || undefined });
      toast.success(`User status updated to ${status}`);
      fetchUserDetails();
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.response?.data || 'Failed to update user status';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreAccount = async () => {
    if (!confirm('Are you sure you want to restore this deleted account? This will set the account status back to ACTIVE.')) return;
    try {
      setActionLoading(true);
      await api.post(`/admin/users/${id}/restore`);
      toast.success('Deleted user account restored successfully');
      fetchUserDetails();
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.response?.data || 'Failed to restore account';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Failed to restore account');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (!user) {
    return <div className="flex flex-col h-full items-center justify-center text-slate-500 font-medium">User not found.</div>;
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/users')}
          className="p-3 bg-white shadow-sm hover:shadow-md rounded-2xl border border-gray-100 transition-all group"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-4 tracking-tight">
            {user.fullName}
            <span className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold ${
              user.role === 'PROVIDER' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {user.role}
            </span>
            <span className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold ${
              user.accountStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
              user.accountStatus === 'SUSPENDED' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              {user.accountStatus || 'ACTIVE'}
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">{user.email} • ID: {user.id}</p>
        </div>
      </div>

      <AnimatedStaggerContainer className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Profile Details */}
          <AnimatedStaggerItem className="bg-white border border-gray-100 shadow-sm rounded-3xl p-8 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Profile Details</h2>
            
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Service Category</span>
              <span className="text-slate-900 font-semibold">{user.serviceCategory || 'None'}</span>
            </div>
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Verification Status</span>
              <span className={`font-bold ${user.isVerified ? 'text-emerald-600' : 'text-amber-500'}`}>
                {user.verificationStatus}
              </span>
            </div>
            
            {user.role === 'PROVIDER' && user.studentIdPhotoUrl && (
              <div className="pt-6 border-t border-gray-100">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Student ID Document</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={user.studentIdPhotoUrl} 
                  alt="Student ID" 
                  className="w-full rounded-2xl border-4 border-slate-50 shadow-sm cursor-pointer hover:opacity-90 hover:shadow-md transition-all"
                  onClick={() => setIsLightboxOpen(true)}
                />
              </div>
            )}
          </AnimatedStaggerItem>

          {/* Moderation Card */}
          <AnimatedStaggerItem className="bg-white border border-gray-100 shadow-sm rounded-3xl p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">Moderation Actions</h2>
            {user.accountStatus === 'DELETED' ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <ShieldAlert className="w-5 h-5 shrink-0" /> Account Deleted
                  </div>
                  <p className="text-xs text-amber-700 font-medium">This account was deleted by the user and cannot be directly modified.</p>
                </div>
                <button
                  disabled={actionLoading}
                  onClick={handleRestoreAccount}
                  className="flex items-center justify-center gap-3 w-full p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all font-bold text-sm shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />} Restore Account
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {user.accountStatus === 'SUSPENDED' && (
                  <button 
                    disabled={actionLoading}
                    onClick={() => updateStatus('ACTIVE')}
                    className="flex items-center justify-center gap-3 w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl transition-colors font-bold text-sm shadow-sm disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />} Unsuspend User
                  </button>
                )}
                {user.accountStatus === 'BANNED' && (
                  <button 
                    disabled={actionLoading}
                    onClick={() => updateStatus('ACTIVE')}
                    className="flex items-center justify-center gap-3 w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl transition-colors font-bold text-sm shadow-sm disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />} Unban User
                  </button>
                )}
                {user.accountStatus !== 'SUSPENDED' && user.accountStatus !== 'BANNED' && (
                  <>
                    <button 
                      disabled={actionLoading}
                      onClick={() => updateStatus('SUSPENDED')}
                      className="flex items-center justify-center gap-3 w-full p-3.5 bg-white hover:bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl transition-all font-bold text-sm shadow-sm disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />} Suspend User
                    </button>
                    <button 
                      disabled={actionLoading}
                      onClick={() => updateStatus('BANNED')}
                      className="flex items-center justify-center gap-3 w-full p-3.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-2xl transition-all font-bold text-sm shadow-sm disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ban className="w-5 h-5" />} Ban User
                    </button>
                  </>
                )}
              </div>
            )}
            <p className="text-xs font-medium text-slate-400 mt-6 text-center leading-relaxed">
              Suspended or banned users are forcefully logged out and denied refresh token rotation.
            </p>
          </AnimatedStaggerItem>

        </div>

        {/* Right Column (Tabs for Jobs & Transactions) */}
        <AnimatedStaggerItem className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-gray-100 shadow-sm rounded-3xl flex flex-col h-full min-h-[500px] overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-slate-50 flex gap-4">
              <button 
                onClick={() => setActiveTab('jobs')}
                className={`text-sm font-bold pb-2 border-b-2 transition-colors ${
                  activeTab === 'jobs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Jobs ({jobs.length})
              </button>
              <button 
                onClick={() => setActiveTab('transactions')}
                className={`text-sm font-bold pb-2 border-b-2 transition-colors ${
                  activeTab === 'transactions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Transactions ({transactions.length})
              </button>
            </div>
            <div className="flex-1 p-0 overflow-y-auto">
              {activeTab === 'jobs' && (
                jobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                    <Info className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-500">No jobs found for this user.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {jobs.map((job) => (
                      <li key={job.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-900">{job.requestId}</span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                            job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            job.status === 'ACTIVE' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Created: {new Date(job.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {activeTab === 'transactions' && (
                transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                    <Info className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-500">No transactions found for this user.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {transactions.map((tx) => (
                      <li key={tx.walletTxnId} className="p-6 hover:bg-slate-50/50 transition-colors flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                            {tx.type}
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              tx.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                              tx.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{new Date(tx.initiatedAt).toLocaleString()} • {tx.paystackReference || 'Internal'}</p>
                        </div>
                        <div className={`font-bold text-lg ${tx.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {tx.type === 'DEPOSIT' ? '+' : '-'}₵{tx.amount}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </div>
        </AnimatedStaggerItem>
      </AnimatedStaggerContainer>

      {user.studentIdPhotoUrl && (
        <Lightbox
          open={isLightboxOpen}
          close={() => setIsLightboxOpen(false)}
          slides={[{ src: user.studentIdPhotoUrl }]}
        />
      )}
    </div>
  );
}
