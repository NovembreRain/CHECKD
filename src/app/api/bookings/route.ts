import { NextRequest, NextResponse } from 'next/server'; // Import NextRequest
import { createClient } from '@supabase/supabase-js';
import { sendBookingNotification } from '@/lib/email';
import { checkVenueAvailability } from '@/lib/availability';

// Initialize Admin Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// 1. GET Handler
export async function GET(request: NextRequest) { // Use NextRequest
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');
    const plannerId = searchParams.get('planner_id'); 
    
    let query = supabase
      .from('bookings')
      .select(`
        *,
        venue:venues(name, location, price_per_hour)
      `)
      .order('created_at', { ascending: false });

    if (ownerId) query = query.eq('owner_id', ownerId);
    if (plannerId) query = query.eq('planner_id', plannerId);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, bookings: data });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. POST Handler
export async function POST(request: NextRequest) { // Use NextRequest
  try {
    const body = await request.json();
    const { venue_id, planner_id, owner_id, start_date, end_date, guest_count, message, start_time, end_time } = body;

    // Validation
    if (!venue_id || !planner_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get Planner Email
    const { data: { user } } = await supabase.auth.admin.getUserById(planner_id);
    const plannerEmail = user?.email || "Unknown User";

    // Capacity Check
    const { data: venue } = await supabase
      .from('venues')
      .select('standing_capacity, name, price_per_hour')
      .eq('id', venue_id)
      .single();

    if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

    if (venue.standing_capacity && guest_count > venue.standing_capacity) {
      return NextResponse.json({ 
        error: `Capacity exceeded. Max: ${venue.standing_capacity}` 
      }, { status: 400 });
    }

    // Availability Check
    // Extract YYYY-MM-DD from the ISO string
    const bookingDate = start_date.split('T')[0];
    
    const { available, reason } = await checkVenueAvailability(
      venue_id, 
      bookingDate, 
      start_time || "09:00", 
      end_time || "17:00"
    );

    if (!available) {
      return NextResponse.json({ error: reason || 'Dates are unavailable' }, { status: 409 });
    }

    // Create Booking
    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        venue_id,
        planner_id,
        owner_id,
        planner_email: plannerEmail,
        start_date,
        end_date,
        booking_date: bookingDate,
        start_time: start_time || "09:00",
        end_time: end_time || "17:00",
        guest_count,
        message,
        status: 'PENDING'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Save Message
    if (message) {
      await supabase.from('messages').insert({
        booking_id: booking.id,
        sender_id: planner_id,
        message_text: message
      });
    }

    // Notify
    try {
        await sendBookingNotification('owner@example.com', 'REQUEST_RECEIVED', {
            venue: venue.name,
            dates: `${start_date} to ${end_date}`
        });
    } catch (e) {
        console.warn("Email notification failed", e);
    }

    return NextResponse.json({ success: true, booking_id: booking.id });

  } catch (error: any) {
    console.error('Booking Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}