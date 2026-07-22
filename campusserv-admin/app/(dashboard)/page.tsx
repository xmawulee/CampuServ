"use client";

import { 
  User, 
  Briefcase, 
  Activity, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnimatedStaggerContainer, AnimatedStaggerItem, AnimatedFadeIn } from '@/components/ui/AnimatedFadeIn';

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUser: 0,
    totalProviders: 0,
    activeJobs: 0,
    completedJobs: 0,
    pendingRequests: 0,
    openDisputes: 0,
    totalGMV: 0,
    pendingWithdrawals: 0,
    pendingVerifications: 0
  });

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [statsRes, chartRes] = await Promise.all([
          api.get('/admin/dashboard/stats').catch(() => ({ data: {} })),
          api.get('/admin/dashboard/chart').catch(() => ({ data: [] }))
        ]);

        setStats(statsRes.data || {});
        
        // Format chart data
        const formattedChartData = (chartRes.data || []).map((item: any) => {
          const d = new Date(item.date);
          return {
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            jobs: item.count || 0
          };
        });
        
        setChartData(formattedChartData);
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const totalPendingActions = (stats.pendingVerifications || 0) + (stats.openDisputes || 0) + (stats.pendingWithdrawals || 0);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* ROW 1 — HEADLINE KPI STAT CARDS */}
      <AnimatedStaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total User */}
        <AnimatedStaggerItem>
        <Link href="/users" className="bg-white border border-gray-100 shadow-sm p-6 rounded-3xl hover:shadow-md transition-all group block">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-indigo-50 rounded-2xl group-hover:bg-indigo-600 transition-colors">
              <User className="w-6 h-6 text-indigo-600 group-hover:text-slate-900 font-bold transition-colors" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">{stats.totalUser || 0}</h3>
            <p className="text-sm font-semibold text-slate-500">
              <span className="text-emerald-500">{stats.totalProviders || 0}</span> registered providers
            </p>
          </div>
        </Link>
        </AnimatedStaggerItem>

        {/* Card 2: Active Jobs */}
        <AnimatedStaggerItem>
        <Link href="/jobs?status=ACTIVE" className="bg-white border border-gray-100 shadow-sm p-6 rounded-3xl hover:shadow-md transition-all group relative overflow-hidden block">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-emerald-50 rounded-2xl group-hover:bg-emerald-500 transition-colors">
              <Briefcase className="w-6 h-6 text-emerald-600 group-hover:text-slate-900 font-bold transition-colors" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">{stats.activeJobs || 0}</h3>
            <p className="text-sm font-semibold text-slate-500">
              <span className="text-emerald-500">+{stats.pendingRequests || 0}</span> pending requests
            </p>
          </div>
        </Link>
        </AnimatedStaggerItem>

        {/* Card 3: GMV */}
        <AnimatedStaggerItem>
        <Link href="/finance" className="bg-white border border-gray-100 shadow-sm p-6 rounded-3xl hover:shadow-md transition-all group block">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-600 transition-colors">
              <Activity className="w-6 h-6 text-blue-600 group-hover:text-slate-900 font-bold transition-colors" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">₵{Number(stats.totalGMV || 0).toFixed(2)}</h3>
            <p className="text-sm font-semibold text-slate-500">
              Total platform GMV processed
            </p>
          </div>
        </Link>
        </AnimatedStaggerItem>

        {/* Card 4: Pending Actions */}
        <AnimatedStaggerItem>
        <Link href="/providers/pending" className={`border p-6 rounded-3xl transition-all group block ${
          totalPendingActions > 0 
            ? 'bg-white border-amber-200 shadow-[0_8px_30px_rgba(245,158,11,0.12)] hover:border-amber-400' 
            : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
        }`}>
          <div className="flex justify-between items-start mb-6">
            <div className={`p-3 rounded-2xl transition-colors ${
              totalPendingActions > 0 ? 'bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-slate-900 font-bold' : 'bg-slate-50 text-slate-400'
            }`}>
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className={`text-4xl font-bold mb-2 tracking-tight ${totalPendingActions > 0 ? 'text-amber-500' : 'text-slate-900'}`}>
              {totalPendingActions}
            </h3>
            <div className="text-xs font-semibold text-slate-500 flex flex-col gap-1">
              {stats.pendingVerifications > 0 && <span className="text-amber-600">{stats.pendingVerifications} provider approvals</span>}
              {stats.openDisputes > 0 && <span className="text-red-500">{stats.openDisputes} open disputes</span>}
              {stats.pendingWithdrawals > 0 && <span className="text-indigo-500">{stats.pendingWithdrawals} pending payouts</span>}
              {totalPendingActions === 0 && <span>All caught up! No pending actions.</span>}
            </div>
          </div>
        </Link>
        </AnimatedStaggerItem>

      </AnimatedStaggerContainer>
      
      {/* ROW 2 - Charts & Activity */}
      <AnimatedStaggerContainer staggerDelay={0.2} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <AnimatedStaggerItem className="lg:col-span-2 bg-white shadow-sm rounded-3xl border border-gray-100 p-8 flex flex-col min-h-[420px]">
          <h3 className="text-xl font-bold mb-8 text-slate-900 flex justify-between items-center tracking-tight">
            Platform Usage Overview
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Jobs Created</span>
          </h3>
          <div className="flex-1 min-h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF7846" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#FF7846" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CACACA" vertical={false} />
                  <XAxis dataKey="date" stroke="#96928E" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#96928E" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D8D8D8', color: '#5C5854', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    itemStyle={{ color: '#FF7846', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="jobs" stroke="#FF7846" strokeWidth={4} fillOpacity={1} fill="url(#colorJobs)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 font-medium">
                Not enough data to display chart
              </div>
            )}
          </div>
        </AnimatedStaggerItem>

        {/* Action Panel */}
        <AnimatedStaggerItem className="lg:col-span-1 bg-white shadow-sm rounded-3xl border border-gray-100 p-8 flex flex-col">
           <h3 className="text-xl font-bold mb-6 text-slate-900 tracking-tight flex items-center gap-2">
             <span className="text-amber-500">⚡</span> Needs Attention
           </h3>
           <div className="space-y-4 flex-1">
                
                <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div>
                    <h4 className="text-slate-900 font-bold mb-1">Open Disputes</h4>
                    <p className="text-sm font-medium text-slate-500">{stats.openDisputes || 0} tickets awaiting</p>
                  </div>
                  <Link href="/disputes" className="px-5 py-2.5 bg-white shadow-sm border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-bold rounded-xl transition-all">
                    Resolve
                  </Link>
                </div>

                <div className="flex justify-between items-center bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 hover:border-indigo-200 transition-colors">
                  <div>
                    <h4 className="text-indigo-950 font-bold mb-1">Provider Verifications</h4>
                    <p className="text-sm font-medium text-indigo-500/80">{stats.pendingVerifications || 0} apps pending</p>
                  </div>
                  <Link href="/providers/pending" className="px-5 py-2.5 bg-indigo-600 shadow-sm shadow-indigo-200 hover:bg-indigo-700 text-slate-900 font-bold text-sm font-bold rounded-xl transition-all">
                    Review
                  </Link>
                </div>

                <div className="flex justify-between items-center bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50 hover:border-emerald-200 transition-colors">
                  <div>
                    <h4 className="text-emerald-950 font-bold mb-1">Pending Payouts</h4>
                    <p className="text-sm font-medium text-emerald-600/80">{stats.pendingWithdrawals || 0} payout requests</p>
                  </div>
                  <Link href="/finance?tab=withdrawals" className="px-5 py-2.5 bg-emerald-600 shadow-sm shadow-emerald-200 hover:bg-emerald-700 text-slate-900 font-bold text-sm font-bold rounded-xl transition-all">
                    Process
                  </Link>
                </div>
                
           </div>
        </AnimatedStaggerItem>
      </AnimatedStaggerContainer>
    </div>
  );
}

