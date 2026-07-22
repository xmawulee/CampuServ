"use client";

import { X, AlertTriangle, Users, FileText, CheckCircle, Info } from 'lucide-react';
import { useEffect } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = (type: string, severity?: string) => {
    if (severity === 'CRITICAL') return { icon: AlertTriangle, color: 'text-red-500' };
    if (severity === 'WARNING') return { icon: AlertTriangle, color: 'text-amber-500' };
    if (type.includes('provider') || type.includes('user')) return { icon: Users, color: 'text-indigo-600' };
    if (type.includes('dispute')) return { icon: AlertTriangle, color: 'text-red-500' };
    if (type.includes('job') || type.includes('success')) return { icon: CheckCircle, color: 'text-emerald-600' };
    return { icon: Info, color: 'text-slate-400' };
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className={`fixed inset-y-0 right-0 w-[380px] bg-white border-l border-slate-100 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Alerts</h2>
            {notifications.some(n => !n.isRead) && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-1 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-200">
          {notifications.length === 0 ? (
            <div className="text-center text-slate-400 py-16 text-sm font-medium">
              No recent alerts
            </div>
          ) : (
            notifications.map((notif) => {
              const { icon: Icon, color } = getIcon(notif.type, notif.type);
              return (
                <div 
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`border ${
                    notif.isRead 
                      ? 'bg-slate-50/70 border-slate-100 text-slate-500 opacity-75' 
                      : 'bg-indigo-50/30 border-indigo-100/80 text-slate-900'
                  } p-4 rounded-xl hover:border-slate-200 cursor-pointer transition-all relative overflow-hidden shadow-xs`}
                >
                  {!notif.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
                  )}
                  <div className="flex gap-3">
                    <div className={`mt-0.5 ${color} shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${notif.isRead ? 'text-slate-600 font-medium' : 'text-slate-900 font-bold'} leading-snug mb-1`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : 'Just now'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
