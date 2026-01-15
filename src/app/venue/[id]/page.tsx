'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { INDIAN_CITIES } from '@/lib/constants'; // <--- IMPORT SHARED CONSTANT
import Link from 'next/link';
import { 
  ChevronLeft, Edit, Video, TrendingUp, Users, DollarSign, 
  Calendar, AlertTriangle, CheckCircle2, Lightbulb, ArrowRight,
  Zap, Camera, Activity, Sparkles, AlertOctagon, BrainCircuit,
  ChevronDown, ChevronUp, X, Save, Loader2, Image as ImageIcon, MapPin
} from 'lucide-react';
import Image from 'next/image';
import { VenueRadarChart } from '@/components/RadarChart';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';

// --- TYPES ---
interface VenueData {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  views_count: number;
  price_per_hour: number;
  photos: string[];
  venue_image_url?: string;
  nfpa70_status: string;
  nfpa101_status: string;
  analysis_json: any;
  space_vibrancy: number;
  space_accessibility: number;
  room_acoustics: string; 
  natural_light_potential: number;
  comfortable_capacity: number;
  use_case_tags: { primary: string[], emerging: string[] };
  description?: string;
}

interface BookingData {
  id: string;
  created_at: string;
  status: string;
  guest_count: number;
  planner_email: string;
  start_date: string;
  end_date: string;
  message: string;
}

interface Opportunity {
  type: 'CRITICAL' | 'STRATEGY' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  impact: string;
  color: string;
  icon?: any;
}

