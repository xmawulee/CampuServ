"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { api } from '@/lib/api';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAdminAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, role, ...adminUser } = res.data;

      if (role !== 'ADMIN') {
        toast.error('This portal is for admin accounts only.');
        setIsLoading(false);
        return;
      }

      setAuth(accessToken, refreshToken, { ...adminUser, role });
      toast.success('Logged in successfully');
      router.push('/');
    } catch (error: any) {
      console.error('Login error:', error);
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Login failed. Please try again.';
      toast.error(typeof msg === 'string' ? msg : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#211F1D] via-[#2A2826] to-[#353331] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative background abstract circles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg className="w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50%" cy="50%" r="300" fill="none" stroke="#FF7846" strokeWidth="1" strokeDasharray="5 5" />
          <circle cx="50%" cy="50%" r="450" fill="none" stroke="#FF7846" strokeWidth="1.2" />
          <circle cx="50%" cy="50%" r="600" fill="none" stroke="#FF7846" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-[460px] bg-slate-900/60 backdrop-blur-2xl border border-white/5 shadow-2xl shadow-black/40 rounded-[32px] p-8 md:p-10 z-10 flex flex-col items-center">
        
        {/* Logo */}
        <img 
          src="/logo.png" 
          alt="CampuServ Logo" 
          className="w-24 h-24 object-contain mb-6 select-none hover:scale-105 transition-transform duration-300 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]"
        />

        {/* Headline */}
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2 text-center">
          Sign in with email
        </h1>
        <p className="text-sm text-slate-400 font-medium mb-8 text-center max-w-[320px]">
          Enter your credentials to access the CampuServ admin portal dashboard.
        </p>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full space-y-4">
          
          {/* Email input pill */}
          <div className="w-full bg-slate-950/40 border border-white/10 focus-within:bg-slate-950/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all">
            <Mail className="w-5 h-5 text-slate-500 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-white placeholder:text-slate-500 text-sm font-medium"
              placeholder="Email address"
              required
            />
          </div>

          {/* Password input pill */}
          <div className="w-full bg-slate-950/40 border border-white/10 focus-within:bg-slate-950/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all relative">
            <Lock className="w-5 h-5 text-slate-500 shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-white placeholder:text-slate-500 text-sm font-medium pr-10"
              placeholder="Password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-white font-semibold transition-colors"
            >
              Forgot password?
            </button>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3.5 px-4 rounded-2xl transition-all duration-300 shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Get Started'}
          </button>
        </form>

        {/* Separator */}
        <div className="w-full flex items-center gap-3 my-8">
          <div className="h-[1px] bg-white/5 flex-1"></div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Or sign in with</span>
          <div className="h-[1px] bg-white/5 flex-1"></div>
        </div>

        {/* Social Buttons */}
        <div className="w-full flex gap-3">
          {/* Google SSO button */}
          <button className="flex-1 h-12 bg-slate-950/40 hover:bg-slate-950/60 border border-white/10 rounded-2xl flex items-center justify-center shadow-sm hover:shadow transition-all group">
            <svg className="w-5 h-5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.77-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.68-5.17 3.68-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A11.97 11.97 0 0 0 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29A7.18 7.18 0 0 1 4.8 12c0-.79.13-1.57.38-2.29V6.6H1.29A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.29 5.4l3.98-3.11z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 6.48 0 1.93 3.17 0 7.8l3.97 3.1c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
          </button>

          {/* Facebook SSO button */}
          <button className="flex-1 h-12 bg-slate-950/40 hover:bg-slate-950/60 border border-white/10 rounded-2xl flex items-center justify-center shadow-sm hover:shadow transition-all group">
            <svg className="w-5 h-5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
            </svg>
          </button>

          {/* Apple SSO button */}
          <button className="flex-1 h-12 bg-slate-950/40 hover:bg-slate-950/60 border border-white/10 rounded-2xl flex items-center justify-center shadow-sm hover:shadow transition-all group">
            <svg className="w-5 h-5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="none">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.39z" fill="#FFFFFF"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
