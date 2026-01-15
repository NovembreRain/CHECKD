'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Zap, Star } from 'lucide-react';
import { Venue } from '@/types'; 

interface VenueCardProps {
  venue: Venue;
  matchScore?: number;
  searchParams?: string;
}

export function VenueCard({ venue, matchScore, searchParams }: VenueCardProps) {
  const hasImage = !!venue.venue_image_url;
  const tags = venue.use_case_tags?.primary?.slice(0, 3) || ['Venue'];

  // Link to /results/[id] to match the planner view
  const destination = searchParams 
    ? `/results/${venue.id}?from=/search?${searchParams}`
    : `/results/${venue.id}`;

  return (
    <Link href={destination} className="group block h-full">
      <div className="relative h-full bg-brand-surface rounded-2xl overflow-hidden border border-white/5 hover:border-brand-lime/50 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-lime/10 flex flex-col">
        
        {/* IMAGE AREA */}
        <div className="relative h-64 w-full overflow-hidden bg-brand-charcoal">
          {hasImage ? (
            <Image
              src={venue.venue_image_url!}
              alt={venue.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-brand-charcoal flex items-center justify-center">
              <span className="text-4xl font-bold text-white/20 select-none">
                {venue.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal via-transparent to-transparent opacity-80" />

          {matchScore && (
            <div className="absolute top-4 right-4 bg-brand-lime text-brand-charcoal px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
              <Zap size={12} fill="currentColor" />
              {Math.round(matchScore)}% MATCH
            </div>
          )}
        </div>

        {/* CONTENT AREA */}
        <div className="p-5 flex flex-col flex-grow relative">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-brand-white group-hover:text-brand-lime transition-colors line-clamp-1">
              {venue.name}
            </h3>
            {venue.user_score && (
               <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-yellow-400/10 px-1.5 py-0.5 rounded">
                 <Star size={10} fill="currentColor" />
                 {venue.user_score}
               </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-brand-text text-sm mb-4">
            <MapPin size={14} className="text-brand-lime" />
            <span className="line-clamp-1">{venue.location}, {venue.city}</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {tags.map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-brand-text font-medium">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex flex-col">
              <span className="text-[10px] text-brand-text uppercase tracking-widest">Rate</span>
              <span className="text-lg font-bold text-brand-white">
                ₹{venue.price_per_hour.toLocaleString()}<span className="text-sm font-normal text-brand-text">/hr</span>
              </span>
            </div>
            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-brand-lime group-hover:border-brand-lime group-hover:text-brand-charcoal transition-all">
              <span className="text-lg leading-none mb-1">→</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}