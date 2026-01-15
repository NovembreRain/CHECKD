// src/lib/constants.ts
export const INDIAN_CITIES = [
  "Agra", "Ahmedabad", "Allahabad", "Amritsar", "Aurangabad", 
  "Bangalore", "Bhopal", "Bhubaneswar", "Chandigarh", "Chennai", 
  "Coimbatore", "Dehradun", "Delhi", "Dhanbad", "Faridabad", 
  "Ghaziabad", "Goa", "Gurgaon", "Guwahati", "Hyderabad", 
  "Indore", "Jaipur", "Jamshedpur", "Jodhpur", "Kanpur", 
  "Kochi", "Kolkata", "Lucknow", "Ludhiana", "Madurai", 
  "Mangalore", "Meerut", "Mumbai", "Mysore", "Nagpur", 
  "Nashik", "Navi Mumbai", "Noida", "Patna", "Puducherry", 
  "Pune", "Raipur", "Rajkot", "Ranchi", "Shimla", 
  "Srinagar", "Surat", "Thane", "Thiruvananthapuram", "Udaipur", 
  "Vadodara", "Varanasi", "Vijayawada", "Visakhapatnam"
];

export const FALLBACK_ANALYSIS = {
  // NEW: 6-Axis Radar Stats
  radarStats: {
    vibe: 5,
    safety: 5,
    acoustics: 5,
    lighting: 5,
    spaciousness: 5,
    accessibility: 5,
  },
  
  // NEW: Marketing Description
  marketing: {
    suggestedDescription: "A verified venue awaiting detailed AI analysis.",
  },

  electricalSystem: {
    outletsCount: 0,
    types: 'unknown',
    nfpa70Status: 'needs_inspection',
  },
  lightingSystem: {
    fixturesCount: 0,
    brightnessLevel: 'medium',
  },
  fireSafetyAndEgress: {
    exitsCount: 0,
    nfpa101Status: 'unknown',
  },
  capacityAndSpace: {
    dimensions: 'Unknown',
    comfortableCapacity: 0,
    standingCapacity: 0,
  },
  acousticProperties: {
    roomAcoustics: 'neutral',
    reverbTime: 'medium',
  },
  environmentalSystems: {
    naturalLight: 'moderate',
    ventilation: 'good',
    noiseLevel: 'moderate',
  },
  riskAssessment: {
    criticalIssues: [],
    overallRiskLevel: 'low',
  },
  comprehensiveAssessment: {
    overallVenueQualityScore: 5,
    bestUseCase: 'General events',
    summary: 'Venue analyzed with fallback data due to analysis limitations.',
  },
  semanticDimensions: {
    spacePersonality: {
      industrialness: 5,
      minimalism: 5,
      naturalness: 5,
      formality: 5,
      vibrancy: 5,
      uniqueness: 5,
      accessibility: 5,
    },
    eventCompatibility: {
      dance_class: 0.5,
      yoga_meditation: 0.5,
      corporate_conference: 0.5,
      wedding: 0.5,
      fitness_class: 0.5,
      photography_shoot: 0.5,
      music_performance: 0.5,
      podcast_recording: 0.5,
      private_party: 0.5,
      training_workshop: 0.5,
      product_launch: 0.5,
      arts_exhibition: 0.5,
    },
    atmosphereProfile: {
      soundscape: { baselineNoiseLevel: 'moderate', acousticDamping: 'medium' },
      lighting: { naturalLightPotential: 50, dimmability: true, colorTemperatureRange: 'adjustable' },
      climate: { thermalControl: 'good', ventilationFreshness: 5 },
      ambient: { smell: 'neutral', energy: 'calm' },
    },
    useCaseTags: {
      primary: ['events'],
      secondary: [],
      emerging: [],
      poorFit: [],
    },
  },
};