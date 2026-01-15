'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { VenueCard } from '@/components/VenueCard';
import { Loader2, Heart, X, Search } from 'lucide-react';
import { Venue } from '@/types';
import Link from 'next/link';

// Type for the joined query result
interface SavedItem {
  id: string; // The ID of the saved_venue record
  venue: Venue;
}

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Auth Guard
    if (!authLoading && !user) {
      router.push('/auth/login?next=/wishlist');
      return;
    }

    // 2. Fetch Data
    const fetchSaved = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_venues')
        .select(`
          id,
          venue:venues (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching wishlist:', error);
      } else {
        // Cast data to ensure TS knows 'venue' is a single object, not array
        setSavedItems(data as unknown as SavedItem[]);
      }
      setLoading(false);
    };

    fetchSaved();
  }, [user, authLoading, router]);

  // 3. Unsave Handler
  const handleUnsave = async (savedId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent clicking the card link
    e.stopPropagation();
    
    setRemovingId(savedId);

    const { error } = await supabase
      .from('saved_venues')
      .delete()
      .eq('id', savedId);

    if (!error) {
      // Optimistic UI update
      setSavedItems(prev => prev.filter(item => item.id !== savedId));
    } else {
      console.error('Failed to unsave:', error);
      alert("Could not remove venue. Please try again.");
    }
    setRemovingId(null);
  };

  // --- RENDER STATES ---

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#263238] flex items-center justify-center text-[#C6FF00]">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#263238] text-white pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
          <div className="p-3 bg-[#37474F] rounded-full border border-white/10">
            <Heart size={24} className="text-[#C6FF00]" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Your Wishlist</h1>
            <p className="text-gray-400 text-sm">
              {savedItems.length} {savedItems.length === 1 ? 'venue' : 'venues'} saved for later
            </p>
          </div>
        </div>

        {/* Grid or Empty State */}
        {savedItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedItems.map((item) => (
              <div key={item.id} className="relative group">
                
                {/* The Venue Card */}
                <VenueCard venue={item.venue} />

                {/* Floating "Unsave" Button (Overlay) */}
                <button
                  onClick={(e) => handleUnsave(item.id, e)}
                  disabled={removingId === item.id}
                  className="absolute top-3 left-3 z-20 p-2 bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-red-500/80 hover:border-red-500 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Remove from wishlist"
                >
                  {removingId === item.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                </button>

              </div>
            ))}
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20 opacity-70">
            <div className="w-24 h-24 bg-[#37474F] rounded-full flex items-center justify-center mb-6 border border-white/5 border-dashed">
              <Heart size={32} className="text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No saved venues yet</h2>
            <p className="text-gray-400 text-center max-w-sm mb-8">
              Explore our AI-verified listings to find the perfect space for your next event.
            </p>
            <Link 
              href="/search" 
              className="flex items-center gap-2 px-6 py-3 bg-[#C6FF00] text-[#263238] font-bold rounded-xl hover:bg-white hover:scale-105 transition-all"
            >
              <Search size={18} />
              Explore Venues
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}