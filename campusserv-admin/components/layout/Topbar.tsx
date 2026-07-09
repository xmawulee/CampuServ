"use client";

import { usePathname } from 'next/navigation';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Bell, Menu } from 'lucide-react';
import { useState } from 'react';
import NotificationPanel from './NotificationPanel';

export default function Topbar() {
  const pathname = usePathname();
  const { adminUser } = useAdminAuthStore();
  const { unreadCount } = useNotificationStore();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const getPageTitle = () => {
    if (pathname === '/') return 'Overview';
    if (pathname.includes('/providers/pending')) return 'Pending Approvals';
    if (pathname.includes('/providers')) return 'Providers';
    if (pathname.includes('/users')) return 'Users';
    if (pathname.includes('/verification')) return 'ID Verification';
    if (pathname.includes('/requests')) return 'Service Requests';
    if (pathname.includes('/jobs')) return 'Jobs';
    if (pathname.includes('/disputes')) return 'Disputes';
    if (pathname.includes('/finance')) return 'Finance & Revenue';
    if (pathname.includes('/reports')) return 'Reports';
    if (pathname.includes('/categories')) return 'Categories';
    if (pathname.includes('/announcements')) return 'Announcements';
    if (pathname.includes('/settings')) return 'Settings';
    return 'Admin Dashboard';
  };

  return (
    <>
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button className="md:hidden text-slate-400 hover:text-slate-900">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{getPageTitle()}</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden md:inline">Platform Online</span>
          </div>

          <button 
            className="relative p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-colors"
            onClick={() => setIsNotificationOpen(true)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>
        </div>
      </header>

      <NotificationPanel 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
      />
    </>
  );
}
