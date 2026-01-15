'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Minus, 
  Plus, 
  Send, 
  Loader2,
  CheckCircle2,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function BookingBox({ venueId, pricePerHour, ownerId, userScore }: any) {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Refs for date inputs
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const handleDateBoxClick = (type: 'checkin' | 'checkout') => {
    if (type === 'checkin') {
      setTimeout(() => startDateRef.current?.showPicker?.(), 100);
    } else {
      setTimeout(() => endDateRef.current?.showPicker?.(), 100);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    // Auto-focus checkout after selecting check-in
    if (!endDate) {
      setTimeout(() => {
        endDateRef.current?.showPicker?.();
      }, 300);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Add date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleRequest = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select dates");
      return;
    }

    setLoading(true);
    
    // 1. Get Current User
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please sign in to book.");
      setLoading(false);
      router.push('/auth/login?next=' + window.location.pathname);
      return;
    }

    try {
      // 2. Call the API
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: venueId,
          planner_id: user.id,
          owner_id: ownerId,
          planner_email: user.email,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          guest_count: guestCount,
          message: message,
          start_time: "09:00", 
          end_time: "17:00"
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setIsSuccess(true);
      toast.success("Request sent!");
    } catch (error: any) {
      toast.error(error.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-[#37474F] border border-white/10 rounded-3xl p-6 shadow-2xl sticky top-28">
        <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-[#C6FF00]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#C6FF00] border border-[#C6FF00]/30 shadow-[0_0_30px_rgba(198,255,0,0.2)]">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Request Sent!</h3>
          <p className="text-gray-400 text-sm mb-8 px-4">
            We've notified the host. Check your bookings for updates.
          </p>
          <button 
            onClick={() => router.push('/bookings')} 
            className="w-full py-4 bg-[#C6FF00] text-[#263238] rounded-xl font-bold hover:bg-white transition-colors mb-3"
          >
            Go to My Bookings
          </button>
          <button 
            onClick={() => setIsSuccess(false)} 
            className="text-[#C6FF00] text-xs font-bold uppercase tracking-widest hover:underline"
          >
            Book Another Date
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#37474F] border border-white/10 rounded-3xl p-6 sticky top-28 shadow-2xl">
      
      {/* Price Header */}
      <div className="flex justify-between items-end mb-8 pb-6 border-b border-white/10">
        <div>
          <span className="text-4xl font-black text-white">₹{pricePerHour}</span>
          <span className="text-gray-400 text-sm"> / hour</span>
        </div>
        <div className="flex items-center gap-1 bg-[#C6FF00] text-[#263238] px-3 py-1 rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(198,255,0,0.3)]">
          <Star size={14} fill="currentColor" /> {userScore || "New"}
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Enhanced Date Selectors - Airbnb Style */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Date & Time</label>
          <div className="grid grid-cols-2 gap-3">
            
            {/* Check In */}
            <div 
              onClick={() => handleDateBoxClick('checkin')}
              className="relative bg-black/30 rounded-xl border border-white/10 p-4 hover:border-[#C6FF00]/50 transition-all cursor-pointer group"
            >
              <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1 pointer-events-none">Check In</label>
              <div className="flex items-center justify-between">
                <span className={`font-bold ${startDate ? 'text-white' : 'text-gray-500'}`}>
                  {formatDateDisplay(startDate)}
                </span>
                <Calendar size={16} className="text-[#C6FF00] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <input 
                ref={startDateRef}
                type="date" 
                value={startDate}
                onChange={handleStartDateChange}
                className="absolute inset-0 opacity-0 cursor-pointer" 
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {/* Check Out */}
            <div 
              onClick={() => handleDateBoxClick('checkout')}
              className="relative bg-black/30 rounded-xl border border-white/10 p-4 hover:border-[#C6FF00]/50 transition-all cursor-pointer group"
            >
              <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1 pointer-events-none">Check Out</label>
              <div className="flex items-center justify-between">
                <span className={`font-bold ${endDate ? 'text-white' : 'text-gray-500'}`}>
                  {formatDateDisplay(endDate)}
                </span>
                <Calendar size={16} className="text-[#C6FF00] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <input 
                ref={endDateRef}
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="absolute inset-0 opacity-0 cursor-pointer" 
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
        </div>

        {/* Guest Counter */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Guests</label>
          <div className="flex items-center bg-black/30 border border-white/10 rounded-xl p-1">
            <button 
              onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
              className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-lg text-white transition-colors"
            >
              <Minus size={18} />
            </button>
            <input 
              type="number" 
              value={guestCount} 
              onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)} 
              className="flex-grow bg-transparent text-center font-black text-xl text-white focus:outline-none appearance-none" 
            />
            <button 
              onClick={() => setGuestCount(guestCount + 1)}
              className="w-12 h-12 flex items-center justify-center bg-[#C6FF00] text-[#263238] rounded-lg hover:bg-white transition-colors shadow-lg"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Message Host</label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell them about your event..."
            className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#C6FF00] outline-none min-h-[100px] resize-none"
          />
        </div>

        {/* Action Button */}
        <button 
          onClick={handleRequest}
          disabled={loading || !startDate || !endDate}
          className="w-full py-4 bg-[#C6FF00] text-[#263238] font-black text-lg rounded-xl hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(198,255,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              Request to Book
              <Send size={16} />
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-4">
          No payment required now
        </p>
      </div>
    </div>
  );
}