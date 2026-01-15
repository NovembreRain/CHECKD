import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Load your ORIGINAL variables inside the function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SERVICE_ROLE_KEY; // <--- RESTORED YOUR ORIGINAL NAME

    // 2. Safety Check
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Config Error: Missing NEXT_PUBLIC_SUPABASE_URL or SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: 'Server Configuration Error' }, 
        { status: 500 }
      );
    }

    // 3. Initialize Client
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id: bookingId } = await params;
    const body = await request.json();
    const { sender_id, message_text } = body;

    if (!sender_id || !message_text) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 4. Insert Message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id,
        message_text
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: data });

  } catch (error: any) {
    console.error("Message API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}