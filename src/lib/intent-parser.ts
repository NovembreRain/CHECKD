// /src/lib/intent-parser.ts
// ENHANCED INTENT PARSER: Better understanding of natural language queries

import { addDays, nextDay, parse, isValid, startOfDay } from 'date-fns';

export interface PersonalityFilter {
  industrialness?: { min?: number; max?: number };
  minimalism?: { min?: number; max?: number };
  naturalness?: { min?: number; max?: number };
  formality?: { min?: number; max?: number };
  vibrancy?: { min?: number; max?: number };
  uniqueness?: { min?: number; max?: number };
  accessibility?: { min?: number; max?: number };
}

export interface SearchIntent {
  eventTypes: string[];
  personality: PersonalityFilter;
  guestCount?: number;
  city?: string;
  location?: string; // Area within city (e.g., "Bandra")
  priceRange?: { min?: number; max?: number };
  confidence: number;
  rawQuery: string;
  specialRequirements?: string[];
  preferredDate?: Date;
  preferredTime?: string;
}

const EVENT_MAPPINGS: Record<string, { keywords: string[]; personality: Partial<PersonalityFilter> }> = {
  yoga_meditation: {
    keywords: ['yoga', 'meditation', 'mindfulness', 'wellness', 'zen', 'spiritual'],
    personality: {
      naturalness: { min: 6 },
      formality: { max: 5 },
      vibrancy: { max: 4 }
    }
  },
  dance_class: {
    keywords: ['dance', 'dancing', 'choreography', 'zumba', 'ballet', 'salsa', 'hip hop'],
    personality: {
      vibrancy: { min: 6 },
      formality: { max: 5 }
    }
  },
  fitness_class: {
    keywords: ['fitness', 'workout', 'gym', 'exercise', 'training', 'bootcamp', 'crossfit', 'pilates'],
    personality: {
      vibrancy: { min: 5 },
      formality: { max: 6 }
    }
  },
  corporate_conference: {
    keywords: ['conference', 'corporate', 'business', 'seminar', 'presentation', 'meeting', 'summit'],
    personality: {
      formality: { min: 7 },
      minimalism: { min: 5 },
      accessibility: { min: 7 }
    }
  },
  wedding: {
    keywords: ['wedding', 'marriage', 'reception', 'ceremony', 'bride', 'groom'],
    personality: {
      formality: { min: 7 },
      uniqueness: { min: 6 }
    }
  },
  private_party: {
    keywords: ['party', 'celebration', 'birthday', 'anniversary', 'gathering', 'social'],
    personality: {
      vibrancy: { min: 6 },
      formality: { max: 6 }
    }
  },
  photography_shoot: {
    keywords: ['photography', 'photoshoot', 'photo', 'shoot', 'instagram', 'content creation'],
    personality: {
      naturalness: { min: 5 },
      uniqueness: { min: 6 }
    }
  },
  music_performance: {
    keywords: ['music', 'concert', 'performance', 'band', 'acoustic', 'live music', 'gig'],
    personality: {
      vibrancy: { min: 6 }
    }
  },
  podcast_recording: {
    keywords: ['podcast', 'recording', 'audio', 'interview', 'broadcast'],
    personality: {
      vibrancy: { max: 3 },
      minimalism: { min: 6 }
    }
  },
  training_workshop: {
    keywords: ['training', 'workshop', 'class', 'course', 'bootcamp', 'seminar', 'tuition', 'tutorial', 'lesson'],
    personality: {
      formality: { min: 5 },
      accessibility: { min: 6 }
    }
  },
  product_launch: {
    keywords: ['launch', 'unveiling', 'reveal', 'showcase', 'expo', 'exhibition'],
    personality: {
      formality: { min: 6 },
      uniqueness: { min: 7 },
      vibrancy: { min: 6 }
    }
  },
  arts_exhibition: {
    keywords: ['art', 'gallery', 'exhibition', 'showcase', 'display', 'installation'],
    personality: {
      naturalness: { min: 5 },
      uniqueness: { min: 7 }
    }
  },
  hackathon: {
    keywords: ['hackathon', 'hack', 'coding', 'programming', 'developer', 'tech event'],
    personality: {
      formality: { max: 5 },
      vibrancy: { min: 5 },
      accessibility: { min: 6 }
    }
  }
};

