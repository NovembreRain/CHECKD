// /src/lib/fast-search.ts
// FAST & ROBUST SEARCH: Smart regex + existing semantic scoring

import { createClient } from '@supabase/supabase-js';
import { Venue } from '@/types';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Known cities from your dropdown
const KNOWN_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata',
    'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
    'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara', 'Ghaziabad',
    'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivli',
    'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar',
    'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Pondicherry', 'Puducherry', 'Auroville'
];

// Event type mappings
const EVENT_KEYWORDS: Record<string, string[]> = {
    yoga_meditation: ['yoga', 'meditation', 'mindfulness', 'wellness', 'zen'],
    dance_class: ['dance', 'dancing', 'choreography', 'zumba', 'ballet', 'salsa'],
    fitness_class: ['fitness', 'workout', 'gym', 'exercise', 'training', 'crossfit', 'pilates'],
    corporate_conference: ['conference', 'corporate', 'business', 'seminar', 'meeting', 'summit'],
    wedding: ['wedding', 'marriage', 'reception', 'ceremony'],
    private_party: ['party', 'celebration', 'birthday', 'anniversary'],
    photography_shoot: ['photography', 'photoshoot', 'photo shoot'],
    music_performance: ['music', 'concert', 'performance', 'band', 'live music'],
    podcast_recording: ['podcast', 'recording', 'audio'],
    training_workshop: ['training', 'workshop', 'tuition', 'coaching', 'class', 'course', 'seminar', 'lesson'],
    product_launch: ['launch', 'unveiling', 'showcase', 'expo'],
    arts_exhibition: ['art', 'gallery', 'exhibition']
};

export interface SearchIntent {
    city?: string;
    location?: string;
    guestCount?: number;
    eventTypes: string[];
    priceRange?: { min?: number; max?: number };
    date?: Date;
    rawQuery: string;
}

export interface VenueMatch extends Venue {
    relevanceScore: number;
    locationScore: number;
    capacityScore: number;
    eventScore: number;
    availabilityScore: number;
    matchReasons: string[];
    rating: 'A' | 'B' | 'C' | 'D' | 'E';
}

/**
 * FAST INTENT PARSER (< 10ms)
 */
function parseIntent(query: string): SearchIntent {
    const lower = query.toLowerCase();
    const intent: SearchIntent = {
        eventTypes: [],
        rawQuery: query
    };

    // 1. Extract City (case-insensitive matching)
    for (const city of KNOWN_CITIES) {
        const pattern = new RegExp(`\\b${city}\\b`, 'i');
        if (pattern.test(query)) {
            intent.city = city;
            break;
        }
    }

    // 2. Extract Location/Area (anything after "in" or before city)
    const locationPatterns = [
        /(?:in|at|near)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
        /([A-Za-z]+)\s*,\s*(?:Mumbai|Delhi|Bangalore|Hyderabad)/i
    ];

    for (const pattern of locationPatterns) {
        const match = query.match(pattern);
        if (match) {
            const extracted = match[1].trim();
            // Check if it's not a city itself
            const isCity = KNOWN_CITIES.some(c => c.toLowerCase() === extracted.toLowerCase());
            if (!isCity) {
                intent.location = extracted;

                // Infer city from common areas
                const lowerExtracted = extracted.toLowerCase();
                if (['borivali', 'bandra', 'andheri', 'malad', 'kandivali', 'goregaon', 'powai', 'juhu'].includes(lowerExtracted)) {
                    intent.city = intent.city || 'Mumbai';
                } else if (['koramangala', 'indiranagar', 'whitefield', 'hsr', 'jayanagar'].includes(lowerExtracted)) {
                    intent.city = intent.city || 'Bangalore';
                } else if (['connaught', 'karol', 'saket', 'hauz'].includes(lowerExtracted)) {
                    intent.city = intent.city || 'Delhi';
                }
            }
            break;
        }
    }

    // 3. Extract Capacity
    const capacityPatterns = [
        /for\s+(\d+)\s+(?:people|guests?|students?|participants?|attendees?|pax)/i,
        /(\d+)\s+(?:people|guests?|students?|participants?|attendees?|pax)/i,
        /(?:capacity|accommodate|hold|seat)\s+(?:of\s+)?(\d+)/i
    ];

    for (const pattern of capacityPatterns) {
        const match = query.match(pattern);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 1 && num <= 1000) {
                intent.guestCount = num;
                break;
            }
        }
    }

    // 4. Extract Event Types
    for (const [eventType, keywords] of Object.entries(EVENT_KEYWORDS)) {
        for (const keyword of keywords) {
            const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
            if (pattern.test(query)) {
                intent.eventTypes.push(eventType);
                break;
            }
        }
    }

    // 5. Extract Price Range
    const underMatch = lower.match(/(?:under|below|max|maximum)\s+(?:₹|rs\.?|inr)?\s*(\d+)/);
    if (underMatch) {
        intent.priceRange = { max: parseInt(underMatch[1]) };
    }

    const overMatch = lower.match(/(?:above|over|min|minimum)\s+(?:₹|rs\.?|inr)?\s*(\d+)/);
    if (overMatch) {
        intent.priceRange = { ...intent.priceRange, min: parseInt(overMatch[1]) };
    }

    return intent;
}

