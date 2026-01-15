// /src/lib/semantic-search.ts
// PRODUCTION-GRADE SEMANTIC SEARCH: Multi-factor scoring with strict filtering

import { createClient } from '@supabase/supabase-js';
import { SearchIntent, intentToQueryFilters, PersonalityFilter } from './intent-parser';
import { Venue } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface VenueMatch extends Venue {
  relevanceScore: number;
  personalityScore: number;
  eventScore: number;
  capacityScore: number;
  availabilityScore: number;
  locationScore: number;
  matchReasons: string[];
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
  confidenceLevel: 'high' | 'medium' | 'low';
}

// --- LOCATION SCORING: Critical for local search ---
function scoreLocationMatch(
  requestedCity: string | undefined,
  requestedLocation: string | undefined,
  venueCity: string,
  venueLocation: string
): number {
  if (!requestedCity && !requestedLocation) return 50; // Neutral if no location specified

  let score = 0;
  
  // CRITICAL: City match is mandatory for high scores
  if (requestedCity) {
    const cityMatch = venueCity.toLowerCase() === requestedCity.toLowerCase();
    if (cityMatch) {
      score = 100; // Perfect city match
    } else {
      // Check if city is mentioned in location (e.g., "Mumbai" in "South Mumbai")
      const cityInLocation = venueCity.toLowerCase().includes(requestedCity.toLowerCase()) ||
                            requestedCity.toLowerCase().includes(venueCity.toLowerCase());
      if (cityInLocation) {
        score = 70; // Partial city match
      } else {
        return 0; // Wrong city = exclude
      }
    }
  }

  // Bonus points for location/area match
  if (requestedLocation && score > 0) {
    const locMatch = venueLocation.toLowerCase().includes(requestedLocation.toLowerCase()) ||
                     requestedLocation.toLowerCase().includes(venueLocation.toLowerCase());
    if (locMatch) {
      score = 100; // Perfect location + city match
    }
  }

  return score;
}

// --- CAPACITY SCORING: Strict requirements ---
function scoreCapacityMatch(requestedGuests: number | undefined, venue: Venue): number {
  if (!requestedGuests) return 50; // Neutral if no capacity specified

  const comfortable = venue.comfortable_capacity || 0;
  const standing = venue.standing_capacity || 0;
  const maxCapacity = Math.max(comfortable, standing);

  // HARD RULE: Venue must fit the requested guests
  if (maxCapacity < requestedGuests) {
    return 0; // Cannot accommodate = exclude entirely
  }

  // Use comfortable capacity as primary metric
  if (comfortable >= requestedGuests) {
    const utilizationRate = requestedGuests / comfortable;
    
    // Optimal utilization is 60-85% of capacity
    if (utilizationRate >= 0.6 && utilizationRate <= 0.85) {
      return 100; // Perfect size
    } else if (utilizationRate >= 0.4 && utilizationRate < 0.6) {
      return 90; // Slightly underutilized but good
    } else if (utilizationRate >= 0.85 && utilizationRate <= 1.0) {
      return 85; // At capacity limit
    } else if (utilizationRate < 0.4) {
      return 70; // Too large, might feel empty
    }
  }

  // Fallback to standing capacity
  if (standing >= requestedGuests) {
    const standingUtil = requestedGuests / standing;
    if (standingUtil >= 0.5 && standingUtil <= 0.85) {
      return 75; // Can accommodate standing
    }
    return 60; // Marginal fit
  }

  return 0; // Should never reach here due to hard rule above
}

