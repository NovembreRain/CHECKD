// src/lib/availability.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * 1. BATCH CHECK (For Search Results)
 * Quick check: Is there ANY confirmed booking on this date?
 */
export async function checkBatchAvailability(
  venueIds: string[], 
  date: Date
): Promise<Record<string, boolean>> {
  if (venueIds.length === 0) return {};

  const dateStr = date.toISOString().split('T')[0];

  // Check Bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('venue_id')
    .in('venue_id', venueIds)
    .eq('booking_date', dateStr)
    .in('status', ['APPROVED', 'CONFIRMED']); 

  // Check Blocked Dates
  const { data: blocks } = await supabase
    .from('blocked_dates')
    .select('venue_id')
    .in('venue_id', venueIds)
    .lte('start_date', dateStr)
    .gte('end_date', dateStr);

  const availabilityMap: Record<string, boolean> = {};
  venueIds.forEach(id => availabilityMap[id] = true);

  bookings?.forEach((b: any) => availabilityMap[b.venue_id] = false);
  blocks?.forEach((b: any) => availabilityMap[b.venue_id] = false);

  return availabilityMap;
}

/**
 * 2. DETAILED CHECK (For Booking API)
 * Prevents double bookings by checking specific time overlaps.
 * THIS WAS MISSING IN YOUR SNIPPET
 */
export async function checkVenueAvailability(
  venueId: string,
  date: string,      // YYYY-MM-DD
  startTime: string, // HH:mm
  endTime: string    // HH:mm
): Promise<{ available: boolean; reason?: string }> {
  
  // A. Check Blocked Dates (Whole Day)
  const { data: blocks } = await supabase
    .from('blocked_dates')
    .select('id')
    .eq('venue_id', venueId)
    .lte('start_date', date)
    .gte('end_date', date);

  if (blocks && blocks.length > 0) {
    return { available: false, reason: 'Date is blocked by owner' };
  }

  // B. Check Existing Bookings (Time Overlap)
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('venue_id', venueId)
    .eq('booking_date', date) 
    .in('status', ['APPROVED', 'CONFIRMED', 'PENDING']) 
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (conflicts && conflicts.length > 0) {
    return { available: false, reason: 'Time slot overlaps with another booking' };
  }

  return { available: true };
}