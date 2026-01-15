'use client';

import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, AlertCircle, LogIn, Check } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next'); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(nextUrl || '/'); 
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#C6FF00] text-[#263238] shadow-[0_0_20px_-5px_rgba(198,255,0,0.5)] mb-4">
          <Check strokeWidth={3} size={24} />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Welcome Back</h1>
        <p className="text-gray-400 text-sm mt-2">Access your dashboard</p>
      </div>

      {/* Glass Card */}
      <div className="bg-[#37474F]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-4">
            
            <div className="relative group">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-[#C6FF00] transition-colors" />
              <input
                type="email"
                required
                placeholder="Email address"
                className="block w-full pl-12 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#C6FF00] focus:ring-1 focus:ring-[#C6FF00] transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-[#C6FF00] transition-colors" />
              <input
                type="password"
                required
                placeholder="Password"
                className="block w-full pl-12 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#C6FF00] focus:ring-1 focus:ring-[#C6FF00] transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/auth/forgot-password" className="text-xs text-gray-400 hover:text-[#C6FF00] transition-colors">
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#C6FF00] text-[#263238] rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C6FF00]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Sign In <LogIn size={16} /></>}
          </button>
        </form>
      </div>

      {/* Footer Link */}
      <p className="text-center mt-8 text-sm text-gray-500">
        Don't have an account?{' '}
        <Link href="/auth/signup" className="text-white font-bold hover:text-[#C6FF00] transition-colors">
          Sign Up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#263238] p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C6FF00]/5 rounded-full blur-3xl pointer-events-none" />
      
      <Suspense fallback={<div className="text-[#C6FF00]"><Loader2 className="animate-spin" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}