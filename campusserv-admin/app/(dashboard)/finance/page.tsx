"use client";

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Loader2, ArrowUpDown, Search, ExternalLink, ShieldAlert, CheckCircle, RefreshCw, DollarSign, Wallet, Activity } from 'lucide-react';
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

// Define models
interface WalletTransaction {
  id: string;
  walletTxnId: string;
  paystackReference: string | null;
  userId: string;
  ownerName: string;
  type: string;
  status: string;
  amount: number;
  netAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod: string;
  initiatedAt: string;
}

interface EscrowTransaction {
  id: string;
  jobId: string;
  amount: number;
  status: string;
  paystackReference: string | null;
  payerName: string;
  providerName: string;
  serviceTitle: string;
  escrowStatus: string;
  createdAt: string;
}

// Columns for Ledger
const ledgerColumnHelper = createColumnHelper<WalletTransaction>();
const ledgerColumns = [
  ledgerColumnHelper.accessor('walletTxnId', {
    header: 'Txn ID',
    cell: info => <div className="text-xs text-slate-500 font-medium font-mono truncate max-w-[80px]">{info.getValue().split('-')[0]}...</div>,
  }),
  ledgerColumnHelper.accessor('ownerName', {
    header: 'User',
    cell: info => <div className="font-semibold text-slate-900 font-bold truncate max-w-[150px]">{info.getValue()}</div>,
  }),
  ledgerColumnHelper.accessor('type', {
    header: 'Type',
    cell: info => (
      <span className={`text-xs px-2 py-1 rounded font-medium ${
        info.getValue() === 'DEPOSIT' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
      }`}>
        {info.getValue()}
      </span>
    ),
  }),
  ledgerColumnHelper.accessor('amount', {
    header: 'Amount',
    cell: info => <div className="text-slate-900 font-bold font-medium">GHS {info.getValue().toFixed(2)}</div>,
  }),
  ledgerColumnHelper.accessor('status', {
    header: 'Status',
    cell: info => (
      <span className={`text-xs font-medium ${
        info.getValue() === 'SUCCESS' ? 'text-green-400' :
        info.getValue() === 'PENDING' || info.getValue() === 'PROCESSING' ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {info.getValue()}
      </span>
    ),
  }),
  ledgerColumnHelper.accessor('paymentMethod', {
    header: 'Method',
    cell: info => <div className="text-slate-500 font-medium text-xs">{info.getValue()}</div>,
  }),
  ledgerColumnHelper.accessor('initiatedAt', {
    header: 'Date',
    cell: info => <div className="text-slate-500 font-medium text-xs">{new Date(info.getValue()).toLocaleString()}</div>,
  }),
  ledgerColumnHelper.display({
    id: 'actions',
    cell: props => (
      <button 
        onClick={() => {
          if (props.row.original.paystackReference) {
             window.open(`https://dashboard.paystack.com/#/transactions/${props.row.original.paystackReference}`, '_blank');
          } else {
             toast.info('No Paystack reference for this transaction');
          }
        }}
        className="p-1 hover:bg-white/10 rounded text-slate-500 font-medium transition-colors"
        title="View in Paystack"
      >
        <ExternalLink className="w-4 h-4" />
      </button>
    )
  })
];