/**
 * LOCATION SCORING
 */
function scoreLocationMatch(
    requestedCity: string | undefined,
    requestedLocation: string | undefined,
    venueCity: string,
    venueLocation: string
): number {
    if (!requestedCity && !requestedLocation) return 50;

    let score = 0;

    // City match (critical)
    if (requestedCity) {
        if (venueCity.toLowerCase() === requestedCity.toLowerCase()) {
            score = 100;
        } else {
            return 0; // Wrong city = exclude
        }
    }

    // Location/area match (bonus)
    if (requestedLocation && score > 0) {
        const locLower = requestedLocation.toLowerCase();
        const venueLower = venueLocation.toLowerCase();

        if (venueLower.includes(locLower) || locLower.includes(venueLower)) {
            score = 100; // Perfect match
        } else {
            score = 70; // City match but different area
        }
    }

    return score;
}

/**
 * CAPACITY SCORING
 */
function scoreCapacityMatch(requestedGuests: number | undefined, venue: Venue): number {
    if (!requestedGuests) return 50;

    const comfortable = venue.comfortable_capacity || 0;
    const standing = venue.standing_capacity || 0;

    if (standing < requestedGuests) return 0; // Too small = exclude

    if (comfortable >= requestedGuests) {
        const util = requestedGuests / comfortable;
        if (util >= 0.6 && util <= 0.85) return 100;
        if (util >= 0.4 && util < 0.6) return 90;
        if (util > 0.85 && util <= 1.0) return 85;
        return 70;
    }

    if (standing >= requestedGuests) {
        return 75;
    }

    return 0;
}

/**
 * EVENT TYPE SCORING
 */
function scoreEventMatch(requestedEvents: string[], venueCompatibility: Record<string, number>): number {
    if (requestedEvents.length === 0) return 50;

    const scores = requestedEvents.map(evt => {
        const compatScore = venueCompatibility[evt] || 0;
        return Math.round(compatScore * 100);
    });

    if (scores.length === 1) return scores[0];

    const sortedScores = scores.sort((a, b) => b - a);
    return Math.round(sortedScores[0] * 0.6 + (sortedScores.slice(1).reduce((a, b) => a + b, 0) / (sortedScores.length - 1)) * 0.4);
}

/**
 * AVAILABILITY SCORING
 */
