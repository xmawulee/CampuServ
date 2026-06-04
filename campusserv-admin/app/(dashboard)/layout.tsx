"use client";

import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { useAdminStomp } from '@/hooks/useAdminStomp';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { accessToken, adminUser } = useAdminAuthStore();
  const [mounted, setMounted] = useState(false);
  
  // Initialize global STOMP client
  useAdminStomp();

  useEffect(() => {
    setMounted(true);
    if (!accessToken || adminUser?.role !== 'ADMIN') {
      router.push('/login');
    }
  }, [accessToken, adminUser, router]);

  if (!mounted || !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E6E6E6]">
        <div className="w-8 h-8 border-4 border-[#FF7846] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E6E6E6] flex">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

// patch
