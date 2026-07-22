"use client";

import { useEffect, useState, useMemo } from 'react';
import { api, getFullFileUrl } from '@/lib/api';
import { Loader2, Search, Download, ArrowUpDown, ChevronLeft, ChevronRight, X, UserCheck, ShieldAlert, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  primaryRole?: string;
  secondaryRole?: string;
  secondaryRoleStatus?: string;
  secondaryRoleRequestedAt?: string;
  secondaryRoleAcquiredAt?: string;
  rejectionReason?: string;
  isVerified: boolean;
  verificationStatus: string;
  accountStatus: string;
  createdAt: string;
  serviceCategory?: string;
  studentIdPhotoUrl?: string;
}

const columnHelper = createColumnHelper<User>();

export default function UserPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [roleComposition, setRoleComposition] = useState<string>('');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers(roleComposition);
  }, [roleComposition]);

  const fetchUsers = async (compFilter?: string) => {
    setLoading(true);
    try {
      const url = compFilter ? `/admin/users?roleComposition=${compFilter}` : '/admin/users';
      const res = await api.get(url);
      setUsers(res.data || []);
    } catch (error) {
      toast.error('Failed to load Users');
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('fullName', {
      header: 'Name',
      cell: info => <div className="font-bold text-slate-900">{info.getValue()}</div>,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => <div className="text-slate-500 font-medium">{info.getValue()}</div>,
    }),
    columnHelper.accessor('role', {
      header: 'Role',
      cell: info => {
        const val = info.getValue() || info.row.original.primaryRole || 'STUDENT';
        const isProvider = val === 'PROVIDER';
        const isAdmin = val === 'ADMIN';
        return (
          <span className={`text-[11px] uppercase px-2.5 py-1 rounded-full font-bold tracking-wide border ${
            isAdmin ? 'bg-purple-100 text-purple-800 border-purple-200' :
            isProvider ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
            'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {val}
          </span>
        );
      },
    }),
    columnHelper.accessor('accountStatus', {
      header: 'Status',
      cell: info => (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          info.getValue() === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
          info.getValue() === 'SUSPENDED' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
        }`}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Joined',
      cell: info => <div className="text-slate-500 font-medium">{new Date(info.getValue()).toLocaleDateString()}</div>,
    }),
  ], []);

  const table = useReactTable({
    data: users,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleExportCSV = () => {
    if (!users.length) return;
    const headers = ['ID', 'Name', 'Email', 'Role', 'Account Status', 'Joined Date'];
    const csvContent = [
      headers.join(','),
      ...table.getFilteredRowModel().rows.map(row => {
        const u = row.original;
        return [
          u.id, 
          `"${u.fullName}"`, 
          u.email, 
          u.role || u.primaryRole || 'STUDENT', 
          u.accountStatus, 
          u.createdAt
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'campusserv_users_roles.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] gap-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Users & Roles</h1>
          <p className="text-sm text-slate-500">Manage account access, primary roles, and secondary role applications.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search users by name, email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={roleComposition}
            onChange={(e) => setRoleComposition(e.target.value)}
            className="w-full sm:w-56 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          >
            <option value="">All Role Compositions</option>
            <option value="PRIMARY_ONLY">Primary Only (No Secondary Role)</option>
            <option value="SECONDARY_PENDING">Secondary Pending Approval</option>
            <option value="SECONDARY_APPROVED">Secondary Approved</option>
            <option value="SECONDARY_REJECTED">Secondary Needs Changes</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-slate-150 bg-slate-50/50">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {header.isPlaceholder ? null : (
                          <div
                            className={header.column.getCanSort() ? 'cursor-pointer select-none flex items-center gap-1.5 hover:text-slate-800' : ''}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No users matching current role composition filters.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-150 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Showing {table.getRowModel().rows.length} of {users.length} users
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-700">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Role Details Slide-Over Drawer */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-150 mb-6">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">{selectedUserForDetail.fullName}</h3>
                  <p className="text-xs text-slate-500">{selectedUserForDetail.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUserForDetail(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">Role Hierarchy</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600">Primary Role:</span>
                      <span className="font-bold uppercase bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded-full text-xs">
                        {selectedUserForDetail.primaryRole || selectedUserForDetail.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600">Secondary Role:</span>
                      <span className="font-bold uppercase bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full text-xs">
                        {selectedUserForDetail.secondaryRole || 'NONE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600">Secondary Status:</span>
                      <span className={`font-bold uppercase px-2.5 py-0.5 rounded-full text-xs ${
                        selectedUserForDetail.secondaryRoleStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        selectedUserForDetail.secondaryRoleStatus === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedUserForDetail.secondaryRoleStatus || 'NONE'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Role History & Details</h4>
                  
                  {selectedUserForDetail.secondaryRoleRequestedAt && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-150">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">Application Submitted</p>
                        <p className="text-xs text-slate-500">{new Date(selectedUserForDetail.secondaryRoleRequestedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {selectedUserForDetail.secondaryRoleAcquiredAt && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-150">
                      <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">Role Acquired & Approved</p>
                        <p className="text-xs text-slate-500">{new Date(selectedUserForDetail.secondaryRoleAcquiredAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {selectedUserForDetail.studentIdPhotoUrl && (
                    <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5">
                      <p className="text-xs font-bold uppercase text-slate-400">Student ID Verification Document</p>
                      <a
                        href={getFullFileUrl(selectedUserForDetail.studentIdPhotoUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1.5"
                      >
                        View Student / Provider ID Photo →
                      </a>
                    </div>
                  )}

                  {selectedUserForDetail.rejectionReason && (
                    <div className="p-3.5 bg-red-50 border border-red-150 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-2 text-red-700 font-bold">
                        <ShieldAlert className="w-4 h-4" /> Admin Rejection Notes
                      </div>
                      <p className="text-red-900 font-medium pl-6">{selectedUserForDetail.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedUserForDetail(null)}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Close Panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
