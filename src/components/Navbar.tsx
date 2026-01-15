'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { 
  LogOut, 
  Check, 
  Settings, 
  HelpCircle, 
  LayoutDashboard, 
  Repeat, 
  ChevronDown,
  Loader2,
  MapPin,
  Calendar,
  Plus,
  MessageSquare,
  Heart
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const { mode, toggleMode } = useRole();
  const pathname = usePathname();
  
  // Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // --- STYLING HELPERS ---
  const linkClass = (path: string) => 
    `flex items-center px-4 h-8 rounded-md text-xs font-medium transition-all duration-200 border ${
      pathname === path 
        ? 'bg-[#C6FF00]/10 text-[#C6FF00] border-[#C6FF00]/20 shadow-[0_0_10px_-3px_rgba(198,255,0,0.15)]' 
        : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
    }`;

  const primaryBtnClass = "px-4 h-8 flex items-center gap-2 bg-[#C6FF00] text-[#263238] rounded-md font-bold text-xs uppercase tracking-wide hover:bg-white hover:scale-105 transition-all shadow-[0_0_15px_-3px_rgba(198,255,0,0.4)]";

  // Get User Initial
  const userInitial = user?.email ? user.email[0].toUpperCase() : 'U';

  // --- RENDER CONTENT ---
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full border-b border-white/5 bg-[#263238]/95 backdrop-blur-xl shadow-lg">
      <div className="max-w-7xl mx-auto px-6 h-14 flex justify-between items-center">
        
        {/* 1. LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-8 bg-[#C6FF00] rounded-[4px] flex items-center justify-center text-[#263238] shadow-[0_0_10px_rgba(198,255,0,0.3)]">
            <Check strokeWidth={3} size={14} /> 
          </div>
          <span className="text-lg font-bold tracking-tight text-white group-hover:text-gray-200 transition-colors">
            CHECK<span className="text-[#C6FF00]">D</span>
          </span>
        </Link>

        {/* 2. CENTER LINKS (DYNAMIC) */}
        <div className="hidden md:flex items-center gap-1">
          
          {/* STATE: GUEST (NOT LOGGED IN) */}
          {!user && !loading && (
            <>
              <Link href="/search" className={linkClass('/search')}>
                 Find a Venue
              </Link>
              {/* Redirects to login, then auto-redirects to upload */}
              <Link href="/auth/login?next=/upload" className={linkClass('/upload')}>
                 List Your Space
              </Link>
            </>
          )}

          {/* STATE: PLANNER MODE */}
          {user && mode === 'planner' && (
            <>
              <Link href="/search" className={linkClass('/search')}>
                Find Venue
              </Link>
              <Link href="/bookings" className={linkClass('/bookings')}>
                My Bookings
              </Link>
              <Link href="/faq" className={linkClass('/faq')}>
                FAQ
              </Link>
            </>
          )}

          {/* STATE: OWNER MODE */}
          {user && mode === 'owner' && (
            <>
              <Link href="/dashboard" className={linkClass('/dashboard')}>
                Dashboard
              </Link>
              <Link href="/dashboard/enquiries" className={linkClass('/dashboard/enquiries')}>
                Enquiries
              </Link>
              <Link href="/owner-faq" className={linkClass('/owner-faq')}>
                FAQ
              </Link>
            </>
          )}
        </div>

        {/* 3. RIGHT SIDE ACTIONS */}
        <div className="flex gap-4 items-center">
          
          {loading ? (
             <Loader2 className="animate-spin text-gray-500" size={16} />
          ) : !user ? (
            // --- GUEST RIGHT SIDE ---
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="text-xs font-medium text-gray-400 hover:text-white transition-colors uppercase tracking-wide">
                Sign In
              </Link>
              <Link href="/auth/signup" className={primaryBtnClass}>
                Get Started
              </Link>
            </div>
          ) : (
            // --- LOGGED IN RIGHT SIDE ---
            <div className="flex items-center gap-4">
              
              {/* Special Button: OWNER ONLY */}
              {mode === 'owner' && (
                <Link href="/upload" className={primaryBtnClass}>
                  <Plus size={14} strokeWidth={3} />
                  Upload New Venue
                </Link>
              )}

              {/* PROFILE DROPDOWN */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 focus:outline-none group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#C6FF00] text-[#263238] flex items-center justify-center font-bold text-sm shadow-lg group-hover:scale-105 transition-transform">
                    {userInitial}
                  </div>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* DROPDOWN MENU */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-[#2e3b41] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 bg-[#263238]">
                      <p className="text-sm text-white font-medium truncate">{user.email}</p>
                      <p className={`text-[10px] font-mono mt-1 uppercase tracking-wider ${mode === 'owner' ? 'text-[#C6FF00]' : 'text-blue-400'}`}>
                        {mode} MODE
                      </p>
                    </div>

                    {/* Mode Switcher */}
                    <div className="p-2">
                      <button 
                        onClick={() => {
                          toggleMode();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                      >
                        <div className="p-1.5 rounded bg-white/5 group-hover:bg-[#C6FF00]/20 group-hover:text-[#C6FF00] transition-colors">
                           <Repeat size={14} />
                        </div>
                        Switch to {mode === 'planner' ? 'Hosting' : 'Planning'}
                      </button>
                    </div>

                    <div className="h-px bg-white/5 mx-2 my-1" />

                    {/* Dynamic Links Based on Mode */}
                    <div className="p-2 space-y-1">
                      {mode === 'planner' ? (
                        <>
                           <Link href="/wishlist" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <Heart size={16} /> Saved / Wishlist
                          </Link>
                          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <Settings size={16} /> Settings
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <Settings size={16} /> Settings
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="h-px bg-white/5 mx-2 my-1" />

                    {/* Logout */}
                    <div className="p-2">
                      <button 
                        onClick={signOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut size={16} /> Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}