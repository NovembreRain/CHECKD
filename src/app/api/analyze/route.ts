import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { createClient } from '@supabase/supabase-js';
import { extractAndSaveSemanticData } from '@/lib/semantic-extractor';
import { FALLBACK_ANALYSIS } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import os from 'os';
import { del } from '@vercel/blob'; // <--- NEW IMPORT for Cleanup

// Environment Variable Validation
const GENAI_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SERVICE_ROLE_KEY;

if (!GENAI_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ CRITICAL MISSING ENV VARS");
}

const genAI = new GoogleGenerativeAI(GENAI_KEY!);
const fileManager = new GoogleAIFileManager(GENAI_KEY!);

const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false }
});

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

async function downloadDataToTemp(url: string, filename: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
  if (!response.body) throw new Error(`No body in response`);

  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, filename);
  const fileStream = fs.createWriteStream(filePath);

  // @ts-ignore
  await pipeline(Readable.fromWeb(response.body), fileStream);

  console.log(`Downloaded to ${filePath}`);
  return filePath;
}

export async function POST(request: Request) {
  let localFilePath: string | null = null;
  let geminiFileName: string | null = null;
  let blobUrlToDelete: string | null = null;

  try {
    const body = await request.json();
    const {
      videoUrl, // This is the Vercel Blob URL now
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

    blobUrlToDelete = videoUrl; // Mark for deletion at the end
    console.log(`📹 Analyzing venue: ${venueName}`);

    // 2. Download Media from Blob to Temp (Stream)
    // We download to /tmp so we can upload to Gemini via File API
    const tempFileName = `${uuidv4()}.mp4`;
    localFilePath = await downloadDataToTemp(videoUrl, tempFileName);

    // 3. Upload to Gemini File Manager
    console.log('📤 Uploading to Gemini File Manager...');
    const uploadResponse = await fileManager.uploadFile(localFilePath, {
      mimeType: "video/mp4",
      displayName: venueName
    });

    const geminiFileUri = uploadResponse.file.uri;
    geminiFileName = uploadResponse.file.name;
    console.log(`✅ Uploaded to Gemini: ${geminiFileUri}`);

    // 4. Wait for processing
    let file = await fileManager.getFile(geminiFileName);
    while (file.state === FileState.PROCESSING) {
      console.log('⏳ Gemini processing video...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      file = await fileManager.getFile(geminiFileName);
    }

    if (file.state === FileState.FAILED) {
      throw new Error("Gemini video processing failed");
    }
    console.log('✅ Video processing complete');

    // 5. Initialize Gemini 2.0 Flash
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    // 6. Generate Content
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

    try {
      console.log('🤖 Prompting Gemini...');
      const result = await model.generateContent([
        prompt,
        {
          fileData: {
            mimeType: "video/mp4",
            fileUri: geminiFileUri
          }
        }
      ]);

      const response = await result.response;
      const parsed = cleanAndParseJSON(response.text());

      if (parsed) {
        analysisData = parsed;
        console.log('✅ Analysis Success');
      }
    } catch (geminiError: any) {
      console.error('❌ Generator error:', geminiError.message);
    }

    // 7. Database Persistence
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

    if (dbError) throw new Error(`DB Insert Error: ${dbError.message}`);

    // 8. Semantic Extraction
    try {
      await extractAndSaveSemanticData(venue.id, {
        semanticDimensions: analysisData.semanticDimensions
      });
    } catch (semanticError: any) {
      console.warn('⚠️ Semantic warn:', semanticError.message);
    }

    return NextResponse.json({
      success: true,
      venue: { id: venue.id, name: venue.name },
      message: 'Analysis complete',
    });

  } catch (error: any) {
    console.error('CRITICAL_API_ERROR:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  } finally {
    // 9. FINAL CLEANUP

    // Remove Gemini File
    if (geminiFileName) {
      try {
        await fileManager.deleteFile(geminiFileName);
        console.log('🗑️ Deleted Gemini file');
      } catch (e) { console.error('Failed to delete Gemini file', e); }
    }

    // Remove Local Temp File
    if (localFilePath && fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
        console.log('🗑️ Local temp file cleaned');
      } catch (e) {
        console.error('Final cleanup failed', e);
      }
    }

    // Remove Vercel Blob File (Save money)
    if (blobUrlToDelete) {
      try {
        await del(blobUrlToDelete);
        console.log('🗑️ Vercel Blob file cleaned');
      } catch (e) {
        console.error('Failed to delete blob', e);
      }
    }
  }
}