// --- AVAILABILITY SCORING: Real booking conflict detection ---
async function scoreAvailability(
  venue: Venue,
  requestedDate?: Date,
  requestedStartTime?: string,
  requestedEndTime?: string
): Promise<number> {
  if (!requestedDate) return 100; // No date specified = assume available

  try {
    // Convert requested date to ISO date string (YYYY-MM-DD)
    const dateStr = requestedDate.toISOString().split('T')[0];

    // 1. Check blocked_dates table
    const { data: blockedDates, error: blockError } = await supabase
      .from('blocked_dates')
      .select('start_date, end_date')
      .eq('venue_id', venue.id)
      .lte('start_date', dateStr)
      .gte('end_date', dateStr);

    if (blockError) {
      console.error('Error checking blocked dates:', blockError);
      return 50; // Unknown availability
    }

    if (blockedDates && blockedDates.length > 0) {
      return 0; // Date is blocked
    }

    // 2. Check bookings table for approved/pending bookings
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('start_date, end_date, start_time, end_time, status')
      .eq('venue_id', venue.id)
      .in('status', ['APPROVED', 'PENDING'])
      .lte('start_date', new Date(dateStr + 'T23:59:59Z').toISOString())
      .gte('end_date', new Date(dateStr + 'T00:00:00Z').toISOString());

    if (bookingError) {
      console.error('Error checking bookings:', bookingError);
      return 50; // Unknown availability
    }

    if (!bookings || bookings.length === 0) {
      return 100; // No conflicts, fully available
    }

    // 3. If time is specified, check for time conflicts
    if (requestedStartTime && requestedEndTime) {
      for (const booking of bookings) {
        const bookingStartTime = booking.start_time;
        const bookingEndTime = booking.end_time;

        if (bookingStartTime && bookingEndTime) {
          // Check if times overlap
          const isOverlapping = !(
            requestedEndTime <= bookingStartTime ||
            requestedStartTime >= bookingEndTime
          );

          if (isOverlapping) {
            return 0; // Time conflict exists
          }
        } else {
          // Booking exists but no time specified = assume full day booking
          return 0;
        }
      }
      return 100; // No time conflicts
    }

    // Date has bookings but no specific time requested = mark as unavailable
    return 0;

  } catch (error) {
    console.error('Availability check failed:', error);
    return 50; // Unknown availability on error
  }
}

// --- PERSONALITY SCORING: Dimensional matching ---
function scorePersonalityMatch(userPersonality: PersonalityFilter, venue: Venue): number {
  const dimensionWeights = {
    vibrancy: 1.2,
    formality: 1.2,
    accessibility: 1.3,
    uniqueness: 1.0,
    naturalness: 0.9,
    minimalism: 0.8,
    industrialness: 0.8
  };

  let totalScore = 0;
  let totalWeight = 0;
  let matchedDimensions = 0;

  for (const [dim, weight] of Object.entries(dimensionWeights)) {
    const venueValue = venue[`space_${dim}` as keyof Venue] as number;
    const userFilter = userPersonality[dim as keyof PersonalityFilter];

    if (!userFilter || venueValue === undefined) continue;

    let dimScore = 0;

    if (userFilter.min !== undefined) {
      if (venueValue >= userFilter.min) {
        const excess = Math.min((venueValue - userFilter.min) / (10 - userFilter.min), 1);
        dimScore = 85 + (excess * 15);
      } else {
        const deficit = (userFilter.min - venueValue) / userFilter.min;
        dimScore = Math.max(0, 85 * (1 - deficit * 2));
      }
    } else if (userFilter.max !== undefined) {
      if (venueValue <= userFilter.max) {
        const position = venueValue / userFilter.max;
        dimScore = 85 + ((1 - position) * 15);
      } else {
        const excess = (venueValue - userFilter.max) / (10 - userFilter.max);
        dimScore = Math.max(0, 85 * (1 - excess * 2));
      }
    }

    totalScore += dimScore * weight;
    totalWeight += weight;
    matchedDimensions++;
  }

  return matchedDimensions > 0 ? Math.round(totalScore / totalWeight) : 50;
}

// --- EVENT COMPATIBILITY SCORING ---
function scoreEventMatch(requestedEvents: string[], venueCompatibility: Record<string, number>): number {
  if (requestedEvents.length === 0) return 50;

  const scores = requestedEvents.map(evt => {
    const compatScore = venueCompatibility[evt] || 0;
    return Math.round(compatScore * 100);
  });

  if (scores.length === 1) {
    return scores[0];
  }

  const sortedScores = scores.sort((a, b) => b - a);
  const primaryScore = sortedScores[0] * 0.6;
  const secondaryScore = (sortedScores.slice(1).reduce((a, b) => a + b, 0) / (sortedScores.length - 1)) * 0.4;
  
  return Math.round(primaryScore + secondaryScore);
}

