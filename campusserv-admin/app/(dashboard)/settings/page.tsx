"use client";

import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-bold">Platform Settings</h1>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl border border-gray-100 rounded-xl p-8 flex flex-col items-center justify-center h-[60vh] text-slate-500 font-medium">
        <Settings className="w-16 h-16 mb-4 opacity-50 text-indigo-600" />
        <h2 className="text-xl font-semibold text-slate-900 font-bold mb-2">Configuration</h2>
        <p>Admin platform settings and API key management.</p>
      </div>
    </div>
  );
}

