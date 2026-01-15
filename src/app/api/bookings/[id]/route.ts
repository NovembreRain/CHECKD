import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Load variables inside the function to prevent build crashes
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SERVICE_ROLE_KEY; // <--- RESTORED YOUR ORIGINAL NAME

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Config Error: Missing SERVICE_ROLE_KEY in Booking Route");
      return NextResponse.json(
        { error: 'Server Configuration Error' }, 
        { status: 500 }
      );
    }

    // 2. Initialize Client
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // 3. Update Booking
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, booking: data });

  } catch (error: any) {
    console.error("Booking Update Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}