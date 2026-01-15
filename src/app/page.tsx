'use client';

import Link from 'next/link';
import { ShieldCheck, Search, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  // If user is logged in -> go to upload.
  // If user is guest -> go to login, then redirect to upload.
  const ownerDestination = user ? "/upload" : "/auth/login?next=/upload";

  return (
    <div className="min-h-screen bg-[#263238] text-white selection:bg-[#C6FF00] selection:text-[#263238] overflow-x-hidden">
      
      {/* --- HERO SECTION --- */}
      <div className="relative pt-24 pb-12 md:pt-32 md:pb-16">
        {/* Glow Background (Z-0) */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#C6FF00]/10 rounded-full blur-[100px] pointer-events-none z-0" />
        
        {/* Content (Z-10) */}
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="text-center max-w-4xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C6FF00]/20 bg-[#C6FF00]/5 backdrop-blur-sm mb-6 animate-fade-in-up">
              <Zap size={10} className="text-[#C6FF00]" />
              <span className="text-[#C6FF00] text-[10px] font-black uppercase tracking-widest">Powered by Gemini 3.0</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9]">
              AI-Verified <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C6FF00] to-emerald-400">Venues</span> <br/>
              for Every Event
            </h1>
            
            <p className="text-base md:text-lg text-gray-400 font-light leading-relaxed max-w-2xl mx-auto">
              Find compliant spaces in seconds. List your venue and earn passive income. 
              CHECKD handles the verification—you handle the events.
            </p>
          </div>

          {/* --- THE TWO JOURNEYS --- */}
          {/* Z-20 ensures clickable over any background elements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto relative z-20">
            
            {/* Journey 1: Organizer */}
            <Link 
              href="/search"
              className="group relative bg-[#37474F]/40 hover:bg-[#37474F] border border-white/5 hover:border-[#C6FF00]/50 rounded-xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(198,255,0,0.15)] flex flex-col items-start text-left h-full"
            >
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-[#C6FF00] shadow-inner border border-white/5 mb-4 group-hover:scale-110 transition-transform">
                <Search size={20} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Event Organizers</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Search AI-verified spaces with instant booking and transparent pricing.
              </p>
              <div className="mt-auto flex items-center gap-1 text-[#C6FF00] font-bold text-xs uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                Find a Venue <ArrowRight size={14} />
              </div>
            </Link>

            {/* Journey 2: Owner */}
            <Link 
              href={ownerDestination}
              className="group relative bg-[#37474F]/40 hover:bg-[#37474F] border border-white/5 hover:border-[#C6FF00]/50 rounded-xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(198,255,0,0.15)] flex flex-col items-start text-left h-full"
            >
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-[#C6FF00] shadow-inner border border-white/5 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck size={20} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Venue Owners</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Monetize your space. We handle NFPA compliance checks automatically.
              </p>
              <div className="mt-auto flex items-center gap-1 text-[#C6FF00] font-bold text-xs uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                List Your Space <ArrowRight size={14} />
              </div>
            </Link>

          </div>

        </div>
      </div>

      {/* --- STATS BAR --- */}
      <div className="border-y border-white/5 bg-black/20 backdrop-blur-sm relative z-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x-0 md:divide-x divide-white/5">
            <StatItem value="500+" label="Verified Venues" />
            <StatItem value="10K+" label="Events Hosted" />
            <StatItem value="98%" label="Match Accuracy" />
            <StatItem value="Zero" label="Booking Fees" />
          </div>
        </div>
      </div>
      
      <footer className="py-6 text-center text-gray-600 text-xs border-t border-white/5 mt-auto relative z-20">
        <p>&copy; 2026 CHECKD Inc. System Operational.</p>
      </footer>
    </div>
  );
}

function StatItem({ value, label }: any) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-2xl md:text-4xl font-black text-white mb-1 tracking-tighter">{value}</div>
      <div className="text-[10px] text-[#C6FF00] font-bold uppercase tracking-widest flex items-center gap-1 opacity-80">
        {label}
      </div>
    </div>
  );
}