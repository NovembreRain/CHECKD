'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight, Check } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/search'); // Or a 'verify email' page if you enforce it
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#263238] p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C6FF00]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#C6FF00] text-[#263238] shadow-[0_0_20px_-5px_rgba(198,255,0,0.5)] mb-4">
            <Check strokeWidth={3} size={24} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Initialize Account</h1>
          <p className="text-gray-400 text-sm mt-2">Join the curated venue network</p>
        </div>

        {/* Glass Card */}
        <div className="bg-[#37474F]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSignUp} className="space-y-5">
            
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

              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500 group-focus-within:text-[#C6FF00] transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="Confirm Password"
                  className="block w-full pl-12 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#C6FF00] focus:ring-1 focus:ring-[#C6FF00] transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
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
              {loading ? <Loader2 className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center mt-8 text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-white font-bold hover:text-[#C6FF00] transition-colors">
            Sign In
          </Link>
        </p>

      </div>
    </div>
  );
}