async function scoreAvailability(venueId: string, date?: Date): Promise<number> {
    if (!date) return 100;

    try {
        const dateStr = date.toISOString().split('T')[0];

        const { data: bookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('venue_id', venueId)
            .in('status', ['APPROVED', 'PENDING'])
            .lte('start_date', `${dateStr}T23:59:59Z`)
            .gte('end_date', `${dateStr}T00:00:00Z`);

        if (bookings && bookings.length > 0) return 0;

        const { data: blocked } = await supabase
            .from('blocked_dates')
            .select('id')
            .eq('venue_id', venueId)
            .lte('start_date', dateStr)
            .gte('end_date', dateStr);

        if (blocked && blocked.length > 0) return 0;

        return 100;
    } catch (error) {
        return 50;
    }
}

/**
 * OVERALL RATING
 */
function calculateOverallRating(scores: {
    location: number;
    capacity: number;
    event: number;
    availability: number;
}): number {
    if (scores.location === 0) return 0;
    if (scores.capacity === 0) return 0;
    if (scores.availability === 0) return scores.capacity * 0.3;

    const weights = { location: 0.30, capacity: 0.30, availability: 0.20, event: 0.20 };

    return Math.round(
        scores.location * weights.location +
        scores.capacity * weights.capacity +
        scores.availability * weights.availability +
        scores.event * weights.event
    );
}

function scoreToRating(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'E';
}

/**
 * MAIN SEARCH FUNCTION (< 500ms)
 */
export async function fastSearch(query: string): Promise<VenueMatch[]> {
    const startTime = Date.now();

    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 FAST SEARCH: "${query}"`);
        console.log(`${'='.repeat(60)}`);

        // Step 1: Parse intent (< 10ms)
        const intent = parseIntent(query);
        console.log('📊 Intent:', {
            city: intent.city,
            location: intent.location,
            guestCount: intent.guestCount,
            eventTypes: intent.eventTypes
        });

        // Step 2: Build database query with smart filters
        let dbQuery = supabase.from('venues').select('*');

        // City filter (strict)
        if (intent.city) {
            dbQuery = dbQuery.eq('city', intent.city);
            console.log(`   ✓ City filter: ${intent.city}`);
        }

        // Location filter (fuzzy)
        if (intent.location) {
            dbQuery = dbQuery.ilike('location', `%${intent.location}%`);
            console.log(`   ✓ Location filter: %${intent.location}%`);
        }

        // Capacity filter (hard requirement)
        if (intent.guestCount) {
            dbQuery = dbQuery.gte('standing_capacity', intent.guestCount);
            console.log(`   ✓ Capacity filter: >= ${intent.guestCount}`);
        }

        // Price filter
        if (intent.priceRange?.max) {
            dbQuery = dbQuery.lte('price_per_hour', intent.priceRange.max);
            console.log(`   ✓ Price filter: <= ₹${intent.priceRange.max}`);
        }
        if (intent.priceRange?.min) {
            dbQuery = dbQuery.gte('price_per_hour', intent.priceRange.min);
            console.log(`   ✓ Price filter: >= ₹${intent.priceRange.min}`);
        }

        const { data: venues, error } = await dbQuery.limit(100);

        if (error) {
            console.error('❌ Database error:', error);
            return [];
        }

        if (!venues || venues.length === 0) {
            console.log('⚠️  No venues found');
            return [];
        }

        console.log(`✅ Found ${venues.length} candidates (${Date.now() - startTime}ms)`);

        // Step 3: Score venues in parallel
        const scoredVenues = await Promise.all(
            venues.map(async (venue: any) => {
                const locationScore = scoreLocationMatch(intent.city, intent.location, venue.city, venue.location);
                const capacityScore = scoreCapacityMatch(intent.guestCount, venue);
                const eventScore = scoreEventMatch(intent.eventTypes, venue.event_compatibility || {});
                const availabilityScore = await scoreAvailability(venue.id, intent.date);

                const relevanceScore = calculateOverallRating({
                    location: locationScore,
                    capacity: capacityScore,
                    event: eventScore,
                    availability: availabilityScore
                });

                const matchReasons: string[] = [];
                if (locationScore === 100) matchReasons.push(`Perfect location: ${venue.location}, ${venue.city}`);
                if (capacityScore >= 85) matchReasons.push(`Ideal for ${intent.guestCount || 'your'} guests`);
                if (availabilityScore === 100) matchReasons.push('Available');
                if (eventScore >= 70) matchReasons.push(`Great for ${intent.eventTypes[0]?.replace('_', ' ')}`);

                return {
                    ...venue,
                    relevanceScore,
                    locationScore,
                    capacityScore,
                    eventScore,
                    availabilityScore,
                    rating: scoreToRating(relevanceScore),
                    matchReasons
                } as VenueMatch;
            })
        );

        // Step 4: Filter and sort
        const results = scoredVenues
            .filter(v => v.relevanceScore >= 30)
            .sort((a, b) => {
                if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
                if (b.availabilityScore !== a.availabilityScore) return b.availabilityScore - a.availabilityScore;
                return b.capacityScore - a.capacityScore;
            });

        const totalTime = Date.now() - startTime;
        console.log(`\n✅ RESULTS: ${results.length} matches in ${totalTime}ms`);

        results.slice(0, 3).forEach((r, i) => {
            console.log(`${i + 1}. ${r.name} (${r.location}, ${r.city}) - Score: ${r.relevanceScore}`);
        });

        console.log(`${'='.repeat(60)}\n`);

        return results;

    } catch (error) {
        console.error('❌ Search failed:', error);
        return [];
    }
}