// --- RATING CALCULATION: Multi-factor weighted score ---
function calculateOverallRating(scores: {
  location: number;
  capacity: number;
  event: number;
  personality: number;
  availability: number;
}): number {
  // CRITICAL: Location and Capacity are hard requirements
  if (scores.location === 0) return 0; // Wrong location = exclude
  if (scores.capacity === 0) return 0; // Too small = exclude
  if (scores.availability === 0) return scores.capacity * 0.3; // Unavailable = low score

  // Weighted combination when critical factors pass
  const weights = {
    location: 0.25,      // 25% - Location match is critical
    capacity: 0.25,      // 25% - Must fit guests
    availability: 0.20,  // 20% - Must be available
    event: 0.20,         // 20% - Event type alignment
    personality: 0.10    // 10% - Nice-to-have
  };

  return Math.round(
    scores.location * weights.location +
    scores.capacity * weights.capacity +
    scores.availability * weights.availability +
    scores.event * weights.event +
    scores.personality * weights.personality
  );
}

function scoreToRating(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'E';
}

// --- CONFIDENCE LEVEL ---
function calculateConfidence(intent: SearchIntent, venue: Venue): 'high' | 'medium' | 'low' {
  let factors = 0;
  let matched = 0;

  if (intent.guestCount) {
    factors++;
    const capScore = scoreCapacityMatch(intent.guestCount, venue);
    if (capScore >= 70) matched++;
  }

  if (intent.city) {
    factors++;
    const locScore = scoreLocationMatch(intent.city, intent.location, venue.city, venue.location);
    if (locScore >= 70) matched++;
  }

  if (intent.eventTypes.length > 0) {
    factors++;
    const evtScore = scoreEventMatch(intent.eventTypes, venue.event_compatibility || {});
    if (evtScore >= 70) matched++;
  }

  if (factors === 0) return 'low';
  
  const matchRate = matched / factors;
  if (matchRate >= 0.8) return 'high';
  if (matchRate >= 0.5) return 'medium';
  return 'low';
}

// --- MATCH REASONS ---
function generateMatchReasons(intent: SearchIntent, venue: VenueMatch): string[] {
  const reasons: string[] = [];
  
  // Location reasoning
  if (intent.city && venue.locationScore >= 85) {
    if (intent.location && venue.location.toLowerCase().includes(intent.location.toLowerCase())) {
      reasons.push(`Perfect location: ${venue.location}, ${venue.city}`);
    } else {
      reasons.push(`Located in ${venue.city}`);
    }
  }

  // Capacity reasoning
  if (intent.guestCount) {
    const comfortable = venue.comfortable_capacity || 0;
    if (venue.capacityScore >= 85) {
      reasons.push(`Ideal for ${intent.guestCount} guests (${comfortable} capacity)`);
    } else if (venue.capacityScore >= 60) {
      reasons.push(`Fits ${intent.guestCount} guests`);
    }
  }

  // Availability reasoning
  if (intent.preferredDate && venue.availabilityScore === 100) {
    reasons.push(`Available on ${intent.preferredDate.toLocaleDateString()}`);
  }

  // Event type reasoning
  const eventScores = Object.entries(venue.event_compatibility || {})
    .filter(([evt]) => intent.eventTypes.includes(evt))
    .sort(([, a], [, b]) => b - a);
    
  if (eventScores.length > 0 && eventScores[0][1] >= 0.7) {
    const eventName = eventScores[0][0].replace(/_/g, ' ');
    const percentage = Math.round(eventScores[0][1] * 100);
    reasons.push(`${percentage}% match for ${eventName}`);
  }

  return reasons.slice(0, 3);
}

// --- QUERY BUILDER: Strict filtering ---
function buildQuery(intent: SearchIntent) {
  let query = supabase.from('venues').select('*');

  // CRITICAL: Hard city filter - exact match required
  if (intent.city) {
    query = query.eq('city', intent.city);
  }

  // CRITICAL: Hard capacity filter - must accommodate guests
  if (intent.guestCount) {
    // Venue must have capacity >= requested guests (no margin)
    query = query.gte('standing_capacity', intent.guestCount);
  }

  // Price filters
  if (intent.priceRange?.min) query = query.gte('price_per_hour', intent.priceRange.min);
  if (intent.priceRange?.max) query = query.lte('price_per_hour', intent.priceRange.max);

  return query;
}

