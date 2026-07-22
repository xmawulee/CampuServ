"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { api, getFullFileUrl } from '@/lib/api';
import { Loader2, Search, Download, ArrowUpDown, ChevronLeft, ChevronRight, X, ShieldAlert, CheckCircle, ShieldX, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface Provider {
  id: string;
  email: string;
  fullName: string;
  role: string;
  primaryRole?: string;
  secondaryRole?: string;
  secondaryRoleStatus?: string;
  providerRoleType: 'PRIMARY' | 'SECONDARY';
  isVerified?: boolean;
  verificationStatus?: string;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
  studentIdPhotoUrl?: string;
  profilePictureUrl?: string;
  serviceCategory?: string;
  createdAt: string;
  secondaryRoleRequestedAt?: string;
  secondaryRoleAcquiredAt?: string;
}

const columnHelper = createColumnHelper<Provider>();

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/providers', {
        params: {
          search: globalFilter || undefined,
          providerRoleType: roleTypeFilter !== 'ALL' ? roleTypeFilter : undefined,
          accountStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      setProviders(res.data || []);
    } catch (error) {
      toast.error('Failed to load provider roster');
    } finally {
      setLoading(false);
    }
  }, [globalFilter, roleTypeFilter, statusFilter]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleUpdateStatus = async (providerId: string, newStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED') => {
    const actionVerb = newStatus === 'ACTIVE' ? 'activate' : newStatus === 'SUSPENDED' ? 'suspend' : 'ban';
    if (!confirm(`Are you sure you want to ${actionVerb} this account?`)) return;
    const reason = prompt(`Optional reason for setting status to ${newStatus}:`);

    try {
      setActionLoading(true);
      await api.patch(`/admin/users/${providerId}/status`, { accountStatus: newStatus, reason: reason || undefined });
      toast.success(`Account status updated to ${newStatus}`);
      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider({ ...selectedProvider, accountStatus: newStatus });
      }
      fetchProviders();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data || 'Failed to update user account status';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Failed to update user account status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreAccount = async (providerId: string) => {
    if (!confirm('Are you sure you want to restore this deleted account? This will set the account status back to ACTIVE.')) return;
    try {
      setActionLoading(true);
      await api.post(`/admin/users/${providerId}/restore`);
      toast.success('Deleted account restored successfully');
      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider({ ...selectedProvider, accountStatus: 'ACTIVE' });
      }
      fetchProviders();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data || 'Failed to restore account';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Failed to restore account');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('fullName', {
      header: 'Provider Name',
      cell: info => (
        <div>
          <div className="font-bold text-slate-900">{info.getValue()}</div>
          <div className="text-xs text-slate-400 font-mono truncate w-36">{info.row.original.id}</div>
        </div>
      ),
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => <div className="text-slate-600 font-medium">{info.getValue()}</div>,
    }),
    columnHelper.accessor('providerRoleType', {
      header: 'Role Type',
      cell: info => {
        const isPrimary = info.getValue() === 'PRIMARY';
        return (
          <span className={`text-[11px] uppercase px-3 py-1 rounded-full font-bold tracking-wider ${
            isPrimary
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'border-2 border-emerald-600 text-emerald-700 bg-emerald-50'
          }`}>
            {isPrimary ? 'Primary Provider' : 'Secondary Provider'}
          </span>
        );
      },
    }),
    columnHelper.accessor('serviceCategory', {
      header: 'Category',
      cell: info => (
        <span className={`text-[11px] uppercase px-2.5 py-1 rounded-full font-bold tracking-wide ${
          info.getValue() ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-50 text-slate-400'
        }`}>
          {info.getValue() || 'Unspecified'}
        </span>
      ),
    }),
    columnHelper.accessor('accountStatus', {
      header: 'Account Status',
      cell: info => (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          info.getValue() === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
          info.getValue() === 'SUSPENDED' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
          'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Provider Since',
      cell: info => {
        const row = info.row.original;
        const dateStr = row.providerRoleType === 'SECONDARY' && row.secondaryRoleAcquiredAt
          ? row.secondaryRoleAcquiredAt
          : row.createdAt;
        return <div className="text-slate-500 font-medium">{dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A'}</div>;
      },
    }),
  ], []);

  const table = useReactTable({
    data: providers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleExportCSV = () => {
    if (!providers.length) return;
    const headers = ['ID', 'Name', 'Email', 'Role Type', 'Category', 'Account Status', 'Provider Since'];
    const csvContent = [
      headers.join(','),
      ...providers.map(p => {
        const dateStr = p.providerRoleType === 'SECONDARY' && p.secondaryRoleAcquiredAt ? p.secondaryRoleAcquiredAt : p.createdAt;
        return [
          p.id,
          `"${p.fullName}"`,
          p.email,
          p.providerRoleType,
          `"${p.serviceCategory || ''}"`,
          p.accountStatus,
          dateStr
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'campusserv_provider_roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] gap-6">
      {/* ── Page Header & Stats ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verified Providers Roster</h1>
          <p className="text-sm text-slate-500 mt-1">
            Active roster of all primary and secondary approved service providers on CampuServ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-slate-50 shadow-xs text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all text-sm"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export Roster CSV
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search provider name or email..." 
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Provider Role Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role Type:</label>
            <select
              value={roleTypeFilter}
              onChange={(e) => setRoleTypeFilter(e.target.value)}
              className="bg-slate-50 border border-gray-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Roles (Primary & Secondary)</option>
              <option value="PRIMARY">Primary Providers Only</option>
              <option value="SECONDARY">Secondary Providers Only</option>
            </select>
          </div>

          {/* Account Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-gray-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Provider Table ── */}
      <div className="bg-white shadow-xs border border-gray-100 rounded-3xl overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-gray-100">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th 
                          key={header.id} 
                          className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-2">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr 
                      key={row.id} 
                      onClick={() => setSelectedProvider(row.original)}
                      className="border-b border-gray-50 hover:bg-indigo-50/40 cursor-pointer transition-colors"
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="p-4 text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="p-12 text-center text-slate-500 font-medium">
                        No approved providers found matching your filter options.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between text-sm font-medium text-slate-500">
              <div>
                Showing {table.getFilteredRowModel().rows.length > 0 ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0} to{' '}
                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}{' '}
                of {table.getFilteredRowModel().rows.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Slide-Over Detail Drawer ── */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-gray-100 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Provider Overview</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedProvider.id}</p>
              </div>
              <button
                onClick={() => setSelectedProvider(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-14 h-14 rounded-full bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shrink-0">
                  {selectedProvider.fullName?.charAt(0) || 'P'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedProvider.fullName}</h3>
                  <p className="text-xs text-slate-500">{selectedProvider.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[10px] uppercase px-2.5 py-0.5 rounded-full font-bold tracking-wider ${
                      selectedProvider.providerRoleType === 'PRIMARY'
                        ? 'bg-indigo-600 text-white'
                        : 'border border-emerald-600 text-emerald-700 bg-emerald-50'
                    }`}>
                      {selectedProvider.providerRoleType === 'PRIMARY' ? 'Primary Provider' : 'Secondary Provider'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Roles Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Role Composition</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-400 block font-medium">Primary Role</span>
                    <span className="text-sm font-bold text-slate-900">{selectedProvider.primaryRole || selectedProvider.role}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-400 block font-medium">Secondary Role</span>
                    <span className="text-sm font-bold text-indigo-600">{selectedProvider.secondaryRole || 'None'}</span>
                    {selectedProvider.secondaryRoleStatus && (
                      <span className="text-[10px] block font-bold text-emerald-600 mt-0.5">
                        Status: {selectedProvider.secondaryRoleStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Provider Metadata</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-slate-500 font-medium">Service Category</span>
                    <span className="font-bold text-slate-900">{selectedProvider.serviceCategory || 'Not yet selected'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-slate-500 font-medium">Account Status</span>
                    <span className={`font-bold ${
                      selectedProvider.accountStatus === 'ACTIVE' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {selectedProvider.accountStatus}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-slate-500 font-medium">Joined Date</span>
                    <span className="font-semibold text-slate-700">{new Date(selectedProvider.createdAt).toLocaleDateString()}</span>
                  </div>
                  {selectedProvider.secondaryRoleAcquiredAt && (
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-slate-500 font-medium">Secondary Role Approved</span>
                      <span className="font-semibold text-slate-700">{new Date(selectedProvider.secondaryRoleAcquiredAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Photo */}
              {selectedProvider.studentIdPhotoUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verification Document</h4>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedProvider.serviceCategory
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      Category: {selectedProvider.serviceCategory || 'Not yet selected'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <a
                      href={getFullFileUrl(selectedProvider.studentIdPhotoUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1.5"
                    >
                      View Student / Provider ID Photo →
                    </a>
                  </div>
                </div>
              )}

              {/* Account Status Actions */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin Account Actions</h4>
                {selectedProvider.accountStatus === 'DELETED' ? (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                        <ShieldAlert className="w-4 h-4 shrink-0" /> Account Deleted
                      </div>
                      <p className="text-xs text-amber-700 font-medium">This account was deleted by the user and cannot be directly modified.</p>
                    </div>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleRestoreAccount(selectedProvider.id)}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Restore Account
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProvider.accountStatus !== 'ACTIVE' && (
                      <button
                        disabled={actionLoading}
                        onClick={() => handleUpdateStatus(selectedProvider.id, 'ACTIVE')}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Activate Account
                      </button>
                    )}

                    {selectedProvider.accountStatus !== 'SUSPENDED' && (
                      <button
                        disabled={actionLoading}
                        onClick={() => handleUpdateStatus(selectedProvider.id, 'SUSPENDED')}
                        className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} Suspend Account
                      </button>
                    )}

                    {selectedProvider.accountStatus !== 'BANNED' && (
                      <button
                        disabled={actionLoading}
                        onClick={() => handleUpdateStatus(selectedProvider.id, 'BANNED')}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all disabled:opacity-50 col-span-2"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldX className="w-4 h-4" />} Ban Account
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
