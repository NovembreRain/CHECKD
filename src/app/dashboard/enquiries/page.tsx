'use client';

import { useEffect, useState, useRef, Suspense } from 'react'; // Added Suspense
import { useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Filter, Calendar, Users, ChevronRight, 
  MessageSquare, CheckCircle2, XCircle, Clock, 
  Send, Loader2, X 
} from 'lucide-react';

interface Booking {
  id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
  message: string;
  venue: { id: string; name: string; price_per_hour: number };
  planner_email: string;
  owner_id: string;
  planner_id: string;
}

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

function EnquiriesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook for URL params

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Initialize state from URL or default to 'All'
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'All');
  const [venueFilter, setVenueFilter] = useState<string>('All');
  
  const venues = Array.from(new Set(bookings.map(b => b.venue?.name).filter(Boolean)));
  
  // Update filter if URL changes
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) setStatusFilter(statusParam);
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) return router.push('/auth/login');
    
    async function fetchBookings() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            venue:venues(id, name, price_per_hour)
          `)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookings((data as any[]) || []);

      } catch (err) {
        console.error("Failed to load bookings", err);
        toast.error("Could not load enquiries");
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, [user, authLoading, router]);

  const filteredBookings = bookings.filter(b => {
    // Case insensitive comparison for status
    const statusMatch = statusFilter === 'All' ? true : b.status === statusFilter.toUpperCase();
    const venueMatch = venueFilter === 'All' ? true : b.venue?.name === venueFilter;
    return statusMatch && venueMatch;
  });

  if (loading) return <div className="min-h-screen bg-[#263238] flex items-center justify-center text-[#C6FF00]"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#263238] text-white pt-20 px-4 md:px-8 pb-8 flex gap-8">
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: { background: '#37474F', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
          success: { iconTheme: { primary: '#C6FF00', secondary: '#263238' } },
        }}
      />

      {/* SIDEBAR */}
      <div className="w-64 hidden md:block flex-shrink-0 space-y-8 h-[calc(100vh-100px)] sticky top-24">
        <div>
          <h2 className="text-xl font-bold mb-6">Inbox</h2>
          <div className="space-y-2">
            {['All', 'Pending', 'Approved', 'Denied'].map(status => (
              <button
                key={status}
                onClick={() => {
                   setStatusFilter(status);
                   // Optional: Update URL without reload for shareability
                   router.push(`/dashboard/enquiries?status=${status}`, { scroll: false });
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between
                  ${statusFilter.toLowerCase() === status.toLowerCase() 
                    ? 'bg-[#C6FF00] text-[#263238]' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                {status}
                {status === 'Pending' && (
                  <span className="bg-amber-500 text-[#263238] text-[10px] px-1.5 rounded-full">
                    {bookings.filter(b => b.status === 'PENDING').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Venue Filter</h3>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-3 text-gray-500" />
            <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:border-[#C6FF00] outline-none appearance-none cursor-pointer">
              <option value="All">All Properties</option>
              {venues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="flex-grow max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Enquiries <span className="text-gray-500 text-lg font-normal">({filteredBookings.length})</span></h1>
        </div>

        <div className="space-y-4">
          {filteredBookings.length > 0 ? (
            filteredBookings.map(booking => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                onClick={() => setSelectedBooking(booking)} 
              />
            ))
          ) : (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-gray-500">No {statusFilter.toLowerCase()} requests found.</p>
            </div>
          )}
        </div>
      </div>

      {/* DETAIL SLIDE-OVER */}
      {selectedBooking && (
        <BookingDetailPanel 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)}
          onUpdate={(updatedStatus) => {
            setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: updatedStatus } : b));
            setSelectedBooking(prev => prev ? { ...prev, status: updatedStatus } : null);
          }}
        />
      )}
    </div>
  );
}

// Wrap in Suspense boundary for useSearchParams
export default function EnquiriesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#263238]" />}>
      <EnquiriesContent />
    </Suspense>
  );
}

// --- SUB COMPONENTS (UNCHANGED FROM YOUR CODE, JUST RE-INCLUDED FOR COMPLETENESS) ---
// (Paste your BookingCard and BookingDetailPanel here exactly as they were in your prompt)
// ... [Use the code provided in your prompt for BookingCard and BookingDetailPanel] ...

function BookingCard({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  const statusColor: any = {
    PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    APPROVED: 'bg-[#C6FF00]/10 text-[#C6FF00] border-[#C6FF00]/20',
    DENIED: 'bg-red-500/10 text-red-500 border-red-500/20',
    CANCELLED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  }[booking.status];

  const days = Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24));
  const plannerDisplay = booking.planner_email || 'Guest';

  return (
    <div onClick={onClick} className="group bg-[#37474F]/50 border border-white/5 hover:border-[#C6FF00]/50 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg flex flex-col md:flex-row gap-6 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C6FF00] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-black/20 rounded-xl border border-white/5">
        <span className="text-xs text-gray-400 font-bold uppercase">{new Date(booking.start_date).toLocaleString('default', { month: 'short' })}</span>
        <span className="text-2xl font-black text-white">{new Date(booking.start_date).getDate()}</span>
      </div>
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg text-white">{booking.venue?.name || 'Unknown Venue'}</h3>
            <p className="text-sm text-gray-400">Request by <span className="text-white font-medium">{plannerDisplay}</span></p>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
            {booking.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 mt-3">
          <span className="flex items-center gap-1"><Clock size={12} /> {days} Nights</span>
          <span className="flex items-center gap-1"><Users size={12} /> {booking.guest_count} Guests</span>
          <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="self-center">
        <ChevronRight className="text-gray-600 group-hover:text-[#C6FF00] transition-colors" />
      </div>
    </div>
  );
}

function BookingDetailPanel({ booking, onClose, onUpdate }: { booking: Booking; onClose: () => void; onUpdate: (s: any) => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- FIX: FETCH MESSAGES FROM DB ---
  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      // 1. Fetch chat history
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true });

      if (!isMounted) return;

      // 2. Create the "Initial Inquiry" message object
      const initialMsg: any = {
        id: 'init', 
        sender_id: booking.planner_id || 'planner_guest', 
        message_text: booking.message, 
        created_at: booking.created_at
      };

      // 3. Merge: Initial Msg + DB Messages
      setMessages([initialMsg, ...(data || [])]);
      
      // Auto-scroll to bottom
      // setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    fetchMessages();

    // Live Poll: Check for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);

    return () => { 
      isMounted = false; 
      clearInterval(interval);
    };
  }, [booking]);

  const handleStatusChange = async (newStatus: 'APPROVED' | 'DENIED') => {
    if (!confirm(`Are you sure you want to ${newStatus.toLowerCase()} this booking?`)) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Booking ${newStatus.toLowerCase()}`);
        onUpdate(newStatus);
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          message_text: newMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically add message to UI
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-[#263238] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#37474F]">
          <div>
            <h2 className="text-lg font-bold text-white">Booking Details</h2>
            <p className="text-xs text-gray-400">ID: {booking.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-8">
          <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Venue</span>
              <span className="text-white font-bold text-sm">{booking.venue?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Dates</span>
              <span className="text-white font-bold text-sm text-right">
                {new Date(booking.start_date).toLocaleDateString()} <br/> 
                <span className="text-gray-500 font-normal">to</span> {new Date(booking.end_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Guests</span>
              <span className="text-white font-bold text-sm">{booking.guest_count}</span>
            </div>
            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
              <span className="text-gray-400 text-sm">Total Est.</span>
              <span className="text-[#C6FF00] font-black text-xl">
                ₹{((booking.venue?.price_per_hour || 0) * 8).toLocaleString()} <span className="text-xs font-normal text-gray-500">(approx 8h)</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {booking.status === 'PENDING' && (
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleStatusChange('DENIED')}
                disabled={processing}
                className="py-3 rounded-xl border border-red-500/30 text-red-400 font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="animate-spin" /> : <XCircle size={18} />} Decline
              </button>
              <button 
                onClick={() => handleStatusChange('APPROVED')}
                disabled={processing}
                className="py-3 rounded-xl bg-[#C6FF00] text-[#263238] font-bold hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(198,255,0,0.3)]"
              >
                {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />} Approve
              </button>
            </div>
          )}

          {/* Chat */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Messages</h3>
            <div className="space-y-4">
              {messages.map((msg, i) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                      isMe ? 'bg-[#C6FF00] text-[#263238] rounded-br-none' : 'bg-white/10 text-white rounded-bl-none'
                    }`}>
                      {msg.message_text}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#37474F] border-t border-white/5">
          <form onSubmit={sendMessage} className="relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-black/20 border border-white/10 rounded-full py-3 pl-4 pr-12 text-white focus:border-[#C6FF00] outline-none placeholder-gray-500"
            />
            <button 
              type="submit" 
              disabled={sending || !newMessage.trim()}
              className="absolute right-2 top-2 p-1.5 bg-[#C6FF00] text-[#263238] rounded-full hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}