'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Plus, TrendingUp, Users, Eye, Search, Filter, 
  MapPin, AlertCircle, ChevronRight, Loader2, Calendar, DollarSign
} from 'lucide-react';

interface DashboardVenue {
  id: string;
  name: string;
  location: string;
  city: string;
  venue_image_url?: string;
  photos: string[];
  views_count: number;
  price_per_hour: number;
}

interface DashboardStats {
  totalEarnings: number;
  totalBookings: number;
  totalViews: number;
  pendingCount: number;
}

interface Activity {
  id: string;
  venue_name: string;
  planner_email: string;
  created_at: string;
  status: string;
  guest_count: number;
}

export default function OwnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [venues, setVenues] = useState<DashboardVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ totalEarnings: 0, totalBookings: 0, totalViews: 0, pendingCount: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'earnings' | 'views' | 'name'>('earnings');
  const [venueStats, setVenueStats] = useState<Record<string, { earnings: number; pending: number }>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) loadDashboardData(user.id);
  }, [user, authLoading, router]);

  const loadDashboardData = async (userId: string) => {
    try {
      // ARCHITECT FIX: Use Promise.all to fetch both requests in parallel
      // This cuts load time significantly by running them at the same time
      const [venuesResponse, bookingsResponse] = await Promise.all([
        supabase
          .from('venues')
          .select('*')
          .eq('owner_id', userId),
        
        supabase
          .from('bookings')
          .select(`
            id, status, start_date, end_date, created_at, guest_count, venue_id, planner_email,
            venue:venues (name, price_per_hour)
          `)
          .eq('owner_id', userId)
          .order('created_at', { ascending: false })
      ]);

      // Check for errors in either request
      if (venuesResponse.error) throw venuesResponse.error;
      if (bookingsResponse.error) throw bookingsResponse.error;

      const venuesData = venuesResponse.data || [];
      const bookingsData = bookingsResponse.data || [];

      setVenues(venuesData);

      // --- Calculation Logic (Same as before) ---
      let earnings = 0;
      let approvedCount = 0;
      let pendingTotal = 0;
      let viewsTotal = 0;
      const vStats: Record<string, { earnings: number; pending: number }> = {};

      venuesData.forEach(v => {
        viewsTotal += (v.views_count || 0);
        vStats[v.id] = { earnings: 0, pending: 0 };
      });

      bookingsData.forEach(b => {
        const start = new Date(b.start_date).getTime();
        const end = new Date(b.end_date).getTime();
        const hours = (end - start) / (1000 * 60 * 60);
        // @ts-ignore
        const price = (b.venue?.price_per_hour || 0) * hours;

        if (b.status === 'APPROVED') {
          earnings += price;
          approvedCount++;
          if (vStats[b.venue_id]) vStats[b.venue_id].earnings += price;
        }
        
        if (b.status === 'PENDING') {
          pendingTotal++;
          if (vStats[b.venue_id]) vStats[b.venue_id].pending += 1;
        }
      });

      setStats({
        totalEarnings: Math.round(earnings),
        totalBookings: approvedCount,
        totalViews: viewsTotal,
        pendingCount: pendingTotal
      });

      setVenueStats(vStats);

      const recent = bookingsData.slice(0, 3).map((b: any) => ({
        id: b.id,
        venue_name: b.venue?.name,
        planner_email: b.planner_email || 'Guest',
        created_at: b.created_at,
        status: b.status,
        guest_count: b.guest_count
      }));
      setActivities(recent);

    } catch (error: any) {
      // Better error logging to see the actual message instead of {}
      console.error("Dashboard Load Error:", error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVenues = venues
    .filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'earnings') return (venueStats[b.id]?.earnings || 0) - (venueStats[a.id]?.earnings || 0);
      if (sortBy === 'views') return (b.views_count || 0) - (a.views_count || 0);
      return a.name.localeCompare(b.name);
    });

  if (loading || authLoading) return <div className="min-h-screen bg-[#263238] flex items-center justify-center text-[#C6FF00]"><Loader2 className="animate-spin h-8 w-8" /></div>;

  return (
    <div className="min-h-screen bg-[#263238] text-white p-6 pt-24 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Owner Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Welcome back, <span className="text-[#C6FF00]">{user?.email}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={<DollarSign size={24} />} label="Total Earnings" value={`₹${stats.totalEarnings.toLocaleString()}`} color="text-[#C6FF00]" />
          <StatCard icon={<Calendar size={24} />} label="Approved Bookings" value={stats.totalBookings} color="text-blue-400" />
          <StatCard icon={<Eye size={24} />} label="Total Views" value={stats.totalViews} color="text-emerald-400" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Your Venues</h2>
              <div className="flex gap-2">
                <div className="relative group">
                  <Search className="absolute left-3 top-2.5 text-gray-500 w-4 h-4 group-focus-within:text-[#C6FF00] transition-colors" />
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-[#37474F] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-[#C6FF00] outline-none w-32 md:w-64 transition-all" />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-[#37474F] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-[#C6FF00] outline-none appearance-none cursor-pointer">
                    <option value="earnings">Earnings</option>
                    <option value="views">Views</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {filteredVenues.length > 0 ? (
                filteredVenues.map(venue => <OwnerVenueCard key={venue.id} venue={venue} stats={venueStats[venue.id]} />)
              ) : (
                <div className="col-span-2 py-12 text-center text-gray-500 bg-[#37474F]/30 rounded-2xl border border-white/5 border-dashed">No venues found.</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#37474F] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-bold text-white mb-1">Enquiries</h3>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-4xl font-black text-[#C6FF00]">{stats.pendingCount}</span>
                  <span className="text-gray-400 text-sm mb-1">pending requests</span>
                </div>
                <Link href="/dashboard/enquiries" className="w-full py-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center gap-2 text-sm font-bold hover:bg-[#C6FF00] hover:text-[#263238] transition-all">
                  Manage Requests <ChevronRight size={16} />
                </Link>
              </div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#C6FF00]/10 rounded-full blur-2xl" />
            </div>

            <div className="bg-[#37474F]/50 border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {activities.length > 0 ? activities.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                    <div className={`mt-1 w-2 h-2 rounded-full ${activity.status === 'APPROVED' ? 'bg-[#C6FF00]' : 'bg-amber-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-white line-clamp-1">
                        {activity.status === 'PENDING' ? 'New Request' : 'Booking Approved'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        <span className="text-white font-bold">{activity.planner_email.split('@')[0]}</span> requested <b>{activity.venue_name}</b>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">{new Date(activity.created_at).toLocaleDateString()} • {activity.guest_count} guests</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 italic">No recent activity.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className="bg-[#37474F]/50 border border-white/5 p-6 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-colors">
      <div className={`mb-4 ${color}`}>{icon}</div>
      <div><div className="text-3xl font-black text-white mb-1">{value}</div><div className="text-xs text-gray-400 font-bold uppercase tracking-widest">{label}</div></div>
    </div>
  );
}

function OwnerVenueCard({ venue, stats }: { venue: DashboardVenue; stats: { earnings: number; pending: number } }) {
  const imageUrl = venue.venue_image_url || (venue.photos ? venue.photos[0] : null);
  return (
    <Link href={`/venue/${venue.id}`} className="block group">
      <div className="bg-[#37474F] rounded-xl overflow-hidden border border-white/5 hover:border-[#C6FF00]/50 transition-all duration-300 hover:shadow-xl flex flex-col h-full">
        <div className="relative h-40 w-full bg-black/50">
          {imageUrl ? (
            <Image 
              src={imageUrl} 
              alt={venue.name} 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              unoptimized // Ensure this is kept!
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
              <span className="text-2xl font-bold text-white/20">{venue.name.charAt(0)}</span>
            </div>
          )}
          {stats?.pending > 0 && <div className="absolute top-3 right-3 bg-amber-500 text-[#263238] px-2 py-1 rounded-md text-xs font-bold shadow-lg flex items-center gap-1 animate-pulse"><AlertCircle size={12} fill="currentColor" /> {stats.pending} Pending</div>}
        </div>
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#C6FF00] transition-colors">{venue.name}</h3>
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-4"><MapPin size={12} /> {venue.location}, {venue.city}</p>
          <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/10">
            <div><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Earnings</p><p className="text-lg font-bold text-white">₹{stats?.earnings.toLocaleString() || 0}</p></div>
            <div className="text-right"><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Views</p><p className="text-sm font-medium text-white">{venue.views_count || 0}</p></div>
          </div>
        </div>
      </div>
    </Link>
  );
}