export default function VenueAnalyticsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m'>('30d');
  
  // UX State
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // --- 1. DATA FETCHING ---
  const loadVenueData = async () => {
    if (!id) return;
    try {
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .single();

      if (venueError) throw venueError;
      setVenue(venueData);

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('venue_id', id)
        .order('created_at', { ascending: false });

      if (bookingError) throw bookingError;
      setBookings(bookingData || []);

    } catch (error) {
      console.error("Data Load Error:", error);
      toast.error("Failed to load venue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenueData();
  }, [id]);

  // --- CHART LOGIC (MOVED UP FOR SAFETY) ---
  const chartData = useMemo(() => {
    if (!venue || loading) return [];

    const daysMap = { '7d': 7, '30d': 30, '3m': 90 };
    const days = daysMap[timeRange];
    const dataPoints = [];

    const totalViews = venue.views_count || 0;
    const baseViewPerDay = Math.ceil(totalViews / 30); 

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayBookings = bookings.filter(b => b.created_at.startsWith(dateKey));
      const dayRevenue = dayBookings
        .filter(b => b.status === 'APPROVED')
        .reduce((acc, curr) => {
           const hours = (new Date(curr.end_date).getTime() - new Date(curr.start_date).getTime()) / 36e5;
           return acc + (hours * venue.price_per_hour);
        }, 0);

      const stableRandom = Math.abs(Math.sin(d.getTime())); 
      const estimatedViews = Math.floor(baseViewPerDay * (0.5 + stableRandom));

      dataPoints.push({
        date: shortDate,
        fullDate: dateKey,
        inquiries: dayBookings.length,
        earnings: dayRevenue,
        value: estimatedViews 
      });
    }
    return dataPoints;
  }, [timeRange, bookings, venue, loading]); 

  if (loading) return <div className="min-h-screen bg-[#263238] flex items-center justify-center text-[#C6FF00]"><Activity className="animate-spin" /></div>;
  if (!venue) return <div className="min-h-screen bg-[#263238] flex items-center justify-center text-white">Venue not found.</div>;

  // --- 2. CALCULATED METRICS ---
  const totalViews = venue.views_count || 0;
  const totalInquiries = bookings.length;
  const approvedBookings = bookings.filter(b => b.status === 'APPROVED');
  const totalEarnings = approvedBookings.reduce((acc, curr) => {
    const hours = (new Date(curr.end_date).getTime() - new Date(curr.start_date).getTime()) / 36e5;
    return acc + (hours * venue.price_per_hour);
  }, 0);

  const inquiryToBookingRate = totalInquiries > 0 ? ((approvedBookings.length / totalInquiries) * 100).toFixed(1) : '0.0';
  const pendingBookings = bookings.filter(b => b.status === 'PENDING');
  const urgentPending = pendingBookings.filter(b => (Date.now() - new Date(b.created_at).getTime()) > 43200000); 

  const radarStats = {
    vibe: venue.space_vibrancy || 5,
    safety: venue.nfpa101_status === 'compliant' ? 9 : 4,
    acoustics: venue.room_acoustics === 'dead' ? 9 : (venue.room_acoustics === 'neutral' ? 7 : 4),
    lighting: Math.round((venue.natural_light_potential || 50) / 10),
    spaciousness: Math.min(Math.round((venue.comfortable_capacity || 0) / 10), 10),
    accessibility: venue.space_accessibility || 5,
  };

  const generateOpportunities = (): Opportunity[] => {
    const opps: Opportunity[] = [];
    if (radarStats.safety < 6) opps.push({ type: 'CRITICAL', title: `Compliance Risk`, description: "Venue flagged for NFPA issues.", impact: "Protect Status", color: "border-red-500 text-red-400", icon: <AlertOctagon size={18} className="text-red-400" /> });
    const aiSuggestions = venue.analysis_json?.suggestions || [];
    aiSuggestions.forEach((suggestion: string, index: number) => {
       const isPrimary = index === 0;
       opps.push({ type: 'STRATEGY', title: isPrimary ? "AI Growth Insight" : `Creative Idea #${index + 1}`, description: suggestion, impact: isPrimary ? "New Market" : "Expansion", color: isPrimary ? "border-indigo-500 text-indigo-400" : "border-purple-500 text-purple-400", icon: isPrimary ? <BrainCircuit size={18} className="text-indigo-400" /> : <Sparkles size={18} className="text-purple-400" /> });
    });
    if (radarStats.acoustics < 6) opps.push({ type: 'HIGH', title: `Fix Acoustics`, description: "High echo detected.", impact: "+₹15k / mo", color: "border-amber-500 text-amber-400", icon: <Zap size={18} className="text-amber-400" /> });
    if (radarStats.lighting < 6) opps.push({ type: 'HIGH', title: `Lighting Score`, description: "Low light.", impact: "+20% Views", color: "border-yellow-500 text-yellow-400", icon: <Lightbulb size={18} className="text-yellow-400" /> });
    if ((venue.photos?.length || 0) < 5) opps.push({ type: 'MEDIUM', title: "Gallery Size", description: "Upload 5+ photos.", impact: "+1 Booking/mo", color: "border-blue-500 text-blue-400", icon: <Camera size={18} className="text-blue-400" /> });
    return opps; 
  };

  const opportunities = generateOpportunities();
  const visibleOpportunities = showAllOpportunities ? opportunities.slice(0, 10) : opportunities.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#263238] text-white p-6 pb-20 pt-24">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#37474F', color: '#fff' } }} />
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-6">
          <div>
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 text-sm font-bold uppercase tracking-wider transition-colors">
              <ChevronLeft size={16} /> Dashboard
            </Link>
            <h1 className="text-4xl font-black text-white mb-1">{venue.name}</h1>
            <p className="text-gray-400 flex items-center gap-2 text-sm">
              <span className="text-[#C6FF00]">📍</span> {venue.location}, {venue.city}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-xl hover:bg-white/5 transition-colors font-bold text-xs uppercase tracking-wide">
              <Edit size={14} /> Edit Details
            </button>
            <Link href="/upload" className="flex items-center gap-2 px-4 py-2 bg-[#C6FF00] text-[#263238] rounded-xl hover:bg-white transition-colors font-bold text-xs uppercase tracking-wide shadow-lg shadow-[#C6FF00]/10">
              <Video size={14} /> Update Video
            </Link>
          </div>
        </div>

        {/* ACTIVE OPPORTUNITIES */}
        <div 
          onClick={() => router.push(`/dashboard/enquiries?status=Pending&venue_id=${venue.id}`)}
          className={`cursor-pointer rounded-2xl p-1 border-l-4 hover:brightness-110 transition-all ${pendingBookings.length > 0 ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500' : 'bg-gradient-to-r from-emerald-500/10 to-transparent border-emerald-500'}`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${pendingBookings.length > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                {pendingBookings.length > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {pendingBookings.length} Active Enquiries 
                  {urgentPending.length > 0 && <span className="text-red-400 ml-2 text-sm font-medium">({urgentPending.length} need attention)</span>}
                </h3>
                <p className="text-sm text-gray-400">{pendingBookings.length > 0 ? "Potential revenue waiting for your approval." : "You are all caught up!"}</p>
              </div>
            </div>
            <div className="flex gap-6 text-right">
              <div><p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Resp. Rate</p><p className="text-lg font-bold text-white">94%</p></div>
              <div><p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Avg Time</p><p className="text-lg font-bold text-[#C6FF00]">2.4h</p></div>
              <div><p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Conv. Rate</p><p className="text-lg font-bold text-emerald-400">{inquiryToBookingRate}%</p></div>
            </div>
          </div>
        </div>

        {/* REVENUE FUNNEL */}
        <div className="bg-[#37474F]/50 border border-white/5 rounded-3xl p-8 relative overflow-hidden">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Revenue Funnel (30 Days)</h3>
          <div className="flex flex-col md:flex-row justify-between items-center relative z-10">
            <div className="text-center w-full group cursor-pointer hover:bg-white/5 p-4 rounded-xl transition-all">
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">Total Views</p>
              <p className="text-3xl font-black text-white group-hover:text-[#C6FF00] transition-colors">{totalViews}</p>
            </div>
            <ArrowRight className="text-gray-600 hidden md:block" />
            <div onClick={() => router.push(`/dashboard/enquiries?status=All&venue_id=${venue.id}`)} className="text-center w-full group cursor-pointer hover:bg-white/5 p-4 rounded-xl transition-all">
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">Enquiries</p>
              <p className="text-3xl font-black text-white group-hover:text-[#C6FF00] transition-colors">{totalInquiries}</p>
            </div>
            <ArrowRight className="text-gray-600 hidden md:block" />
            <div onClick={() => router.push(`/dashboard/enquiries?status=Approved&venue_id=${venue.id}`)} className="text-center w-full group cursor-pointer hover:bg-white/5 p-4 rounded-xl transition-all">
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">Booked</p>
              <p className="text-3xl font-black text-white group-hover:text-[#C6FF00] transition-colors">{approvedBookings.length}</p>
            </div>
            <ArrowRight className="text-gray-600 hidden md:block" />
            <div className="text-center w-full group cursor-pointer hover:bg-[#C6FF00]/10 p-4 rounded-xl transition-all border border-transparent hover:border-[#C6FF00]/30">
              <p className="text-xs text-[#C6FF00] font-bold uppercase mb-2">Earnings</p>
              <p className="text-3xl font-black text-[#C6FF00]">₹{totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* COMPLIANCE & USE CASES */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#37474F] border border-white/10 rounded-3xl p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-bold text-white">Compliance Health</h3>
              <button className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">Schedule Inspection</button>
            </div>
            <div className="space-y-4">
              <ComplianceItem label="NFPA 70 (Electrical)" status={venue.nfpa70_status} date="Jan 15, 2026" />
              <ComplianceItem label="NFPA 101 (Fire Safety)" status={venue.nfpa101_status} date="Jan 20, 2026" />
            </div>
          </div>
          <div className="bg-[#37474F] border border-white/10 rounded-3xl p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-bold text-white">Best Fit Matches</h3>
              <button className="text-xs font-bold text-[#C6FF00] hover:text-white transition-colors">Update Use Cases</button>
            </div>
            <div className="space-y-3">
              {(venue.use_case_tags?.primary || ['General']).slice(0, 3).map((tag, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300 capitalize">{tag.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-black/30 rounded-full overflow-hidden"><div className="h-full bg-[#C6FF00]" style={{ width: `${95 - (i * 15)}%` }} /></div>
                    <span className="text-xs font-bold text-white">{95 - (i * 15)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RADAR & STRATEGY */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-[#37474F] border border-white/10 rounded-3xl p-6 relative flex flex-col justify-center">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">Venue Diagnostics</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded border ${radarStats.safety >= 6 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>{radarStats.safety >= 6 ? 'Healthy' : 'Action Req'}</span>
            </div>
            <VenueRadarChart stats={radarStats} viewMode="planner" className="w-full aspect-square" />
          </div>
          <div className="lg:col-span-2 bg-gradient-to-br from-[#37474F] to-[#263238] border border-[#C6FF00]/30 rounded-3xl p-6 relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Lightbulb size={100} /></div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Sparkles className="text-[#C6FF00]" size={20} /> Optimization & Strategy</h3>
              <span className="text-xs font-bold text-gray-500 bg-black/20 px-2 py-1 rounded border border-white/5">{opportunities.length} Insights</span>
            </div>
            <div className="space-y-4 relative z-10">
              {visibleOpportunities.map((opp, i) => (
                <div key={i} className={`bg-black/20 p-4 rounded-xl border-l-4 ${opp.color} flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-lg`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {opp.icon} <span className={`font-bold text-[10px] uppercase tracking-widest ${opp.color.split(' ')[1]}`}>{opp.type}</span> <h4 className="text-white font-bold">{opp.title}</h4>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{opp.description}</p>
                  </div>
                  <div className="text-right min-w-[120px]"><p className="text-xs text-gray-500 uppercase font-bold">Est. Impact</p><p className="text-[#C6FF00] font-bold">{opp.impact}</p></div>
                </div>
              ))}
            </div>
            {opportunities.length > 3 && (
              <button onClick={() => setShowAllOpportunities(!showAllOpportunities)} className="w-full mt-4 py-3 text-xs font-bold text-gray-400 hover:text-white flex items-center justify-center gap-1 transition-colors uppercase tracking-widest border border-white/5 rounded-lg hover:bg-white/5">
                {showAllOpportunities ? <>Show Less <ChevronUp size={14} /></> : <>View All {opportunities.length} Insights <ChevronDown size={14} /></>}
              </button>
            )}
            <button className="w-full mt-6 py-3 bg-[#C6FF00]/10 border border-[#C6FF00]/50 text-[#C6FF00] rounded-xl text-sm font-bold hover:bg-[#C6FF00] hover:text-[#263238] transition-all flex items-center justify-center gap-2">Apply Improvements <ArrowRight size={16} /></button>
          </div>
        </div>

        {/* GALLERY */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <div><h3 className="text-xl font-bold text-white">Visual Assets</h3><p className="text-sm text-gray-400">Photos drive 80% of booking decisions.</p></div>
            <button onClick={() => setIsGalleryOpen(true)} className="text-sm font-bold text-[#C6FF00] hover:text-white transition-colors">Manage Gallery</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#C6FF00] group cursor-pointer">
              <Image src={venue.venue_image_url || venue.photos?.[0] || '/placeholder.jpg'} fill alt="Cover" className="object-cover" unoptimized />
              <div className="absolute top-2 left-2 bg-[#C6FF00] text-[#263238] text-[10px] font-black px-2 py-0.5 rounded uppercase">Cover</div>
            </div>
            {venue.photos?.filter(p => p !== venue.venue_image_url).slice(0, 5).map((photo, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group cursor-pointer">
                <Image src={photo} fill alt="Gallery" className="object-cover" unoptimized />
              </div>
            ))}
            <div onClick={() => setIsGalleryOpen(true)} className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 hover:text-[#C6FF00] hover:border-[#C6FF00] transition-all cursor-pointer">
              <Camera size={24} className="mb-2" /><span className="text-[10px] font-bold uppercase">Add Photo</span>
            </div>
          </div>
        </section>

        {/* PERFORMANCE TRENDS */}
        <div className="bg-[#37474F]/50 border border-white/5 rounded-3xl p-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div><h3 className="text-lg font-bold text-white mb-1">Performance Trends</h3><p className="text-xs text-gray-400">Real-time Inquiries & Revenue</p></div>
            <div className="flex bg-black/20 rounded-lg p-1">
              {(['7d', '30d', '3m'] as const).map((range) => (
                <button key={range} onClick={() => setTimeRange(range)} className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-colors ${timeRange === range ? 'bg-[#C6FF00] text-[#263238]' : 'text-gray-400 hover:text-white'}`}>{range}</button>
              ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorEarn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C6FF00" stopOpacity={0.3}/><stop offset="95%" stopColor="#C6FF00" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#263238', border: '1px solid #37474F', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value: any, name: any) => [name === 'Earnings' && typeof value === 'number' ? `₹${value.toLocaleString()}` : value, name === 'value' ? 'Est. Views' : name]}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '0.5rem' }}
                />
                <Area type="monotone" dataKey="value" name="Est. Views" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="earnings" name="Earnings" stroke="#C6FF00" strokeWidth={2} fillOpacity={1} fill="url(#colorEarn)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* MODALS */}
      {isEditModalOpen && venue && <EditVenueModal venue={venue} onClose={() => setIsEditModalOpen(false)} onSuccess={loadVenueData} />}
      {isGalleryOpen && venue && <ManageGalleryPanel venue={venue} onClose={() => setIsGalleryOpen(false)} onSuccess={loadVenueData} />}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ComplianceItem({ label, status, date }: { label: string, status: string, date: string }) {
  const isCompliant = status === 'compliant';
  return (
    <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-full ${isCompliant ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>{isCompliant ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}</div>
        <div><p className="text-sm font-bold text-white">{label}</p><p className="text-[10px] text-gray-500">Last checked: {date}</p></div>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wide ${isCompliant ? 'text-emerald-500' : 'text-amber-500'}`}>{status?.replace('_', ' ')}</span>
    </div>
  );
}

// --- UPDATED EDIT MODAL WITH SHARED CITIES ---
function EditVenueModal({ venue, onClose, onSuccess }: { venue: VenueData, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: venue.name,
    location: venue.location,
    address: venue.address || '',
    city: venue.city,
    price_per_hour: venue.price_per_hour
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('venues').update(formData).eq('id', venue.id);
      if (error) throw error;
      toast.success('Venue Updated');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#37474F] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl relative z-10 p-6 animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
        <h2 className="text-xl font-bold text-white mb-6">Edit Venue Details</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-xs font-bold text-gray-400 uppercase">Venue Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C6FF00] outline-none mt-1" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-gray-400 uppercase">Location</label><input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C6FF00] outline-none mt-1" /></div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">City</label>
              {/* UPDATED TO USE SHARED CITIES LIST */}
              <select value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C6FF00] outline-none mt-1">
                {INDIAN_CITIES.map((c) => (
                  <option key={c} value={c} className="bg-[#37474F] text-white">{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div><label className="text-xs font-bold text-gray-400 uppercase">Full Address</label><div className="relative mt-1"><MapPin className="absolute left-3 top-3.5 text-gray-500" size={16} /><input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white focus:border-[#C6FF00] outline-none" /></div></div>
          <div><label className="text-xs font-bold text-gray-400 uppercase">Hourly Rate (₹)</label><input type="number" value={formData.price_per_hour} onChange={e => setFormData({...formData, price_per_hour: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C6FF00] outline-none mt-1" /></div>
          <button type="submit" disabled={saving} className="w-full py-3 bg-[#C6FF00] text-[#263238] rounded-xl font-bold mt-4 hover:bg-white transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  );
}

// --- GALLERY MANAGEMENT MODAL ---
function ManageGalleryPanel({ venue, onClose, onSuccess }: { venue: VenueData, onClose: () => void, onSuccess: () => void }) {
  const [photos, setPhotos] = useState<string[]>(venue.photos || []);
  const [cover, setCover] = useState(venue.venue_image_url || venue.photos?.[0]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewFiles(prev => [...prev, ...files]);
      const urls = files.map(f => URL.createObjectURL(f));
      setPreviews(prev => [...prev, ...urls]);
    }
  };

  const handleRemoveExisting = async (url: string) => {
    if(!confirm("Remove this photo?")) return;
    const updatedPhotos = photos.filter(p => p !== url);
    setPhotos(updatedPhotos);
    if (url === cover && updatedPhotos.length > 0) setCover(updatedPhotos[0]);
    await supabase.from('venues').update({ photos: updatedPhotos, venue_image_url: url === cover ? updatedPhotos[0] : cover }).eq('id', venue.id);
    onSuccess();
  };

  const handleRemoveNew = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSetCover = async (url: string) => {
    setCover(url);
    await supabase.from('venues').update({ venue_image_url: url }).eq('id', venue.id);
    toast.success("Cover updated");
    onSuccess();
  };

  const handleSaveUploads = async () => {
    if (newFiles.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('shortDescription', venue.description || ''); 
    newFiles.forEach(f => formData.append('photos', f));
    try {
      const res = await fetch(`/api/venues/${venue.id}/photos`, { method: 'POST', body: formData });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Photos uploaded");
      setNewFiles([]);
      setPreviews([]);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-[#263238] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#37474F]">
          <h2 className="text-lg font-bold text-white">Manage Gallery</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white" /></button>
        </div>
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          <div className="bg-black/20 p-4 rounded-xl border border-dashed border-white/20">
             <label className="flex flex-col items-center justify-center h-24 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"><input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} /><ImageIcon className="text-[#C6FF00] mb-2" /><span className="text-xs font-bold text-gray-400 uppercase">Click to Add Photos</span></label>
             {previews.length > 0 && (
               <div className="mt-4 grid grid-cols-3 gap-2">
                 {previews.map((url, i) => (
                   <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-[#C6FF00]/50"><Image src={url} fill alt="New" className="object-cover" unoptimized /><button onClick={() => handleRemoveNew(i)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full hover:bg-red-500"><X size={10} /></button></div>
                 ))}
               </div>
             )}
             {newFiles.length > 0 && <button onClick={handleSaveUploads} disabled={uploading} className="w-full mt-4 py-2 bg-[#C6FF00] text-[#263238] text-xs font-bold rounded-lg flex items-center justify-center gap-2">{uploading ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Upload New Photos</button>}
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Current Assets</h3>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((url, i) => (
                <div key={i} className={`relative aspect-square rounded-xl overflow-hidden group border-2 ${url === cover ? 'border-[#C6FF00]' : 'border-transparent'}`}>
                  <Image src={url} fill alt="Gallery" className="object-cover" unoptimized />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    {url !== cover && <button onClick={() => handleSetCover(url)} className="text-[10px] font-bold bg-[#C6FF00] text-[#263238] px-2 py-1 rounded uppercase">Set Cover</button>}
                    <button onClick={() => handleRemoveExisting(url)} className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-1 rounded uppercase hover:bg-red-500 hover:text-white transition-colors">Delete</button>
                  </div>
                  {url === cover && <div className="absolute top-2 left-2 bg-[#C6FF00] text-[#263238] text-[10px] font-black px-2 py-0.5 rounded uppercase">Cover</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}