// Known Indian cities from your dropdown
const KNOWN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata',
  'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
  'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara', 'Ghaziabad',
  'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivli',
  'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar',
  'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior'
];

// Common location/area keywords
const LOCATION_KEYWORDS = [
  'in', 'at', 'near', 'around', 'from', 'area', 'locality', 'region'
];

/**
 * CAPACITY EXTRACTION
 */
function extractCapacity(query: string): number | undefined {
  const forPattern = /for\s+(\d+)(?:\s+(?:people|guests?|attendees?|persons?|participants?))?/i;
  const forMatch = query.match(forPattern);
  if (forMatch) return parseInt(forMatch[1]);

  const personPattern = /(\d+)(?:\s+|-)?(?:person|people|guest|attendee|pax)/i;
  const personMatch = query.match(personPattern);
  if (personMatch) return parseInt(personMatch[1]);

  const capacityPattern = /(?:capacity|holds?|seats?|accommodates?)\s+(?:of\s+)?(\d+)/i;
  const capacityMatch = query.match(capacityPattern);
  if (capacityMatch) return parseInt(capacityMatch[1]);

  const standalonePattern = /\b([5-9]|\d{2,3}|1000)\b/;
  const standaloneMatch = query.match(standalonePattern);
  if (standaloneMatch) {
    const num = parseInt(standaloneMatch[1]);
    if (num >= 5 && num <= 1000) return num;
  }

  return undefined;
}

/**
 * ENHANCED LOCATION EXTRACTION
 * Extracts both city and specific location/area
 */
function extractLocation(query: string): { city?: string; location?: string } {
  const result: { city?: string; location?: string } = {};

  // Normalize query for matching
  const normalizedQuery = query.trim();

  // Pattern 1: "in [City]" - exact city match
  for (const city of KNOWN_CITIES) {
    const cityPattern = new RegExp(`\\b(?:in|at|near)\\s+${city}\\b`, 'i');
    if (cityPattern.test(normalizedQuery)) {
      result.city = city;
      break;
    }
  }

  // Pattern 2: Just city name mentioned anywhere
  if (!result.city) {
    for (const city of KNOWN_CITIES) {
      const cityPattern = new RegExp(`\\b${city}\\b`, 'i');
      if (cityPattern.test(normalizedQuery)) {
        result.city = city;
        break;
      }
    }
  }

  // Pattern 3: Extract specific area/locality
  // Look for patterns like "in [Area], [City]" or "in [Area]"
  const locationPatterns = [
    /(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*?)(?:,|\s+(?:in|at|near|for|with))/i,
    /(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)/i
  ];

  for (const pattern of locationPatterns) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      const extractedLocation = match[1].trim();
      
      // Check if this is a known city - if not, it's a location/area
      const isKnownCity = KNOWN_CITIES.some(
        city => city.toLowerCase() === extractedLocation.toLowerCase()
      );
      
      if (!isKnownCity) {
        result.location = extractedLocation;
        break;
      }
    }
  }

  // Pattern 4: Handle format like "Bandra, Mumbai" or "Borivali Mumbai"
  const commaPattern = /([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*?)\s*,\s*([A-Z][a-z]+)/;
  const commaMatch = normalizedQuery.match(commaPattern);
  if (commaMatch) {
    const part1 = commaMatch[1].trim();
    const part2 = commaMatch[2].trim();
    
    // Check which one is the city
    const isCityFirst = KNOWN_CITIES.some(c => c.toLowerCase() === part1.toLowerCase());
    const isCitySecond = KNOWN_CITIES.some(c => c.toLowerCase() === part2.toLowerCase());
    
    if (isCitySecond && !isCityFirst) {
      result.city = part2;
      result.location = part1;
    } else if (isCityFirst && !isCitySecond) {
      result.city = part1;
      result.location = part2;
    }
  }

  return result;
}

/**
 * PRICE EXTRACTION
 */
