import { createClient } from '@supabase/supabase-js';
import { SearchIntent } from '@/lib/intent-parser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection function
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count');
    if (error) {
      console.error('Database connection error:', error);
      return false;
    }
    console.log('✓ Database connected successfully');
    return true;
  } catch (err) {
    console.error('Connection test failed:', err);
    return false;
  }
}

export async function searchVenuesSmart(intent: SearchIntent) {
  let query = supabase.from('venues').select('*');

  // 1. Filter by City
  if (intent.city) {
    query = query.ilike('city', `%${intent.city}%`);
  }

  // 3. Filter by Personality (The Semantic Logic)
  // E.g. If user said "Industrial", filtering space_industrialness > 7
  Object.entries(intent.personality).forEach(([column, range]) => {
    // @ts-ignore - Dynamic key access
    const min = range?.min;
    // @ts-ignore
    const max = range?.max;

    if (min !== undefined) query = query.gte(column, min);
    if (max !== undefined) query = query.lte(column, max);
  });

  const { data, error } = await query;
  if (error) throw error;

  // 4. Client-Side Sorting by Event Fit
  // (SQL sorting for JSON keys is hard, simpler to do in JS for MVP)
  if (!data) return [];

  return data.map((venue: any) => {
    let score = 0;
    
    // Boost score if the venue is compatible with the searched event
    intent.eventTypes.forEach(type => {
      const compatibility = venue.event_compatibility?.[type] || 0;
      score += (compatibility * 100); // 0 to 100 points
    });

    // Boost score for personality matches
    Object.entries(intent.personality).forEach(([col, range]) => {
      const val = venue[col] || 0;
      // @ts-ignore
      if (range?.min && val >= range.min) score += 20;
    });

    return { ...venue, relevanceScore: score };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}