'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import Link from 'next/link';
import { INDIAN_CITIES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import {
  UploadCloud, Video, Loader2, Terminal, CheckCircle2, MapPin, Lock
} from 'lucide-react';

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const { setMode } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (user && !authLoading) setMode('owner');
  }, [user, authLoading, setMode]);

  const [file, setFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const [venueName, setVenueName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [price, setPrice] = useState('');

  const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !venueName || !address || !user) return;

    setUploadLoading(true);
    setLogs([]);
    addLog(`Initializing System...`);
    addLog(`Target: ${venueName}`);

    let tempFilePath = '';

    try {
      addLog(`Reading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

      // Upload to Supabase temp storage
      const fileExt = file.name.split('.').pop();
      const fileName = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      tempFilePath = `temp-analysis/${fileName}`;

      addLog(`Stream encrypted. Uploading to secure staging...`);

      const { error: uploadError } = await supabase.storage
        .from('venues')
        .upload(tempFilePath, file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('venues')
        .getPublicUrl(tempFilePath);

      addLog(`Analyzing frames for NFPA compliance...`);

      // Call API with URL
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          videoUrl: publicUrl,
          tempFilePath: tempFilePath, // Pass this so API can delete it
          venueName,
          location,
          address,
          city,
          price
        })
      });

      if (!response.ok) {
        // Clean up on error
        await supabase.storage.from('venues').remove([tempFilePath]);
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${errorText}`);
      }

      const data = await response.json();
      if (!data.success) {
        await supabase.storage.from('venues').remove([tempFilePath]);
        throw new Error(data.error);
      }

      addLog(`SUCCESS. Venue ID: ${data.venue.id}`);
      addLog(`Redirecting to Photo Lab...`);

      setTimeout(() => {
        router.push(`/venue/${data.venue.id}/photos`);
      }, 1500);

    } catch (error: any) {
      addLog(`ERROR: ${error.message}`);
      // Clean up temp file on error
      if (tempFilePath) {
        await supabase.storage.from('venues').remove([tempFilePath]);
      }
      setUploadLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#263238] text-[#C6FF00]"><Loader2 className="animate-spin h-8 w-8" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#263238] p-4">
        <div className="max-w-md w-full bg-[#1e272c] border border-red-500/20 rounded-xl p-8 text-center">
          <Lock size={24} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Log in to access the secure upload terminal.</p>
          <Link href="/auth/login?next=/upload" className="block w-full py-3 px-4 bg-[#C6FF00] text-[#263238] font-bold rounded-md hover:bg-white uppercase text-sm">Authenticate Identity</Link>
        </div>
      </div>
    );
  }

  if (uploadLoading) {
    return (
      <div className="min-h-screen bg-[#263238] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-black rounded-xl border border-[#C6FF00]/30 shadow-[0_0_50px_-10px_rgba(198,255,0,0.15)] overflow-hidden font-mono text-sm relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#C6FF00]/5 to-transparent h-4 w-full animate-scan pointer-events-none" />
          <div className="bg-[#1a1a1a] px-4 py-2 flex items-center gap-2 border-b border-white/10">
            <Terminal size={14} className="text-[#C6FF00]" />
            <span className="text-gray-400">CHECKD_AI_AGENT_V3.exe</span>
          </div>
          <div className="p-6 h-[400px] overflow-y-auto space-y-2">
            {logs.map((log, i) => <div key={i} className="text-[#C6FF00] animate-pulse-slow">{log}</div>)}
            <div className="w-2 h-4 bg-[#C6FF00] animate-pulse inline-block" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#263238] text-white p-6 flex items-center justify-center pt-24">
      <div className="w-full max-w-5xl grid md:grid-cols-5 gap-8">
        <div className="md:col-span-2 pt-10">
          <h1 className="text-4xl font-black mb-4">Upload <br /><span className="text-[#C6FF00]">Venue</span></h1>
          <p className="text-gray-400 mb-8 leading-relaxed">Initialize a new verification scan. Upload a raw video walkthrough.<br /><br /><span className="text-white font-bold">Note:</span> Address is required for compliance but remains private.</p>
          <div className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={12} className="text-[#C6FF00]" /> <span>Max file size: 100MB</span></div>
        </div>
        <div className="md:col-span-3 bg-[#37474F] rounded-3xl p-8 border border-white/5 shadow-2xl">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Venue Details</label>
              <input type="text" value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Venue Name" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C6FF00] outline-none" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Location</label>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Area (e.g. Bandra)" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C6FF00] outline-none" required />
                <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C6FF00] outline-none appearance-none">
                  {INDIAN_CITIES.map((c) => (<option key={c} value={c} className="bg-[#37474F] text-white">{c}</option>))}
                </select>
              </div>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-[#C6FF00] transition-colors" />
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full Address" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 pl-12 text-white focus:border-[#C6FF00] outline-none" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Pricing</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Cost per hour" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 pl-8 text-white focus:border-[#C6FF00] outline-none" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Walkthrough Video</label>
              <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-[#C6FF00]/50 transition-colors bg-black/10 group cursor-pointer">
                <input type="file" accept="video/mp4,video/quicktime" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="flex flex-col items-center gap-3 pointer-events-none">
                  <UploadCloud size={24} className="text-gray-400 group-hover:text-[#C6FF00]" />
                  <p className="text-sm text-gray-300">{file ? <span className="text-[#C6FF00]">{file.name}</span> : 'Click to browse or drop file'}</p>
                </div>
              </div>
            </div>
            <button type="submit" disabled={!file} className="w-full py-4 bg-[#C6FF00] text-[#263238] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white hover:shadow-[0_0_20px_-5px_rgba(198,255,0,0.5)] transition-all disabled:opacity-50"><Video size={18} /> Start Verification Scan</button>
          </form>
        </div>
      </div>
    </div>
  );
}