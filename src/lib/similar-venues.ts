import { Venue } from '@/types';

/**
 * FIND SIMILAR VENUES
 * Returns top 3 venues in the same city with similar event suitability.
 */
export function getSimilarVenues(
  currentVenue: Venue, 
  searchEventType: string, 
  allVenues: Venue[]
): Venue[] {
  // 1. Safety Check
  if (!currentVenue || !searchEventType || !allVenues.length) {
    return [];
  }

  // Use nullish coalescing to ensure targetScore is never undefined
  const targetScore = currentVenue.event_compatibility?.[searchEventType] ?? 0;

  // 2. Filter Candidates
  const candidates = allVenues.filter((venue) => {
    // Must be different ID
    if (venue.id === currentVenue.id) return false;

    // Must be same City (Case-insensitive)
    if (venue.city?.toLowerCase() !== currentVenue.city?.toLowerCase()) return false;

    // Must have the event compatibility data
    const score = venue.event_compatibility?.[searchEventType];
    if (score === undefined || score === null) return false;

    // Score Proximity Logic (±0.15)
    const diff = Math.abs(score - targetScore);
    return diff <= 0.15;
  });

  // 3. Sort by "Semantic Distance"
  candidates.sort((a, b) => {
    // Use optional chaining (?.) and fallback (?? 0) to prevent 'possibly undefined' error
    const scoreA = a.event_compatibility?.[searchEventType] ?? 0;
    const scoreB = b.event_compatibility?.[searchEventType] ?? 0;
    
    const distA = Math.abs(scoreA - targetScore);
    const distB = Math.abs(scoreB - targetScore);

    return distA - distB;
  });

  // 4. Return Top 3
  return candidates.slice(0, 3);
}