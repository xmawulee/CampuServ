"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Loader2, Search, CheckCircle, XCircle, AlertOctagon,
  AlertTriangle, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────
//  Force-Action Confirmation Modal
// ─────────────────────────────────────────────────────────

type ActionType = 'complete' | 'cancel' | null;

function ForceActionModal({
  action,
  job,
  onConfirm,
  onClose,
  loading,
}: {
  action: ActionType;
  job: any;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');

  if (!action || !job) return null;

  const isComplete = action === 'complete';
  const Icon = isComplete ? ShieldCheck : ShieldAlert;
  const accentColor = isComplete ? 'green' : 'red';
  const title = isComplete ? 'Force Complete Job' : 'Force Cancel Job';
  const description = isComplete
    ? 'This will immediately release escrow funds to the provider and mark the job as COMPLETED, bypassing the normal code or proof-review flow.'
    : 'This will immediately cancel the job and refund the client from escrow. The provider will not be paid.';

  const handleSubmit = () => {
    const finalReason = reason.trim();
    if (!finalReason) {
      toast.warning('A reason is required for this action.');
      return;
    }
    onConfirm(finalReason);
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header stripe */}
        <div className={`flex items-center gap-3 p-5 ${isComplete ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'}`}>
          <Icon className={`w-6 h-6 shrink-0 ${isComplete ? 'text-green-600' : 'text-red-600'}`} />
          <div>
            <h2 className={`font-bold text-lg ${isComplete ? 'text-green-900' : 'text-red-900'}`}>{title}</h2>
            <p className="text-sm text-slate-500 font-medium">Job #{job.id?.slice(-6)}</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Consequence banner */}
          <div className={`flex items-start gap-3 p-4 rounded-xl ${isComplete ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isComplete ? 'text-green-600' : 'text-red-600'}`} />
            <p className={`text-sm ${isComplete ? 'text-green-800' : 'text-red-800'}`}>{description}</p>
          </div>

          {/* Job summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3 border border-gray-100">
              <span className="block text-slate-500 font-medium text-xs mb-1">Agreed Price</span>
              <span className="font-bold text-slate-900">GHS {job.agreedPrice ?? 'N/A'}</span>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-gray-100">
              <span className="block text-slate-500 font-medium text-xs mb-1">Current Status</span>
              <span className="font-bold text-slate-900">{job.status}</span>
            </div>
          </div>

          {/* Reason input (required) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Reason <span className="text-red-500">*</span>
              <span className="font-normal text-slate-400 ml-1">(will be logged in audit trail)</span>
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[80px]"
              placeholder={isComplete
                ? 'e.g. Client confirmed delivery verbally but cannot provide the code...'
                : 'e.g. Provider no-show confirmed after 3 attempts to contact...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !reason.trim()}
              className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                isComplete
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isComplete ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Confirm {isComplete ? 'Force Complete' : 'Force Cancel'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Jobs Page
// ─────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Force action modal state
  const [forceAction, setForceAction] = useState<ActionType>(null);
  const [forceActionLoading, setForceActionLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/admin/jobs');
      setJobs(res.data?.content || res.data || []);
    } catch (error) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleForceActionConfirm = async (reason: string) => {
    if (!selectedJob || !forceAction) return;
    setForceActionLoading(true);
    try {
      if (forceAction === 'complete') {
        await api.put(`/admin/jobs/${selectedJob.id}/force-complete`, { reason });
        toast.success('Job marked as force-completed. Escrow released to provider.');
      } else {
        await api.put(`/admin/jobs/${selectedJob.id}/cancel`, { reason });
        toast.success('Job force-cancelled. Client refunded.');
      }
      setForceAction(null);
      setSelectedJob(null);
      fetchJobs();
    } catch (error) {
      toast.error(`Failed to ${forceAction === 'complete' ? 'complete' : 'cancel'} job. Check backend logs.`);
    } finally {
      setForceActionLoading(false);
    }
  };

  const filteredJobs = (jobs || []).filter(j =>
    (j.id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (j.providerId?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (j.clientId?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex h-[calc(100vh-100px)] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <>
      {/* Force-Action Confirmation Modal */}
      <ForceActionModal
        action={forceAction}
        job={selectedJob}
        onConfirm={handleForceActionConfirm}
        onClose={() => setForceAction(null)}
        loading={forceActionLoading}
      />

      <div className="flex flex-col h-[calc(100vh-112px)] gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 font-bold">Active &amp; Past Jobs</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 font-medium" />
            <input
              type="text"
              placeholder="Search jobs by ID or user..."
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
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-4 rounded-lg cursor-pointer transition-all border ${
                    selectedJob?.id === job.id
                      ? 'bg-slate-50 border-[#7C3AED]'
                      : 'bg-slate-50 border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-slate-900 font-bold truncate pr-2">Job {job.id.slice(-6)}</h3>
                    <span className={`text-xs px-2 py-1 rounded font-medium shrink-0 ${
                      job.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                      job.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400' :
                      job.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                      job.status === 'DISPUTED' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium truncate">GHS {job.agreedPrice}</p>
                </div>
              ))}
              {filteredJobs.length === 0 && (
                <div className="text-center py-8 text-slate-500 font-medium">No jobs found.</div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="flex-1 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl flex flex-col overflow-hidden">
            {selectedJob ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 font-bold mb-2">Job Details</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                      <span>ID: {selectedJob.id}</span>
                      <span>•</span>
                      <span>Started: {selectedJob.startedAt ? new Date(selectedJob.startedAt).toLocaleString() : 'Not started'}</span>
                    </div>
                  </div>
                  {['PENDING', 'IN_PROGRESS', 'DISPUTED', 'AWAITING_CODE', 'PROOF_SUBMITTED'].includes(selectedJob.status) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setForceAction('cancel')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        Force Cancel
                      </button>
                      <button
                        onClick={() => setForceAction('complete')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-lg transition-colors text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Force Complete
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-sm text-slate-500 font-medium mb-1">Status</span>
                    <span className="text-slate-900 font-bold font-medium">{selectedJob.status}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-sm text-slate-500 font-medium mb-1">Agreed Price</span>
                    <span className="text-slate-900 font-bold font-medium">GHS {selectedJob.agreedPrice}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-sm text-slate-500 font-medium mb-1">Client ID</span>
                    <span className="text-slate-900 font-bold font-medium truncate">{selectedJob.clientId}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-gray-100">
                    <span className="block text-sm text-slate-500 font-medium mb-1">Provider ID</span>
                    <span className="text-slate-900 font-bold font-medium truncate">{selectedJob.providerId}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-start gap-3 bg-slate-50 border border-gray-200 p-4 rounded-lg">
                  <AlertOctagon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-500 font-medium">
                    Force actions require a written reason and are recorded in the audit trail. Force Complete releases escrow to the provider. Force Cancel refunds the client.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-medium">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a job to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
