'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { 
  Calendar, MapPin, MessageSquare, Clock, 
  CheckCircle2, XCircle, Send, Loader2, ArrowRight
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Booking {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  message: string; // Initial message
  created_at: string;
  venue: {
    id: string;
    name: string;
    location: string;
    venue_image_url?: string;
    price_per_hour: number;
  };
  owner_id: string;
}

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

export default function PlannerBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // 1. Fetch Bookings List
  useEffect(() => {
    if (!authLoading && !user) return router.push('/auth/login');
    
    async function fetchBookings() {
      if (!user) return;
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          venue:venues (id, name, location, venue_image_url, price_per_hour)
        `)
        .eq('planner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error("Failed to load bookings");
      } else {
        setBookings(data || []);
        if (data && data.length > 0) setSelectedBooking(data[0]); // Select first by default
      }
      setLoading(false);
    }
    fetchBookings();
  }, [user, authLoading, router]);

  // 2. Fetch Messages (WITH AUTO-REFRESH FIX)
  useEffect(() => {
    if (!selectedBooking) return;

    let isMounted = true;

    // Load initial message (from booking) + chat history
    const initialMsg: any = {
      id: 'init',
      sender_id: user?.id || '', // Mark as 'me' for display logic, or strictly use planner ID
      message_text: selectedBooking.message,
      created_at: selectedBooking.created_at
    };

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', selectedBooking.id)
        .order('created_at', { ascending: true });
      
      if (!isMounted) return;

      // Merge initial inquiry with DB messages
      setMessages([initialMsg, ...(data || [])]);
    };

    // Run immediately
    fetchMessages();

    // Run every 3 seconds (Polling)
    const interval = setInterval(fetchMessages, 3000);

    // Cleanup
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedBooking, user]); // Re-run when user selects a different booking

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [messages]);

  // 3. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedBooking || !user) return;

    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          message_text: newMessage
        })
      });
      
      const data = await res.json();
      if (data.success) {
        // We don't strictly need to update state here because the poll will catch it,
        // but updating immediately makes the UI feel faster.
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      }
    } catch (err) {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#263238] flex items-center justify-center text-[#C6FF00]"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#263238] text-white pt-24 px-4 md:px-8 pb-8 flex gap-6 h-screen">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#37474F', color: '#fff' } }} />

      {/* --- SIDEBAR LIST --- */}
      <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col gap-4 overflow-y-auto pr-2 pb-20">
        <h1 className="text-2xl font-black mb-2">My Requests</h1>
        {bookings.length === 0 ? (
          <div className="text-gray-500 text-sm">No bookings yet.</div>
        ) : (
          bookings.map(booking => (
            <div 
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedBooking?.id === booking.id ? 'bg-[#C6FF00]/10 border-[#C6FF00] shadow-[0_0_15px_rgba(198,255,0,0.1)]' : 'bg-[#37474F]/30 border-white/5 hover:border-white/20'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white truncate">{booking.venue.name}</h3>
                <StatusBadge status={booking.status} />
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">
                <Calendar size={12} /> 
                {new Date(booking.start_date).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black/30">
                  {booking.venue.venue_image_url && (
                    <Image 
                      src={booking.venue.venue_image_url} 
                      fill 
                      className="object-cover" 
                      alt="Venue" 
                      unoptimized 
                    />
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  ID: {booking.id.slice(0,8)}...
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MAIN CHAT & DETAILS AREA --- */}
      {selectedBooking ? (
        <div className="flex-1 bg-[#37474F]/20 border border-white/5 rounded-3xl flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="p-6 border-b border-white/5 bg-[#37474F]/40 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedBooking.venue.name}</h2>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <MapPin size={14} /> {selectedBooking.venue.location}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-white">₹{(selectedBooking.venue.price_per_hour * 8).toLocaleString()}</div>
              <div className="text-xs text-gray-500">Est. Total</div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex justify-center">
              <span className="text-[10px] uppercase font-bold text-gray-500 bg-black/20 px-3 py-1 rounded-full">Request Sent on {new Date(selectedBooking.created_at).toLocaleDateString()}</span>
            </div>
            
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-[#C6FF00] text-[#263238] rounded-br-none' : 'bg-[#37474F] text-white rounded-bl-none border border-white/5'}`}>
                    {msg.message_text}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#37474F]/40 border-t border-white/5">
            <form onSubmit={handleSendMessage} className="relative">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message the host..."
                className="w-full bg-black/30 border border-white/10 rounded-full py-4 pl-6 pr-14 text-white focus:border-[#C6FF00] outline-none transition-colors"
              />
              <button 
                disabled={sending || !newMessage.trim()}
                className="absolute right-2 top-2 p-2 bg-[#C6FF00] text-[#263238] rounded-full hover:bg-white transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-3xl m-4">
          <MessageSquare size={48} className="mb-4 opacity-50" />
          <p>Select a booking to view details</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    PENDING: "bg-amber-500/20 text-amber-500 border-amber-500/50",
    APPROVED: "bg-[#C6FF00]/20 text-[#C6FF00] border-[#C6FF00]/50",
    DENIED: "bg-red-500/20 text-red-500 border-red-500/50",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status}
    </span>
  );
}