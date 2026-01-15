// /src/lib/semantic-extractor.ts

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY!
);

// Define the shape of our Semantic Data
export interface SemanticData {
  spacePersonality: {
    industrialness: number;
    minimalism: number;
    naturalness: number;
    formality: number;
    vibrancy: number;
    uniqueness: number;
    accessibility: number;
  };
  eventCompatibility: {
    [key: string]: number;
  };
  atmosphereProfile: {
    soundscape: {
      baselineNoiseLevel: string;
      acousticDamping: string;
      echoCharacteristic: string;
      externalNoiseIntrusion: string;
    };
    lighting: {
      naturalLightPotential: number;
      dimmability: boolean;
      colorTemperatureRange: string;
    };
    climate: {
      thermalControl: string;
      ventilationFreshness: number;
      seasonSuitability: string[];
    };
    ambient: {
      smell: string;
      energy: string;
    };
  };
  useCaseTags: {
    primary: string[];
    secondary: string[];
    emerging: string[];
    poorFit: string[];
  };
}

/**
 * Extract primary event type from compatibility scores (highest score wins)
 */
export function getPrimaryEventType(eventCompatibility: Record<string, number>): string {
  const scores = eventCompatibility || {};
  return Object.keys(scores).length > 0
    ? Object.keys(scores).reduce((a, b) => (scores[a] > scores[b] ? a : b), 'general')
    : 'general';
}

/**
 * Determine if venue is niche-focused (1-2 high-scoring event types)
 */
export function isNicheFocused(eventCompatibility: Record<string, number>): boolean {
  const highScores = Object.values(eventCompatibility || {}).filter((s) => s > 0.8).length;
  return highScores > 0 && highScores <= 2;
}

/**
 * Convert personality scores to readable text profile
 */
export function getVenuePersonalityProfile(personality: any): string {
  const traits: string[] = [];

  if (personality.industrialness > 7) traits.push('industrial');
  else if (personality.industrialness < 3) traits.push('polished');

  if (personality.minimalism > 7) traits.push('minimal');
  else if (personality.minimalism < 3) traits.push('decorated');

  if (personality.naturalness > 7) traits.push('natural');
  else if (personality.naturalness < 3) traits.push('artificial');

  if (personality.formality > 7) traits.push('formal');
  else if (personality.formality < 3) traits.push('casual');

  if (personality.vibrancy > 7) traits.push('vibrant');
  else if (personality.vibrancy < 3) traits.push('calm');

  if (personality.uniqueness > 7) traits.push('unique');
  if (personality.accessibility > 7) traits.push('accessible');

  return traits.length > 0 ? traits.join(', ') : 'neutral';
}

/**
 * Main: Extract semantic data from Gemini response and save to database
 * Non-fatal: If this fails, venue still saves (semantic data is bonus layer)
 */
export async function extractAndSaveSemanticData(
  venueId: string,
  analysisJson: any
): Promise<void> {
  try {
    const semanticData: SemanticData = analysisJson.semanticDimensions;

    if (!semanticData) {
      console.warn('⚠️  No semantic dimensions found in AI response');
      return;
    }

    // 1. Extract space personality scores
    const spacePersonality = semanticData.spacePersonality;
    const eventCompatibility = semanticData.eventCompatibility;

    // 2. Determine primary event type (highest compatibility score)
    const primaryEventType = getPrimaryEventType(eventCompatibility);

    // 3. Determine niche focus (1-2 high-scoring event types)
    const nicheFocused = isNicheFocused(eventCompatibility);

    // 4. Get personality profile text
    const personalityProfile = getVenuePersonalityProfile(spacePersonality);

    // 5. Save to Supabase
    const { error } = await supabase
      .from('venues')
      .update({
        // Flattened personality scores
        space_industrialness: spacePersonality?.industrialness || 0,
        space_minimalism: spacePersonality?.minimalism || 0,
        space_naturalness: spacePersonality?.naturalness || 0,
        space_formality: spacePersonality?.formality || 0,
        space_vibrancy: spacePersonality?.vibrancy || 0,
        space_uniqueness: spacePersonality?.uniqueness || 0,
        space_accessibility: spacePersonality?.accessibility || 0,

        // JSON blobs for complex data
        event_compatibility: eventCompatibility,
        atmosphere_profile: semanticData.atmosphereProfile,
        use_case_tags: semanticData.useCaseTags,

        // Metadata for search/filtering
        primary_event_type: primaryEventType,
        personality_profile: personalityProfile,
        is_niche_focused: nicheFocused,
        semantic_data_updated_at: new Date().toISOString(),
      })
      .eq('id', venueId);

    if (error) {
      console.error('❌ Failed to save semantic data:', error.message);
      return;
    }

    console.log(`🧠 Semantic Extraction: Venue is primarily for ${primaryEventType}`);
    console.log(`📊 Personality: ${personalityProfile}`);
    console.log(`🎯 Niche Focused: ${nicheFocused ? 'Yes' : 'No'}`);
    console.log('✅ Semantic data saved successfully');

  } catch (error: any) {
    console.error('⚠️  Semantic extraction warning:', error.message);
    // Non-fatal: Don't crash upload
  }
}
