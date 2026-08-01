"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Flag, Download, AlertTriangle, Shield, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface FlaggedUser {
  userId: string;
  riskScore: number;
  riskLevel: 'HIGH_RISK_SUSPICIOUS' | 'MEDIUM' | 'LOW';
  riskFactors: string[];
  assessedAt: string;
}

function RiskBadge({ level, score }: { level: string; score: number }) {
  const config =
    level === 'HIGH_RISK_SUSPICIOUS'
      ? { bg: 'bg-red-100 text-red-700 border-red-200', icon: <ShieldAlert className="w-3.5 h-3.5" />, label: 'HIGH RISK' }
      : { bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'MEDIUM' };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${config.bg}`}>
      {config.icon}
      {config.label} ({score})
    </span>
  );
}

export default function ReportsPage() {
  const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFlaggedUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/admin/fraud-scoring/flagged');
      const data: FlaggedUser[] = res.data || [];
      // Sort by risk score descending
      data.sort((a, b) => b.riskScore - a.riskScore);
      setFlaggedUsers(data);
    } catch {
      toast.error('Failed to load fraud risk report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFlaggedUsers();
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/admin/dashboard/financials/export', {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `campusserv_financial_statement_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Financial statement exported successfully');
    } catch {
      toast.error('Failed to export financial statement');
    }
  };

  const highRiskCount = flaggedUsers.filter((u) => u.riskLevel === 'HIGH_RISK_SUSPICIOUS').length;
  const mediumRiskCount = flaggedUsers.filter((u) => u.riskLevel === 'MEDIUM').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Fraud Detection</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated fraud engine — users flagged by risk score ≥ 30
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchFlaggedUsers(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-xs"
          >
            <Download className="w-4 h-4" />
            Export Financial CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Flag className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{flaggedUsers.length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Total Flagged Users</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">High Risk (Score ≥ 70)</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{mediumRiskCount}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Medium Risk (Score 30–69)</div>
          </div>
        </div>
      </div>

      {/* Risk Table */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Shield className="w-4 h-4 text-indigo-500" />
            Automated Risk Assessment Log
          </div>
          <span className="text-xs text-slate-500 font-medium">{flaggedUsers.length} flagged users</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          </div>
        ) : flaggedUsers.length === 0 ? (
          <div className="py-20 text-center">
            <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold">No flagged users found</p>
            <p className="text-xs text-slate-400 mt-1">All users are within normal activity parameters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">User ID</th>
                  <th className="px-6 py-3.5">Risk Level</th>
                  <th className="px-6 py-3.5">Risk Factors</th>
                  <th className="px-6 py-3.5">Assessed At</th>
                </tr>
              </thead>
              <tbody>
                {flaggedUsers.map((u) => (
                  <tr key={u.userId} className="border-t border-gray-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{u.userId}</td>
                    <td className="px-6 py-4">
                      <RiskBadge level={u.riskLevel} score={u.riskScore} />
                    </td>
                    <td className="px-6 py-4">
                      <ul className="space-y-0.5">
                        {u.riskFactors.map((f, i) => (
                          <li key={i} className="text-xs text-slate-600 font-medium">
                            · {f}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(u.assessedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
