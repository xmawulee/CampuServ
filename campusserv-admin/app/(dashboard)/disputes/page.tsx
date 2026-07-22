"use client";

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Loader2, ArrowUpDown, Search, AlertTriangle, MessageSquare, CheckCircle, SplitSquareVertical, RotateCcw } from 'lucide-react';
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
interface Dispute {
  id: string;
  jobId: string;
  raisedById: string;
  reason: string;
  status: string; // OPEN, UNDER_REVIEW, RESOLVED
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const columnHelper = createColumnHelper<Dispute>();

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  // Resolution state
  const [resolutionNote, setResolutionNote] = useState('');
  const [splitPercentage, setSplitPercentage] = useState('50');

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      // Fetch from supporting-service which routes /disputes
      const res = await api.get('/disputes');
      setDisputes(res.data.content || res.data || []);
    } catch (error) {
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (type: 'REFUND_REQUESTER' | 'RELEASE_TO_PROVIDER' | 'SPLIT') => {
    if (!selectedDispute) return;
    
    if (!resolutionNote.trim()) {
      toast.error('Please provide a resolution note.');
      return;
    }
    
    let confirmMsg = '';
    if (type === 'REFUND_REQUESTER') confirmMsg = 'Refund student entirely?';
    if (type === 'RELEASE_TO_PROVIDER') confirmMsg = 'Release escrow to provider entirely?';
    if (type === 'SPLIT') confirmMsg = `Split ${splitPercentage}% to provider, rest to student?`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.put(`/disputes/${selectedDispute.id}/resolve`, {
        resolution: type,
        note: resolutionNote,
        providerPercentage: type === 'SPLIT' ? splitPercentage : undefined
      });
      toast.success('Dispute resolved');
      fetchDisputes();
      setSelectedDispute(null);
      setResolutionNote('');
      setSplitPercentage('50');
    } catch (error: any) {
      toast.error(error.response?.data || 'Failed to resolve dispute');
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('id', {
      header: 'Dispute ID',
      cell: info => <div className="text-xs text-slate-500 font-medium font-mono truncate max-w-[80px]">{info.getValue().split('-')[0]}...</div>,
    }),
    columnHelper.accessor('jobId', {
      header: 'Job ID',
      cell: info => <div className="font-medium text-slate-900 font-bold truncate max-w-[120px]">{info.getValue().split('-')[0]}...</div>,
    }),
    columnHelper.accessor('reason', {
      header: 'Reason',
      cell: info => <div className="text-gray-300 truncate max-w-[200px]" title={info.getValue()}>{info.getValue()}</div>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          info.getValue() === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
          info.getValue() === 'UNDER_REVIEW' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {info.getValue().replace('_', ' ')}
        </span>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Raised On',
      cell: info => <div className="text-slate-500 font-medium text-xs">{new Date(info.getValue()).toLocaleString()}</div>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => (
        <button 
          onClick={() => setSelectedDispute(props.row.original)}
          className="px-3 py-1 text-xs bg-indigo-600/20 text-indigo-600 hover:bg-indigo-600/40 rounded transition-colors"
        >
          Investigate
        </button>
      )
    })
  ], []);

  const table = useReactTable({
    data: disputes,
    columns,
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
        <h1 className="text-2xl font-bold text-slate-900 font-bold">Disputes Queue</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 font-medium" />
          <input 
            type="text" 
            placeholder="Search disputes..." 
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-200 rounded-lg py-1.5 pl-9 pr-4 text-sm text-slate-900 font-bold placeholder:text-slate-500 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white border border-gray-200"
          />
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Main List */}
        <div className={`${selectedDispute ? 'w-1/2 lg:w-2/3' : 'w-full'} bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl flex flex-col overflow-hidden transition-all duration-300`}>
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
                      className={`border-b border-gray-100 hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedDispute?.id === row.original.id ? 'bg-indigo-600/10' : ''}`}
                      onClick={() => setSelectedDispute(row.original)}
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
                      <td colSpan={columns.length} className="p-8 text-center text-slate-500 font-medium">
                        No disputes found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Investigation View Panel */}
        {selectedDispute && (
          <div className="w-1/2 lg:w-1/3 bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900 font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Investigation
              </h2>
              <button 
                onClick={() => setSelectedDispute(null)}
                className="text-slate-500 font-medium hover:text-slate-900 font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Context */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 font-bold mb-2 uppercase tracking-wide">Context</h3>
                <div className="space-y-2 text-sm text-slate-500 font-medium">
                  <p><span className="font-medium text-slate-900 font-bold">Job ID:</span> {selectedDispute.jobId}</p>
                  <p><span className="font-medium text-slate-900 font-bold">Raised By:</span> {selectedDispute.raisedById}</p>
                  <p><span className="font-medium text-slate-900 font-bold">Date:</span> {new Date(selectedDispute.createdAt).toLocaleString()}</p>
                  <div className="bg-slate-50 p-3 rounded mt-2 border border-gray-100">
                    <p className="text-slate-900 font-bold italic">&quot;{selectedDispute.reason}&quot;</p>
                  </div>
                </div>
              </div>

              {/* Resolution Action */}
              {selectedDispute.status !== 'RESOLVED' ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 font-bold mb-3 uppercase tracking-wide">Take Action</h3>
                  <div className="space-y-4">
                    <textarea 
                      placeholder="Admin notes (required)..."
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg p-3 text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white border border-gray-200 min-h-[100px]"
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                    ></textarea>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleResolve('REFUND_REQUESTER')}
                        className="flex flex-col items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span className="text-xs font-medium">Refund Client</span>
                      </button>

                      <button 
                        onClick={() => handleResolve('RELEASE_TO_PROVIDER')}
                        className="flex flex-col items-center justify-center gap-2 p-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-xs font-medium">Release to Provider</span>
                      </button>

                      <div className="col-span-2 border border-yellow-500/20 rounded-lg p-3 bg-yellow-500/5">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-yellow-500 font-medium flex items-center gap-1">
                            <SplitSquareVertical className="w-4 h-4" /> Split Payment
                          </span>
                          <span className="text-xs text-slate-500 font-medium">Provider gets {splitPercentage}%</span>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="range" min="10" max="90" step="10" 
                            value={splitPercentage} 
                            onChange={(e) => setSplitPercentage(e.target.value)}
                            className="flex-1"
                          />
                          <button 
                            onClick={() => handleResolve('SPLIT')}
                            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold rounded"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <h3 className="text-green-400 font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Dispute Resolved
                  </h3>
                  <p className="text-sm text-gray-300 mt-2">Resolution: <span className="font-medium text-slate-900 font-bold">{selectedDispute.resolution}</span></p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Resolved at {new Date(selectedDispute.resolvedAt || '').toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

