'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft, Zap, MapPin, Share2, Heart, Star,
  ShieldCheck, Users, Maximize, Clock, Power, Layout, X,
  Briefcase, PartyPopper, Music, Coffee, Loader2, Lightbulb,
  Sparkles, BrainCircuit, ChevronUp, ChevronDown, CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import { VenueRadarChart } from '@/components/RadarChart';
import { VenueCard } from '@/components/VenueCard';
import { getSimilarVenues } from '@/lib/similar-venues';
import { useAuth } from '@/context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import BookingBox from '@/components/BookingBox';

// --- ICONS MAPPING ---
const EVENT_ICONS: any = {
  corporate: <Briefcase size={18} />,
  social: <PartyPopper size={18} />,
  creative: <Music size={18} />,
  general: <Coffee size={18} />
};

export default function VenueDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const backLink = searchParams.get('from') || '/search';

  const [venue, setVenue] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [similarVenues, setSimilarVenues] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    async function loadData() {
      if (!id) return;

      const { data: venueData, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !venueData) {
        setLoading(false);
        return;
      }
      setVenue(venueData);

      // Fetch Reviews
      const { data: reviewData } = await supabase
        .from('venue_reviews')
        .select('id, score, review_text, created_at, reviewer_id')
        .eq('venue_id', id)
        .limit(5);
      if (reviewData) setReviews(reviewData);

      // Fetch Saved Status
      if (user) {
        const { data: savedData } = await supabase
          .from('saved_venues')
          .select('id')
          .eq('user_id', user.id)
          .eq('venue_id', id)
          .maybeSingle();
        setIsSaved(!!savedData);
      }

      // Fetch Similar Venues
      const { data: cityVenues } = await supabase
        .from('venues')
        .select('*')
        .eq('city', venueData.city)
        .neq('id', venueData.id)
        .limit(20);

      if (cityVenues) {
        const topEvent = Object.keys(venueData.event_compatibility || {})[0] || 'general';
        const similar = getSimilarVenues(venueData, topEvent, cityVenues);
        setSimilarVenues(similar);
      }

      setLoading(false);
    }
    loadData();
  }, [id, user]);

  const toggleSave = async (e: any) => {
    e.stopPropagation();
    if (!user) return router.push('/auth/login');
    if (isSaved) {
      await supabase.from('saved_venues').delete().match({ user_id: user.id, venue_id: id });
      setIsSaved(false);
      toast.success("Removed from wishlist");
    } else {
      await supabase.from('saved_venues').insert({ user_id: user.id, venue_id: id });
      setIsSaved(true);
      toast.success("Saved to wishlist");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#263238] flex items-center justify-center text-[#C6FF00]"><Loader2 className="animate-spin" /></div>;
  if (!venue) return null;

  // Analysis Data
  const analysis = venue.analysis_json || {};
  const radarStats = {
    vibe: venue.space_vibrancy || 5,
    safety: venue.nfpa101_status === 'compliant' ? 9 : 5,
    acoustics: venue.room_acoustics === 'dead' ? 9 : 6,
    lighting: Math.round((venue.natural_light_potential || 50) / 10),
    spaciousness: Math.min(Math.round((venue.comfortable_capacity || 0) / 10), 10),
    accessibility: venue.space_accessibility || 5,
  };
  const capacity = venue.comfortable_capacity || 50;
  const bestEvents = venue.use_case_tags?.primary || ['General'];

  return (
    <div className="min-h-screen bg-[#263238] text-white pb-20">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#37474F', color: '#fff' } }} />

      {/* --- HERO HEADER --- */}
      <div className="relative h-[65vh] w-full group cursor-pointer" onClick={() => setShowGallery(true)}>
        <Image
          src={venue.venue_image_url || '/placeholder.jpg'}
          alt={venue.name}
          fill
          className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-[2s]"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#263238] via-[#263238]/40 to-[#263238]/30" />

        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 p-6 pt-28 flex justify-between items-start z-10 pointer-events-none">
          <button onClick={(e) => { e.stopPropagation(); router.push(backLink); }} className="pointer-events-auto px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-sm font-bold hover:bg-black/60 transition-colors flex items-center gap-2">
            <ChevronLeft size={16} /> Back
          </button>
          <div className="flex gap-2 pointer-events-auto">
            <button className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/60 transition-colors"><Share2 size={18} /></button>
            <button onClick={toggleSave} className={`p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/60 transition-colors ${isSaved ? 'text-red-500' : 'text-white'}`}>
              <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {/* Title Block */}
        <div className="absolute bottom-0 left-0 p-6 md:p-12 z-10 w-full md:w-2/3">
          <div className="flex items-center gap-2 text-[#C6FF00] font-bold tracking-widest text-xs uppercase mb-2">
            <ShieldCheck size={14} /> AI Verified Venue
          </div>
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-4 drop-shadow-lg">{venue.name}</h1>
          <div className="flex flex-wrap items-center gap-6 text-lg text-gray-200">
            <span className="flex items-center gap-2"><MapPin size={18} className="text-[#C6FF00]" /> {venue.location}, {venue.city}</span>
            <span className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full text-sm border border-white/10">
              <Star size={14} className="text-yellow-400" fill="currentColor" /> {venue.user_score || "New"}
            </span>
          </div>
        </div>

        <div className="absolute bottom-12 right-12 hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-sm font-bold animate-pulse">
          <Maximize size={16} /> View Gallery
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-12">

        {/* --- LEFT COLUMN: DETAILS --- */}
        <div className="lg:col-span-2 space-y-12">

          {/* Event Compatibility */}
          <section>
            <h3 className="text-xl font-bold mb-6">Event Compatibility</h3>
            <div className="flex flex-wrap gap-4">
              {bestEvents.map((tag: string) => {
                const type = tag.toLowerCase().includes('corporate') ? 'corporate' : tag.toLowerCase().includes('party') ? 'social' : 'general';
                return (
                  <div key={tag} className="flex items-center gap-3 px-5 py-3 bg-[#37474F]/50 border border-white/5 rounded-xl">
                    <div className="p-2 bg-[#C6FF00]/10 rounded-lg text-[#C6FF00]">
                      {EVENT_ICONS[type] || EVENT_ICONS.general}
                    </div>
                    <div>
                      <p className="font-bold text-white capitalize">{tag.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Recommended</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Space Reality & Logistics */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#37474F]/30 border border-white/5 p-6 rounded-2xl">
              <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                <Users size={14} /> Guest Comfort Bands
              </h4>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2"><span className="text-emerald-400 font-bold">Ideal</span> <span>15 - {capacity}</span></div>
                  <div className="h-2 w-full bg-black/40 rounded-full"><div className="h-full bg-emerald-400 w-[80%] rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" /></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2"><span className="text-amber-400 font-bold">Stretch</span> <span>{capacity} - {Math.round(capacity * 1.2)}</span></div>
                  <div className="h-2 w-full bg-black/40 rounded-full"><div className="h-full bg-amber-400 w-[50%] rounded-full" /></div>
                </div>
              </div>
            </div>

            <div className="bg-[#37474F]/30 border border-white/5 p-6 rounded-2xl space-y-6">
              <div className="flex items-start gap-4">
                <Clock className="text-[#C6FF00] mt-1" size={20} />
                <div>
                  <p className="font-bold text-white">Setup Time</p>
                  <p className="text-sm text-gray-400">{analysis.logistics?.estimatedSetupTime || "30-45 mins"}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Power className="text-[#C6FF00] mt-1" size={20} />
                <div>
                  <p className="font-bold text-white">Power</p>
                  <p className="text-sm text-gray-400">{analysis.logistics?.powerSockets || "Standard 15A"}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Intelligence Report */}
          <section className="bg-[#37474F]/30 border border-white/5 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2"><Zap className="text-[#C6FF00]" /> Intelligence Report</h3>
              <div className="bg-black/40 px-3 py-1 rounded-lg text-xs font-bold text-[#C6FF00] border border-[#C6FF00]/20">AI GENERATED</div>
            </div>
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="w-full md:w-1/2 aspect-square max-h-[300px]">
                <VenueRadarChart stats={radarStats} viewMode="planner" />
              </div>
              <div className="w-full md:w-1/2">
                <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Analysis Summary</h4>
                <p className="text-lg text-white font-light leading-relaxed mb-6">
                  {analysis.comprehensiveAssessment?.summary || "This venue scores exceptionally well for intimate and social gatherings."}
                </p>
              </div>
            </div>
          </section>

          {/* AI Suggestions Dropdown */}
          <section className="bg-[#37474F]/30 border border-white/5 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Lightbulb className="text-[#C6FF00]" size={20} />
                AI Usage Suggestions
              </h3>
              <span className="text-xs bg-black/40 px-3 py-1 rounded-full text-gray-400 border border-white/5">
                {(analysis.suggestions?.length || 0)} Ideas
              </span>
            </div>

            <div className="space-y-4">
              {/* Top 5 Always Visible */}
              {(analysis.suggestions || ["No suggestions available."]).slice(0, 5).map((suggestion: string, i: number) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-black/20 hover:bg-black/30 transition-colors border border-white/5">
                  <div className="mt-1 p-1.5 rounded-full bg-[#C6FF00]/10 text-[#C6FF00]">
                    <Sparkles size={14} />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{suggestion}</p>
                </div>
              ))}

              {/* Collapsible Section */}
              {showAllSuggestions && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  {(analysis.suggestions || []).slice(5).map((suggestion: string, i: number) => (
                    <div key={i + 5} className="flex items-start gap-4 p-4 rounded-xl bg-black/20 hover:bg-black/30 transition-colors border border-white/5">
                      <div className="mt-1 p-1.5 rounded-full bg-purple-500/10 text-purple-400">
                        <BrainCircuit size={14} />
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle Button */}
            {(analysis.suggestions?.length || 0) > 5 && (
              <button
                onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                className="w-full mt-6 py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-white/5 hover:border-white/20"
              >
                {showAllSuggestions ? (
                  <>Show Less <ChevronUp size={14} /></>
                ) : (
                  <>View {(analysis.suggestions?.length || 0) - 5} More Ideas <ChevronDown size={14} /></>
                )}
              </button>
            )}
          </section>

          {/* Similar Venues */}
          {similarVenues.length > 0 && (
            <section>
              <h3 className="text-xl font-bold mb-6">Similar Spaces</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {similarVenues.map(v => (
                  <VenueCard key={v.id} venue={v} matchScore={v.relevanceScore || 80} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* --- RIGHT COLUMN: BOOKING --- */}
        <div className="lg:col-span-1">
          <BookingBox
            venueId={venue.id}
            pricePerHour={venue.price_per_hour}
            ownerId={venue.owner_id}
            userScore={venue.user_score}
          />
        </div>

      </div>

      {/* GALLERY MODAL */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
          <button onClick={() => setShowGallery(false)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={24} /></button>
          <div className="w-full max-w-6xl h-full overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {venue.photos?.map((photo: string, i: number) => (
              <div key={i} className="relative aspect-video rounded-xl overflow-hidden">
                <Image src={photo} fill className="object-cover" alt="Gallery" unoptimized />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}