const escrowColumnHelper = createColumnHelper<EscrowTransaction>();

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LEDGER' | 'ESCROW' | 'WITHDRAWALS'>('OVERVIEW');
  
  // Data states
  const [stats, setStats] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<WalletTransaction[]>([]);
  const [escrowData, setEscrowData] = useState<EscrowTransaction[]>([]);
  const [withdrawalsData, setWithdrawalsData] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      if (tab === 'OVERVIEW') {
        const res = await api.get('/admin/finance/stats');
        setStats(res.data);
      } else if (tab === 'LEDGER') {
        const res = await api.get('/admin/finance/ledger');
        setLedgerData(res.data);
      } else if (tab === 'ESCROW') {
        const res = await api.get('/admin/finance/escrow');
        setEscrowData(res.data);
      } else if (tab === 'WITHDRAWALS') {
        const res = await api.get('/admin/finance/withdrawals');
        setWithdrawalsData(res.data);
      }
    } catch (error) {
      toast.error('Failed to load ' + tab.toLowerCase() + ' data');
    } finally {
      setLoading(false);
    }
  };

  const handleEscrowAction = async (transactionId: string, action: string) => {
    const reason = prompt(`Reason for escrow action (${action}):`);
    if (!reason) return;

    try {
      await api.post(`/admin/finance/escrow/${transactionId}/action`, { action, reason });
      toast.success(`Escrow action ${action} executed.`);
      fetchData('ESCROW');
    } catch (error) {
      toast.error('Failed to execute escrow action.');
    }
  };

  const escrowColumns = useMemo(() => [
    escrowColumnHelper.accessor('id', {
      header: 'Job ID / Txn ID',
      cell: info => <div className="text-xs text-slate-500 font-medium font-mono truncate max-w-[100px]">{info.getValue()}</div>,
    }),
    escrowColumnHelper.accessor('serviceTitle', {
      header: 'Service',
      cell: info => <div className="font-semibold text-slate-900 font-bold truncate max-w-[150px]">{info.getValue()}</div>,
    }),
    escrowColumnHelper.accessor('payerName', {
      header: 'Client',
      cell: info => <div className="text-gray-300">{info.getValue()}</div>,
    }),
    escrowColumnHelper.accessor('providerName', {
      header: 'Provider',
      cell: info => <div className="text-gray-300">{info.getValue()}</div>,
    }),
    escrowColumnHelper.accessor('amount', {
      header: 'Locked Amount',
      cell: info => <div className="text-yellow-400 font-medium">GHS {info.getValue().toFixed(2)}</div>,
    }),
    escrowColumnHelper.accessor('createdAt', {
      header: 'Locked Since',
      cell: info => {
        const date = new Date(info.getValue());
        const daysLocked = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
        return (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-xs">{date.toLocaleDateString()}</span>
            {daysLocked > 7 && (
              <span title="Locked for > 7 days!">
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </span>
            )}
          </div>
        );
      },
    }),
    escrowColumnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleEscrowAction(props.row.original.id, 'RELEASE_TO_PROVIDER')}
            className="px-2 py-1 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded border border-green-500/20 transition-colors"
          >
            Force Release
          </button>
          <button 
            onClick={() => handleEscrowAction(props.row.original.id, 'REFUND_TO_CLIENT')}
            className="px-2 py-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded border border-red-500/20 transition-colors"
          >
            Force Refund
          </button>
        </div>
      )
    })
  ], []);

  const getTableData = () => {
    if (activeTab === 'LEDGER') return ledgerData;
    if (activeTab === 'ESCROW') return escrowData;
    if (activeTab === 'WITHDRAWALS') return withdrawalsData;
    return [];
  };

  const getTableColumns = () => {
    if (activeTab === 'LEDGER' || activeTab === 'WITHDRAWALS') return ledgerColumns;
    if (activeTab === 'ESCROW') return escrowColumns;
    return [];
  };

  const table = useReactTable({
    data: getTableData() as any[],
    columns: getTableColumns() as any[],
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-bold">Finance & Ledger</h1>
        <div className="flex items-center gap-4">
          <div className="flex bg-white shadow-sm border border-gray-100 rounded-2xl rounded-lg p-1 border border-gray-100">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'OVERVIEW' ? 'bg-indigo-600 text-slate-900 font-bold' : 'text-slate-500 font-medium hover:text-slate-900 font-bold'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'LEDGER' ? 'bg-indigo-600 text-slate-900 font-bold' : 'text-slate-500 font-medium hover:text-slate-900 font-bold'}`}
            >
              Master Ledger
            </button>
            <button
              onClick={() => setActiveTab('ESCROW')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'ESCROW' ? 'bg-indigo-600 text-slate-900 font-bold' : 'text-slate-500 font-medium hover:text-slate-900 font-bold'}`}
            >
              Escrow Oversight
            </button>
            <button
              onClick={() => setActiveTab('WITHDRAWALS')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'WITHDRAWALS' ? 'bg-indigo-600 text-slate-900 font-bold' : 'text-slate-500 font-medium hover:text-slate-900 font-bold'}`}
            >
              Pending Withdrawals
            </button>
          </div>
          
          <button 
            onClick={() => fetchData(activeTab)}
            className="p-2 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-200 hover:bg-slate-50 text-slate-500 font-medium hover:text-slate-900 font-bold rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === 'OVERVIEW' ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-500 font-medium font-medium">Platform Revenue</h3>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
            </div>
            {loading ? (
              <div className="h-9 bg-white/10 w-1/2 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-slate-900 font-bold">GHS {stats?.platformRevenue?.toFixed(2) || '0.00'}</p>
            )}
            <p className="text-sm text-green-400 mt-2">↑ Admin Wallet Balance</p>
          </div>

          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-500 font-medium font-medium">System Escrow</h3>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            {loading ? (
              <div className="h-9 bg-white/10 w-1/2 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-slate-900 font-bold">GHS {stats?.totalEscrow?.toFixed(2) || '0.00'}</p>
            )}
            <p className="text-sm text-slate-500 font-medium mt-2">Locked in active jobs</p>
          </div>

          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-500 font-medium font-medium">User Balances</h3>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            {loading ? (
              <div className="h-9 bg-white/10 w-1/2 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-slate-900 font-bold">GHS {stats?.totalUserBalances?.toFixed(2) || '0.00'}</p>
            )}
            <p className="text-sm text-slate-500 font-medium mt-2">Withdrawable by User</p>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 font-bold">
              {activeTab === 'LEDGER' && 'System Ledger'}
              {activeTab === 'ESCROW' && 'Locked Escrow Funds'}
              {activeTab === 'WITHDRAWALS' && 'Withdrawal Queue'}
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 font-medium" />
              <input 
                type="text" 
                placeholder="Search records..." 
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-200 rounded-lg py-1.5 pl-9 pr-4 text-sm text-slate-900 font-bold placeholder:text-slate-500 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white border border-gray-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th 
                          key={header.id} 
                          className="p-4 border-b border-gray-100 text-xs uppercase tracking-wider font-semibold text-slate-500 font-medium cursor-pointer hover:bg-slate-50/50 transition-colors"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-2">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
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
                      className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors"
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
                      <td colSpan={getTableColumns().length} className="p-8 text-center text-slate-500 font-medium">
                        No {activeTab.toLowerCase()} records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

