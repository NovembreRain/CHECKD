'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type Mode = 'planner' | 'owner';

type RoleContextType = {
  mode: Mode;
  toggleMode: () => void;
  setMode: (mode: Mode) => void;
};

const RoleContext = createContext<RoleContextType>({ 
  mode: 'planner', 
  toggleMode: () => {}, 
  setMode: () => {} 
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [mode, setInternalMode] = useState<Mode>('planner');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 1. Initialize from localStorage to persist state across refreshes
  useEffect(() => {
    setMounted(true);
    const storedMode = localStorage.getItem('checkd_view_mode') as Mode;
    if (storedMode) {
      setInternalMode(storedMode);
    }
  }, []);

  // 2. Helper to sync state + localStorage
  const setMode = (newMode: Mode) => {
    setInternalMode(newMode);
    localStorage.setItem('checkd_view_mode', newMode);
  };

  // 3. Route Guard: Force Owner mode if accessing protected routes
  useEffect(() => {
    if (!mounted) return;
    if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/upload')) {
      if (mode !== 'owner') setMode('owner');
    }
  }, [pathname, mounted, mode]);

  const toggleMode = () => {
    const newMode = mode === 'planner' ? 'owner' : 'planner';
    setMode(newMode);
    
    // Redirect logic
    if (newMode === 'owner') {
      router.push('/dashboard');
    } else {
      router.push('/search');
    }
  };

  // Prevent hydration mismatch by rendering nothing until mounted
  if (!mounted) return <>{children}</>;

  return (
    <RoleContext.Provider value={{ mode, toggleMode, setMode }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext);