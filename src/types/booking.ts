export interface Booking {
  id: string;
  venue_id: string;
  user_id: string;
  
  // Aligning with the SQL Schema we created
  booking_date: string; // YYYY-MM-DD
  start_time: string;   // HH:mm:ss
  end_time: string;     // HH:mm:ss
  
  guest_count: number;
  event_type?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'denied';
  total_price: number;
  message?: string;
  
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  booking_id?: string;
}

export interface VenueAvailability {
  venue_id: string;
  date: string;
  available_slots: TimeSlot[];
  is_fully_booked: boolean;
}