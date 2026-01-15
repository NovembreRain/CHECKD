// /src/app/search/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search as SearchIcon,
  Loader2,
  ArrowRight,
  CalendarX,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { VenueCard } from '@/components/VenueCard';

function useTypewriter(phrases: string[], speed = 50, pause = 1500) {
  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[index % phrases.length];
    const typeSpeed = isDeleting ? speed / 2 : speed;

    const timer = setTimeout(() => {
      if (!isDeleting && text === currentPhrase) {
        setTimeout(() => setIsDeleting(true), pause);
      } else if (isDeleting && text === '') {
        setIsDeleting(false);
        setIndex((prev) => prev + 1);
      } else {
        setText(currentPhrase.substring(0, text.length + (isDeleting ? -1 : 1)));
      }
    }, typeSpeed);

    return () => clearTimeout(timer);
  }, [text, isDeleting, index, phrases, speed, pause]);

  return text;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);
  const [responseTime, setResponseTime] = useState<number>(0);

  const placeholderText = useTypewriter([
    "Dance class for 20 students in Bandra",
    "Yoga workshop for 30 people in Borivali",
    "Tuition for 10 students in Auroville",
    "Corporate meeting for 100 people in Delhi",
    "Birthday party for 50 guests in Koramangala"
  ]);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setHasSearched(true);

    const searchStart = Date.now();

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set('q', searchQuery);
      router.replace(`/search?${params.toString()}`);

      const response = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.data || []);
      setResponseTime(Date.now() - searchStart);

    } catch (error: any) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  return (
    <>
      <div className="sticky top-14 z-30 px-4 py-4 bg-[#263238]/95 backdrop-blur-xl border-b border-white/5 shadow-md">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C6FF00] to-emerald-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-700" />

            <div className="relative flex items-center bg-[#37474F] rounded-xl border border-white/10 shadow-lg overflow-hidden">
              <div className="pl-4 text-[#C6FF00] flex items-center gap-2">
                <SearchIcon size={20} />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={query ? '' : placeholderText}
                className="w-full bg-transparent text-white text-base px-4 py-3 focus:outline-none placeholder:text-gray-500 font-medium"
              />
              <div className="pr-1.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="p-2 bg-white/5 hover:bg-[#C6FF00] hover:text-[#263238] rounded-lg text-gray-400 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                </button>
              </div>
            </div>
          </form>

          {responseTime > 0 && !loading && (
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
                <Zap size={10} className="text-[#C6FF00]" />
                Results in {responseTime}ms
              </p>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-6">
        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center pt-24 opacity-60">
            <div className="w-20 h-20 bg-[#37474F] rounded-full flex items-center justify-center mb-6 border border-white/5 animate-pulse-slow">
              <SearchIcon className="w-8 h-8 text-[#C6FF00]" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">Smart Semantic Search</h2>
            <p className="text-gray-400 text-center max-w-sm text-sm leading-relaxed">
              Describe your event and location naturally. <br />
              Fast, intelligent matching in under 500ms.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${results.length > 0 ? 'bg-[#C6FF00] animate-pulse' : 'bg-red-500'}`} />
                <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">
                  {results.length} {results.length === 1 ? 'Match' : 'Matches'} Found
                </p>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((venue) => (
                  <div key={venue.id} className="relative group">
                    {/* Availability Badge */}
                    {venue.availabilityScore === 0 && (
                      <div className="absolute top-3 right-3 z-20 pointer-events-none">
                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-red-500/90 text-white shadow-lg backdrop-blur-md flex items-center gap-1.5 border border-red-400/50">
                          <CalendarX size={12} /> Unavailable
                        </span>
                      </div>
                    )}

                    {venue.availabilityScore === 100 && venue.relevanceScore > 85 && (
                      <div className="absolute top-3 right-3 z-20 pointer-events-none">
                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-[#C6FF00]/90 text-[#263238] shadow-lg backdrop-blur-md flex items-center gap-1.5 border border-[#C6FF00]/50">
                          <CheckCircle2 size={12} /> Available
                        </span>
                      </div>
                    )}

                    {/* Match Score Badge */}
                    <div className="absolute top-3 left-3 z-20 pointer-events-none">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-black/60 text-[#C6FF00] backdrop-blur-md border border-[#C6FF00]/30">
                        {venue.relevanceScore}% Match
                      </span>
                    </div>

                    <div className={venue.availabilityScore === 0 ? 'opacity-75 grayscale-[0.5] transition-all hover:grayscale-0 hover:opacity-100' : ''}>
                      <VenueCard
                        venue={venue}
                        matchScore={venue.relevanceScore}
                        searchParams={searchParams.toString()}
                      />
                    </div>

                    {/* Match Reasons */}
                    {venue.matchReasons && venue.matchReasons.length > 0 && (
                      <div className="mt-2 p-3 bg-[#37474F]/30 rounded-lg border border-white/5">
                        <p className="text-xs text-gray-400 leading-relaxed">
                          {venue.matchReasons.join(' • ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#37474F]/30 border border-white/10 rounded-xl p-12 text-center mt-8">
                <p className="text-lg text-gray-300 font-medium">No venues found matching your criteria.</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your search or location.</p>
                <button
                  onClick={() => {
                    setQuery('');
                    router.replace('/search');
                    setHasSearched(false);
                  }}
                  className="mt-4 text-[#C6FF00] text-sm hover:underline uppercase tracking-wider font-bold"
                >
                  Clear & Restart
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#263238] text-white pt-14">
      <Suspense fallback={
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="animate-spin text-[#C6FF00]" size={32} />
        </div>
      }>
        <SearchContent />
      </Suspense>
    </div>
  );
}