import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Admin Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY!
);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILES = 10;

export async function POST(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params;
    
    const formData = await request.formData();
    const photos = formData.getAll('photos') as File[];
    const shortDescription = formData.get('shortDescription') as string | null;

    // --- 1. VALIDATION ---
    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: 'No photos uploaded' }, { status: 400 });
    }

    if (photos.length > MAX_FILES) {
      return NextResponse.json({ error: `Max ${MAX_FILES} photos allowed per upload` }, { status: 400 });
    }

    for (const file of photos) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.name}. Only JPG, PNG, WEBP allowed.` }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File too large: ${file.name}. Max 5MB.` }, { status: 400 });
      }
    }

    // --- 2. PARALLEL UPLOADS ---
    const uploadPromises = photos.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${venueId}/${Date.now()}_${uuidv4()}.${fileExt}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('venue-photos')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false // Prevent accidental overwrites
        });

      if (uploadError) {
        console.error(`Upload failed for ${file.name}:`, uploadError);
        throw new Error(`Failed to upload ${file.name}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('venue-photos')
        .getPublicUrl(fileName);
      
      return publicUrl;
    });

    const newUploadedUrls = await Promise.all(uploadPromises);

    // --- 3. FETCH EXISTING PHOTOS ---
    const { data: currentVenue, error: fetchError } = await supabase
      .from('venues')
      .select('photos')
      .eq('id', venueId)
      .single();

    if (fetchError) throw fetchError;

    const existingPhotos = currentVenue?.photos || [];
    const updatedPhotos = [...existingPhotos, ...newUploadedUrls];

    // --- 4. UPDATE DATABASE ---
    const updatePayload: any = {
      photos: updatedPhotos,
    };

    // Only update description if provided (don't overwrite with empty string if not intended)
    if (shortDescription && shortDescription.trim().length > 0) {
      updatePayload.short_description = shortDescription;
      // We might want to keep the main AI description, only update short_description
      // updatePayload.description = shortDescription; 
    }

    const { error: dbError } = await supabase
      .from('venues')
      .update(updatePayload)
      .eq('id', venueId);

    if (dbError) throw dbError;

    return NextResponse.json({ 
      success: true, 
      photos: updatedPhotos,
      count: newUploadedUrls.length 
    });

  } catch (error: any) {
    console.error('Photo Upload API Error:', error);
    return NextResponse.json({ success: false, error: error.message || "Upload failed" }, { status: 500 });
  }
}