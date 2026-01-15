import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { extractAndSaveSemanticData } from '@/lib/semantic-extractor';
import { FALLBACK_ANALYSIS } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.GEMINI_API_KEY) console.error("❌ MISSING: GEMINI_API_KEY");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) console.error("❌ MISSING: NEXT_PUBLIC_SUPABASE_URL");
if (!process.env.SERVICE_ROLE_KEY) console.error("❌ MISSING: SERVICE_ROLE_KEY");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function cleanAndParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    try {
      let cleaned = text.replace(/```json\s*|\s*```/g, '');
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        cleaned = cleaned.substring(start, end + 1);
      }
      return JSON.parse(cleaned);
    } catch (finalError) {
      console.error("JSON Repair Failed:", text.substring(0, 100) + "...");
      return null;
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { video, venueName, location, city, price, userId, address } = body;

    if (!video || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`📹 Analyzing venue: ${venueName}`);
    const base64Data = video.includes(',') ? video.split(',')[1] : video;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview', 
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4000,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
    You are CHECKD's Venue Intelligence Engine.
    Analyze this venue video comprehensively.

    RETURN ONLY VALID JSON matching this exact structure:

    {
      "radarStats": {
        "vibe": number (0-10, derived from overall energy and style),
        "safety": number (0-10, derived from NFPA compliance status),
        "acoustics": number (0-10, 10 is perfect sound, 0 is echoey),
        "lighting": number (0-10, 10 is abundant natural light),
        "spaciousness": number (0-10, relative to room size),
        "accessibility": number (0-10, wheelchair access, wide paths)
      },
      "suggestions": [string] (3-4 actionable tips to improve the venue),
      "best_use_cases": [string] (3-4 ideal event types),
      "electricalSystem": {
        "outletsCount": number,
        "types": "string",
        "nfpa70Status": "compliant" | "needs_inspection"
      },
      "fireSafetyAndEgress": {
        "exitsCount": number,
        "nfpa101Status": "compliant" | "needs_inspection"
      },
      "capacityAndSpace": {
        "dimensions": "string",
        "comfortableCapacity": number,
        "standingCapacity": number
      },
      "acousticProperties": {
        "roomAcoustics": "echoey" | "neutral" | "dead"
      },
      "environmentalSystems": {
        "naturalLight": "moderate" | "abundant",
        "ventilation": "good" | "poor",
        "naturalLightPotential": number (0-100)
      },
      "riskAssessment": {
        "criticalIssues": [string],
        "overallRiskLevel": "low" | "moderate" | "high"
      },
      "comprehensiveAssessment": {
        "overallVenueQualityScore": number (0-10),
        "bestUseCase": "string",
        "summary": "string"
      },
      "marketing": {
        "suggestedDescription": "string (2-3 sentences selling the venue)"
      },
      "semanticDimensions": {
        "spacePersonality": {
          "industrialness": number (0-10),
          "minimalism": number (0-10),
          "naturalness": number (0-10),
          "formality": number (0-10),
          "vibrancy": number (0-10),
          "uniqueness": number (0-10),
          "accessibility": number (0-10)
        },
        "eventCompatibility": {
          "dance_class": number (0.0-1.0),
          "yoga_meditation": number (0.0-1.0),
          "corporate_conference": number (0.0-1.0),
          "wedding": number (0.0-1.0),
          "fitness_class": number (0.0-1.0),
          "photography_shoot": number (0.0-1.0),
          "music_performance": number (0.0-1.0),
          "podcast_recording": number (0.0-1.0),
          "private_party": number (0.0-1.0),
          "training_workshop": number (0.0-1.0),
          "product_launch": number (0.0-1.0),
          "arts_exhibition": number (0.0-1.0)
        },
        "atmosphereProfile": {
          "soundscape": { "baselineNoiseLevel": "quiet" | "moderate" },
          "lighting": { "naturalLightPotential": number (0-100) },
          "climate": { "ventilationFreshness": number (0-10) },
          "ambient": { "energy": "calm" | "high" }
        },
        "useCaseTags": {
          "primary": [string],
          "secondary": [string],
          "emerging": [],
          "poorFit": []
        }
      }
    }
    `;

    // FIX: Typed as 'any' to prevent TS errors with dynamic fields
    let analysisData: any = FALLBACK_ANALYSIS; 

    try {
      console.log('🤖 Calling Gemini API...');
      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: 'video/mp4', data: base64Data } },
      ]);

      const response = await result.response;
      const text = response.text();
      console.log('✅ Gemini responded');

      const parsed = cleanAndParseJSON(text);
      if (parsed) {
        analysisData = parsed;
        console.log('✅ JSON parsed successfully');
      } else {
        console.warn('⚠️ JSON Parse failed. Using Fallback.');
      }

    } catch (geminiError: any) {
      console.error('❌ Gemini error:', geminiError.message);
    }

    const venueId = uuidv4();
    
    // Saving calculated radar stats and new fields to DB
    const dbPayload = {
      id: venueId,
      owner_id: userId,
      name: venueName,
      location: location,
      city: city,
      address: address, 
      description: analysisData.marketing?.suggestedDescription || "Verified Venue",
      comfortable_capacity: analysisData.capacityAndSpace?.comfortableCapacity || 0,
      standing_capacity: analysisData.capacityAndSpace?.standingCapacity || 0,
      price_per_hour: parseFloat(price) || 0,
      
      // Radar & Compliance
      nfpa70_status: analysisData.electricalSystem?.nfpa70Status || 'unknown',
      nfpa101_status: analysisData.fireSafetyAndEgress?.nfpa101Status || 'unknown',
      room_acoustics: analysisData.acousticProperties?.roomAcoustics || 'neutral',
      // Access naturalLightPotential safely via optional chaining or fallback
      natural_light_potential: analysisData.environmentalSystems?.naturalLightPotential ?? 50,
      space_accessibility: analysisData.semanticDimensions?.spacePersonality?.accessibility || 5,

      // Semantic Fields
      space_industrialness: analysisData.semanticDimensions?.spacePersonality?.industrialness || 5,
      space_minimalism: analysisData.semanticDimensions?.spacePersonality?.minimalism || 5,
      space_naturalness: analysisData.semanticDimensions?.spacePersonality?.naturalness || 5,
      space_formality: analysisData.semanticDimensions?.spacePersonality?.formality || 5,
      space_vibrancy: analysisData.semanticDimensions?.spacePersonality?.vibrancy || 5,
      space_uniqueness: analysisData.semanticDimensions?.spacePersonality?.uniqueness || 5,
      
      event_compatibility: analysisData.semanticDimensions?.eventCompatibility || {},
      atmosphere_profile: analysisData.semanticDimensions?.atmosphereProfile || {},
      use_case_tags: analysisData.semanticDimensions?.useCaseTags || {},
      analysis_json: analysisData, // Stores suggestions & best_use_cases inside here
      created_at: new Date().toISOString(),
    };

    const { data: venue, error: dbError } = await supabase
      .from('venues')
      .insert(dbPayload)
      .select()
      .single();

    if (dbError) {
      console.error('❌ DB Error:', dbError.message);
      throw new Error(`DB Error: ${dbError.message}`);
    }

    console.log(`✅ Venue created: ${venue.id}`);

    try {
      await extractAndSaveSemanticData(venue.id, { semanticDimensions: analysisData.semanticDimensions });
    } catch (semanticError: any) {
      console.warn('⚠️ Semantic extraction warning:', semanticError.message);
    }

    return NextResponse.json({
      success: true,
      venue: {
        id: venue.id,
        name: venue.name,
      },
      message: 'Venue analyzed successfully',
    });

  } catch (error: any) {
    console.error('Analysis Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}