'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Mail, Loader2, AlertCircle, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: "Check your email for a password reset link." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#263238] p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C6FF00]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Reset Password</h1>
          <p className="text-gray-400 text-sm mt-2">Enter your email to recover access</p>
        </div>

        {/* Glass Card */}
        <div className="bg-[#37474F]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {message?.type === 'success' ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-[#C6FF00]/10 rounded-full flex items-center justify-center mx-auto text-[#C6FF00] border border-[#C6FF00]/20">
                <Send size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Link Sent!</h3>
              <p className="text-gray-400 text-sm">{message.text}</p>
              <Link href="/auth/login" className="block w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-colors mt-6">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
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

              {message?.type === 'error' && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <AlertCircle size={14} /> {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#C6FF00] text-[#263238] rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C6FF00]/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>

        {/* Footer Link */}
        <div className="text-center mt-8">
          <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}