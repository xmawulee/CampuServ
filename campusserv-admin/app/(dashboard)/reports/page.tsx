"use client";

import { useState } from 'react';
import { Flag, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface SummaryReport {
  id: string;
  type: string;
  reportedUser: string;
  reporter: string;
  reason: string;
  status: string;
  date: string;
}

export default function ReportsPage() {
  const [reports] = useState<SummaryReport[]>([
    {
      id: 'REP-1001',
      type: 'TOS_VIOLATION',
      reportedUser: 'Kwame Mensah',
      reporter: 'Ama Serwaa',
      reason: 'Late cancellation without notice',
      status: 'UNDER_REVIEW',
      date: new Date().toISOString(),
    },
    {
      id: 'REP-1002',
      type: 'PAYMENT_ISSUE',
      reportedUser: 'Kofi Owusu',
      reporter: 'Yaa Asantewaa',
      reason: 'Incorrect completion code entered',
      status: 'RESOLVED',
      date: new Date(Date.now() - 86400000).toISOString(),
    }
  ]);

  const handleExportCSV = () => {
    if (!reports.length) {
      toast.info('No report records to export');
      return;
    }
    const headers = ['Report ID', 'Type', 'Reported User', 'Reporter', 'Reason', 'Status', 'Date'];
    const rows = reports.map(r => [
      r.id,
      r.type,
      `"${r.reportedUser.replace(/"/g, '""')}"`,
      `"${r.reporter.replace(/"/g, '""')}"`,
      `"${r.reason.replace(/"/g, '""')}"`,
      r.status,
      r.date,
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `platform_reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Platform reports exported to CSV successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-bold">Platform Reports</h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV Report
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>Active Incident Log</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">{reports.length} Records</span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase font-semibold text-slate-500 bg-slate-50">
              <th className="p-3">Report ID</th>
              <th className="p-3">Type</th>
              <th className="p-3">Reported User</th>
              <th className="p-3">Reporter</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50">
                <td className="p-3 font-mono text-xs text-slate-500">{r.id}</td>
                <td className="p-3 font-medium text-slate-900">{r.type}</td>
                <td className="p-3 font-medium text-slate-900">{r.reportedUser}</td>
                <td className="p-3 text-slate-600">{r.reporter}</td>
                <td className="p-3 text-slate-600">{r.reason}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    r.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-slate-500">{new Date(r.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