function extractPriceRange(query: string): { min?: number; max?: number } | undefined {
  const priceRange: { min?: number; max?: number } = {};

  const underPattern = /(?:under|below|less than|max|maximum)\s+(?:₹|Rs\.?|INR)?\s*(\d+)/i;
  const underMatch = query.match(underPattern);
  if (underMatch) {
    priceRange.max = parseInt(underMatch[1]);
  }

  const overPattern = /(?:above|over|more than|min|minimum)\s+(?:₹|Rs\.?|INR)?\s*(\d+)/i;
  const overMatch = query.match(overPattern);
  if (overMatch) {
    priceRange.min = parseInt(overMatch[1]);
  }

  const betweenPattern = /between\s+(?:₹|Rs\.?|INR)?\s*(\d+)\s+(?:and|to|-)\s+(?:₹|Rs\.?|INR)?\s*(\d+)/i;
  const betweenMatch = query.match(betweenPattern);
  if (betweenMatch) {
    priceRange.min = parseInt(betweenMatch[1]);
    priceRange.max = parseInt(betweenMatch[2]);
  }

  if (/budget|cheap|affordable|economical/i.test(query)) {
    priceRange.max = priceRange.max || 5000;
  }
  if (/premium|luxury|high-?end|upscale/i.test(query)) {
    priceRange.min = priceRange.min || 10000;
  }

  return Object.keys(priceRange).length > 0 ? priceRange : undefined;
}

/**
 * SPECIAL REQUIREMENTS EXTRACTION
 */
function extractSpecialRequirements(query: string): string[] {
  const requirements: string[] = [];

  const requirementPatterns = {
    'wheelchair accessible': /wheelchair|accessibility|disabled|handicap/i,
    'parking available': /parking|car park|vehicle/i,
    'outdoor space': /outdoor|garden|terrace|rooftop|patio/i,
    'kitchen facilities': /kitchen|catering|food prep/i,
    'wifi': /wifi|wi-fi|internet|broadband/i,
    'projector': /projector|screen|av|audio.?visual/i,
    'natural light': /natural light|windows|sunlight|bright/i,
    'quiet': /quiet|silent|peaceful|noise.?free/i,
    'sound system': /sound system|speakers|audio|music system/i,
    'air conditioning': /ac|air.?condition|climate control|cool/i
  };

  for (const [req, pattern] of Object.entries(requirementPatterns)) {
    if (pattern.test(query)) {
      requirements.push(req);
    }
  }

  return requirements;
}

/**
 * EVENT TYPE DETECTION
 */
function detectEventTypes(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const detectedEvents: string[] = [];

  for (const [eventType, config] of Object.entries(EVENT_MAPPINGS)) {
    for (const keyword of config.keywords) {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
      if (pattern.test(query)) {
        detectedEvents.push(eventType);
        break;
      }
    }
  }

  return detectedEvents;
}

/**
 * PERSONALITY INFERENCE
 */
function inferPersonality(eventTypes: string[], query: string): PersonalityFilter {
  const personality: PersonalityFilter = {};

  for (const eventType of eventTypes) {
    const eventConfig = EVENT_MAPPINGS[eventType];
    if (eventConfig?.personality) {
      Object.assign(personality, eventConfig.personality);
    }
  }

  const personalityKeywords = {
    'modern': { minimalism: { min: 6 }, industrialness: { max: 5 } },
    'rustic': { naturalness: { min: 7 }, industrialness: { min: 6 } },
    'elegant': { formality: { min: 7 }, minimalism: { min: 5 } },
    'casual': { formality: { max: 4 } },
    'vibrant': { vibrancy: { min: 7 } },
    'calm': { vibrancy: { max: 4 } },
    'bright': { vibrancy: { min: 6 } },
    'cozy': { formality: { max: 5 }, naturalness: { min: 5 } },
    'spacious': { minimalism: { min: 6 } },
    'intimate': { formality: { max: 6 } },
    'professional': { formality: { min: 7 } },
    'creative': { uniqueness: { min: 7 } },
    'industrial': { industrialness: { min: 7 } },
    'natural': { naturalness: { min: 7 } },
    'minimalist': { minimalism: { min: 8 } }
  };

  const lowerQuery = query.toLowerCase();
  for (const [keyword, traits] of Object.entries(personalityKeywords)) {
    if (lowerQuery.includes(keyword)) {
      Object.assign(personality, traits);
    }
  }

  return personality;
}

