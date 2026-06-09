"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  ClipboardList, 
  CheckSquare, 
  AlertTriangle, 
  TrendingUp,
  Flag,
  Tag,
  Megaphone,
  Settings,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { adminUser, logout } = useAdminAuthStore();

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      ],
    },
    {
      title: 'PEOPLE',
      items: [
        { name: 'Users', href: '/users', icon: Users },
        { name: 'Providers', href: '/providers', icon: Briefcase },
        { name: 'Pending Verifications', href: '/providers/pending', icon: CheckSquare },
      ],
    },
    {
      title: 'MARKETPLACE',
      items: [
        { name: 'Service Requests', href: '/requests', icon: ClipboardList },
        { name: 'Jobs', href: '/jobs', icon: CheckSquare },
        { name: 'Disputes', href: '/disputes', icon: AlertTriangle, badge: 1 },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        { name: 'Revenue & Commission', href: '/finance', icon: TrendingUp },
      ],
    },
    {
      title: 'PLATFORM',
      items: [
        { name: 'Reports', href: '/reports', icon: Flag, badge: 0 },
        { name: 'Categories', href: '/categories', icon: Tag },
        { name: 'Announcements', href: '/announcements', icon: Megaphone },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="w-[260px] h-screen bg-white border-r border-gray-100 flex flex-col hidden md:flex shrink-0 fixed left-0 top-0 z-30 shadow-sm">
      <div className="p-6 flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">CAMPUSERV</h1>
        <span className="bg-indigo-100 text-indigo-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide">Admin</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <h2 className="text-xs font-bold text-slate-400 mb-3 px-2 tracking-widest uppercase">
              {group.title}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-600' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="flex-1">{item.name}</span>
                    {item.badge ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.badge > 0 && ['Disputes', 'Reports'].includes(item.name)
                          ? 'bg-red-100 text-red-600'
                          : item.badge > 0
                            ? 'bg-indigo-100 text-indigo-600'
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 mb-3 border border-slate-100">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-indigo-700">
              {adminUser?.name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {adminUser?.name || 'Admin User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {adminUser?.email || 'admin@campuserv.com'}
            </p>
          </div>
        </div>

        <button 
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
// patch