// --- MAIN SEARCH FUNCTION ---
export async function searchVenuesSmart(intent: SearchIntent): Promise<VenueMatch[]> {
  try {
    console.log('🔍 Search Intent:', {
      guestCount: intent.guestCount,
      eventTypes: intent.eventTypes,
      city: intent.city,
      location: intent.location,
      preferredDate: intent.preferredDate?.toISOString(),
      personalityDimensions: Object.keys(intent.personality).length
    });

    const query = buildQuery(intent);
    const { data, error } = await query.limit(100);

    if (error) {
      console.error('❌ Supabase search error:', error);
      return [];
    }
    if (!data || data.length === 0) {
      console.log('⚠️ No venues found matching filters');
      return [];
    }

    console.log(`📊 Found ${data.length} candidate venues, scoring...`);

    // Score all venues in parallel with availability checks
    const scoredVenues = await Promise.all(
      data.map(async (venue: any) => {
        const locationScore = scoreLocationMatch(
          intent.city,
          intent.location,
          venue.city,
          venue.location
        );
        const capacityScore = scoreCapacityMatch(intent.guestCount, venue);
        const personalityScore = scorePersonalityMatch(intent.personality, venue);
        const eventScore = scoreEventMatch(intent.eventTypes, venue.event_compatibility || {});
        const availabilityScore = await scoreAvailability(
          venue,
          intent.preferredDate,
          intent.preferredTime
        );

        const relevanceScore = calculateOverallRating({
          location: locationScore,
          capacity: capacityScore,
          event: eventScore,
          personality: personalityScore,
          availability: availabilityScore
        });

        const match: VenueMatch = {
          ...venue,
          relevanceScore,
          locationScore,
          capacityScore,
          personalityScore,
          eventScore,
          availabilityScore,
          rating: scoreToRating(relevanceScore),
          confidenceLevel: calculateConfidence(intent, venue),
          matchReasons: []
        };
        
        match.matchReasons = generateMatchReasons(intent, match);
        return match;
      })
    );

    // Filter and sort results
    const qualityResults = scoredVenues
      .filter(v => v.relevanceScore >= 30) // Minimum quality threshold
      .sort((a, b) => {
        // Primary sort: relevance score
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        // Tie-breaker: availability (prefer available venues)
        if (b.availabilityScore !== a.availabilityScore) {
          return b.availabilityScore - a.availabilityScore;
        }
        // Final tie-breaker: capacity score
        return b.capacityScore - a.capacityScore;
      });

    console.log(`✅ Returning ${qualityResults.length} quality matches`);
    console.log('Top 3 scores:', qualityResults.slice(0, 3).map(v => ({
      name: v.name,
      city: v.city,
      location: v.location,
      relevance: v.relevanceScore,
      locationScore: v.locationScore,
      capacity: v.capacityScore,
      availability: v.availabilityScore
    })));

    return qualityResults;
  } catch (err) {
    console.error('❌ Search Logic Error:', err);
    return [];
  }
}

// --- GET VENUE BY ID ---
export async function getVenueById(venueId: string): Promise<VenueMatch | null> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (error || !data) {
      console.error('❌ Failed to fetch venue:', error);
      return null;
    }

    const venue = data as any;
    const neutralIntent: SearchIntent = {
      eventTypes: [],
      personality: {},
      guestCount: undefined,
      city: undefined,
      location: undefined,
      priceRange: undefined,
      confidence: 0.5,
      rawQuery: ''
    };

    const capacityScore = 50;
    const personalityScore = scorePersonalityMatch({}, venue);
    const eventScore = 50;
    const availabilityScore = 100;
    const locationScore = 50;

    const relevanceScore = calculateOverallRating({
      location: locationScore,
      capacity: capacityScore,
      event: eventScore,
      personality: personalityScore,
      availability: availabilityScore
    });

    return {
      ...venue,
      relevanceScore,
      locationScore,
      capacityScore,
      personalityScore,
      eventScore,
      availabilityScore,
      rating: scoreToRating(relevanceScore),
      confidenceLevel: 'medium',
      matchReasons: []
    } as VenueMatch;
  } catch (error) {
    console.error('❌ Venue fetch failed:', error);
    return null;
  }
}