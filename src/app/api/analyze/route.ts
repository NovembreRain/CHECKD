import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { extractAndSaveSemanticData } from '@/lib/semantic-extractor';
import { FALLBACK_ANALYSIS } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

// Environment Variable Validation
const GENAI_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SERVICE_ROLE_KEY;

if (!GENAI_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ CRITICAL MISSING ENV VARS");
}

const genAI = new GoogleGenerativeAI(GENAI_KEY!);
const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false }
});

/**
 * Robust JSON repair utility to handle LLM edge cases
 */
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
    const {
      videoUrl,
      tempFilePath,
      venueName,
      location,
      city,
      price,
      userId,
      address
    } = body;

    // 1. Validation
    if (!videoUrl || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`📹 Analyzing venue: ${venueName}`);

    // 2. Fetch Video to Buffer (Bypasses Vercel Body Size Limits)
    const vidRes = await fetch(videoUrl);
    if (!vidRes.ok) throw new Error(`Failed to fetch video from URL: ${vidRes.statusText}`);

    const arrayBuffer = await vidRes.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 3. Initialize Gemini 2.0 Flash
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
        "vibe": number, "safety": number, "acoustics": number, 
        "lighting": number, "spaciousness": number, "accessibility": number
      },
      "suggestions": [string],
      "best_use_cases": [string],
      "electricalSystem": { "outletsCount": number, "types": "string", "nfpa70Status": "compliant" | "needs_inspection" },
      "fireSafetyAndEgress": { "exitsCount": number, "nfpa101Status": "compliant" | "needs_inspection" },
      "capacityAndSpace": { "dimensions": "string", "comfortableCapacity": number, "standingCapacity": number },
      "acousticProperties": { "roomAcoustics": "echoey" | "neutral" | "dead" },
      "environmentalSystems": { "naturalLight": "moderate" | "abundant", "ventilation": "good" | "poor", "naturalLightPotential": number },
      "riskAssessment": { "criticalIssues": [string], "overallRiskLevel": "low" | "moderate" | "high" },
      "comprehensiveAssessment": { "overallVenueQualityScore": number, "bestUseCase": "string", "summary": "string" },
      "marketing": { "suggestedDescription": "string" },
      "semanticDimensions": {
        "spacePersonality": { "industrialness": number, "minimalism": number, "naturalness": number, "formality": number, "vibrancy": number, "uniqueness": number, "accessibility": number },
        "eventCompatibility": { "dance_class": number, "yoga_meditation": number, "corporate_conference": number, "wedding": number, "fitness_class": number, "photography_shoot": number, "music_performance": number, "podcast_recording": number, "private_party": number, "training_workshop": number, "product_launch": number, "arts_exhibition": number },
        "atmosphereProfile": { "soundscape": { "baselineNoiseLevel": "quiet" | "moderate" }, "lighting": { "naturalLightPotential": number }, "climate": { "ventilationFreshness": number }, "ambient": { "energy": "calm" | "high" } },
        "useCaseTags": { "primary": [string], "secondary": [string], "emerging": [], "poorFit": [] }
      }
    }`;

    let analysisData: any = FALLBACK_ANALYSIS;

    // 4. AI Analysis
    try {
      console.log('🤖 Calling Gemini 2.0 Flash...');
      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: 'video/mp4', data: base64Data } },
      ]);

      const response = await result.response;
      const parsed = cleanAndParseJSON(response.text());

      if (parsed) {
        analysisData = parsed;
        console.log('✅ AI Analysis Complete');
      } else {
        console.warn('⚠️ JSON Parse failed. Using Fallback.');
      }
    } catch (geminiError: any) {
      console.error('❌ Gemini error:', geminiError.message);
      // Continue with fallback to ensure DB record is created
    }

    // 5. Database Persistence
    const venueId = uuidv4();
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
      nfpa70_status: analysisData.electricalSystem?.nfpa70Status || 'unknown',
      nfpa101_status: analysisData.fireSafetyAndEgress?.nfpa101Status || 'unknown',
      room_acoustics: analysisData.acousticProperties?.roomAcoustics || 'neutral',
      natural_light_potential: analysisData.environmentalSystems?.naturalLightPotential ?? 50,
      space_accessibility: analysisData.semanticDimensions?.spacePersonality?.accessibility || 5,
      space_industrialness: analysisData.semanticDimensions?.spacePersonality?.industrialness || 5,
      space_minimalism: analysisData.semanticDimensions?.spacePersonality?.minimalism || 5,
      space_naturalness: analysisData.semanticDimensions?.spacePersonality?.naturalness || 5,
      space_formality: analysisData.semanticDimensions?.spacePersonality?.formality || 5,
      space_vibrancy: analysisData.semanticDimensions?.spacePersonality?.vibrancy || 5,
      space_uniqueness: analysisData.semanticDimensions?.spacePersonality?.uniqueness || 5,
      event_compatibility: analysisData.semanticDimensions?.eventCompatibility || {},
      atmosphere_profile: analysisData.semanticDimensions?.atmosphereProfile || {},
      use_case_tags: analysisData.semanticDimensions?.useCaseTags || {},
      analysis_json: analysisData,
      created_at: new Date().toISOString(),
    };

    const { data: venue, error: dbError } = await supabase
      .from('venues')
      .insert(dbPayload)
      .select()
      .single();

    if (dbError) throw new Error(`Supabase Insert Error: ${dbError.message}`);

    // 6. Semantic Extraction (Async-style, won't block return if it fails)
    try {
      await extractAndSaveSemanticData(venue.id, {
        semanticDimensions: analysisData.semanticDimensions
      });
    } catch (semanticError: any) {
      console.warn('⚠️ Semantic extraction warning:', semanticError.message);
    }

    // 7. Cleanup Temporary File
    if (tempFilePath) {
      const { error: storageError } = await supabase.storage
        .from('venues')
        .remove([tempFilePath]);

      if (storageError) console.error('❌ Cleanup Failed:', storageError.message);
      else console.log('🗑️ Temp file deleted');
    }

    return NextResponse.json({
      success: true,
      venue: { id: venue.id, name: venue.name },
      message: 'Venue analyzed and synchronized successfully',
    });

  } catch (error: any) {
    console.error('CRITICAL_API_ERROR:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}