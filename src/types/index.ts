// /src/types/index.ts or wherever your Venue type is defined
// Add this to your existing Venue type or create if it doesn't exist

export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  location: string;
  city: string;
  address?: string;
  price_per_hour: number;
  video_url?: string;
  venue_image_url?: string;
  photos?: string[];
  description?: string;
  short_description?: string;
  
  // Capacity
  comfortable_capacity?: number;
  standing_capacity?: number;
  
  // Personality dimensions
  space_industrialness?: number;
  space_minimalism?: number;
  space_naturalness?: number;
  space_formality?: number;
  space_vibrancy?: number;
  space_uniqueness?: number;
  space_accessibility?: number;
  
  // Semantic data
  event_compatibility?: Record<string, number>;
  atmosphere_profile?: any;
  use_case_tags?: {
    primary: string[];
    secondary?: string[];
    emerging?: string[];
    poorFit?: string[];
  };
  primary_event_type?: string;
  personality_profile?: string;
  is_niche_focused?: boolean;
  
  // Analysis
  analysis_json?: any;
  room_acoustics?: string;
  natural_light_potential?: number;
  
  // Compliance
  nfpa70_status?: string;
  nfpa101_status?: string;
  
  // Metrics
  user_score?: number;
  views_count?: number;
  bookings_count?: number;
  total_earnings?: number;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  semantic_data_updated_at?: string;
}

// Note: VenueMatch is now defined in semantic-search.ts
// If you have it elsewhere, make sure to add locationScore: number