/**
 * DATE EXTRACTION
 */
function extractDate(query: string): Date | undefined {
  const lower = query.toLowerCase();
  const today = startOfDay(new Date());

  if (lower.includes('today')) return today;
  if (lower.includes('tomorrow')) return addDays(today, 1);
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(`next ${days[i]}`)) {
      return nextDay(today, i as any);
    }
  }

  return undefined;
}

/**
 * TIME EXTRACTION
 */
function extractTime(query: string): string | undefined {
  const timeMatch = query.match(/(\d{1,2})(?::|\.)(\d{2})(?::|\.)? ?(?:am|pm)?/i);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }
  return undefined;
}

/**
 * CONFIDENCE CALCULATION
 */
function calculateConfidence(intent: Omit<SearchIntent, 'confidence'>): number {
  let score = 0;

  if (intent.eventTypes.length > 0) score += 30;
  if (intent.guestCount) score += 25;
  if (intent.city) score += 20; // Increased weight for location
  if (intent.location) score += 10; // Bonus for specific area
  
  const personalityDims = Object.keys(intent.personality).length;
  score += Math.min(personalityDims * 5, 15);

  if (intent.priceRange) score += 10;

  return Math.min(score / 100, 1);
}

/**
 * MAIN PARSER
 */
export function parseSearchIntent(query: string): SearchIntent {
  const eventTypes = detectEventTypes(query);
  const guestCount = extractCapacity(query);
  const locationData = extractLocation(query);
  const priceRange = extractPriceRange(query);
  const specialRequirements = extractSpecialRequirements(query);
  const personality = inferPersonality(eventTypes, query);
  const preferredDate = extractDate(query);
  const preferredTime = extractTime(query);

  const intent: Omit<SearchIntent, 'confidence'> = {
    eventTypes,
    personality,
    guestCount,
    city: locationData.city,
    location: locationData.location,
    priceRange,
    preferredDate,
    preferredTime,
    rawQuery: query,
    specialRequirements
  };

  return {
    ...intent,
    confidence: calculateConfidence(intent)
  };
}

/**
 * QUERY FILTERS
 */
export function intentToQueryFilters(intent: SearchIntent) {
  return {
    city: intent.city,
    location: intent.location,
    minPrice: intent.priceRange?.min,
    maxPrice: intent.priceRange?.max,
    eventTypes: intent.eventTypes,
    guestCount: intent.guestCount
  };
}

/**
 * INTENT SUMMARY
 */
export function getIntentSummary(intent: SearchIntent): string {
  const parts: string[] = [];

  if (intent.eventTypes.length > 0) {
    parts.push(`Event: ${intent.eventTypes.join(', ').replace(/_/g, ' ')}`);
  }

  if (intent.guestCount) {
    parts.push(`Capacity: ${intent.guestCount} guests`);
  }

  if (intent.city || intent.location) {
    const locParts = [];
    if (intent.location) locParts.push(intent.location);
    if (intent.city) locParts.push(intent.city);
    parts.push(`Location: ${locParts.join(', ')}`);
  }

  if (intent.priceRange) {
    const { min, max } = intent.priceRange;
    if (min && max) parts.push(`Budget: ₹${min}-${max}/hr`);
    else if (max) parts.push(`Budget: Under ₹${max}/hr`);
    else if (min) parts.push(`Budget: Above ₹${min}/hr`);
  }

  const personalityCount = Object.keys(intent.personality).length;
  if (personalityCount > 0) {
    parts.push(`${personalityCount} vibe preferences`);
  }

  if (intent.specialRequirements && intent.specialRequirements.length > 0) {
    parts.push(`Requirements: ${intent.specialRequirements.join(', ')}`);
  }

  if (intent.preferredDate) {
    parts.push(`Date: ${intent.preferredDate.toLocaleDateString()}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'General search';
}