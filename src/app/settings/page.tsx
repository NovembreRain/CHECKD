'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { 
  Camera, User, Mail, Phone, MapPin, Lock, Trash2, 
  Loader2, Save
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form Data
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    city: 'Mumbai',
    allowGlobalBookings: true
  });

  // Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // --- 1. LOAD DATA ---
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      setAvatarUrl(user.user_metadata?.avatar_url || null);
      setFormData({
        fullName: user.user_metadata?.full_name || '',
        phone: user.user_metadata?.phone || '',
        city: user.user_metadata?.city || 'Mumbai',
        allowGlobalBookings: user.user_metadata?.allow_global_bookings ?? true,
      });
      setLoading(false);
    }
  }, [user, authLoading, router]);

  // --- 2. AVATAR UPLOAD ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    
    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    try {
      // Upload to 'user-profiles' bucket
      const { error: uploadError } = await supabase.storage
        .from('user-profiles')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-profiles')
        .getPublicUrl(fileName);

      // Update Local State & Metadata immediately
      setAvatarUrl(publicUrl);
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });
      
      toast.success("Profile picture updated", { icon: '📸' });

    } catch (error: any) {
      console.error(error);
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // --- 3. SAVE PROFILE ---
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          phone: formData.phone,
          city: formData.city,
          allow_global_bookings: formData.allowGlobalBookings
        }
      });

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error("Update failed: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- 4. CHANGE PASSWORD ---
  const handleChangePassword = async () => {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated!");
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading || authLoading) {
    return <div className="min-h-screen bg-[#263238] flex items-center justify-center text-[#C6FF00]"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#263238] text-white pt-24 pb-20 px-6">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#37474F', color: '#fff' } }} />
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-2">Account Settings</h1>
        <p className="text-gray-400 mb-8">Manage your profile, security, and preferences.</p>

        {/* --- MAIN CARD --- */}
        <div className="bg-[#37474F] border border-white/10 rounded-3xl p-8 space-y-8 shadow-xl">
          
          {/* 1. Profile Picture */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 group-hover:border-[#C6FF00] transition-all bg-black/20 relative">
                {uploading ? (
                  <div className="w-full h-full flex items-center justify-center text-[#C6FF00]"><Loader2 className="animate-spin" /></div>
                ) : avatarUrl ? (
                  <Image 
                    src={avatarUrl} 
                    alt="Avatar" 
                    fill 
                    className="object-cover" 
                    unoptimized // <--- FIX APPLIED HERE
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500"><User size={48} /></div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 p-2 bg-[#C6FF00] text-[#263238] rounded-full border-4 border-[#37474F]">
                <Camera size={16} />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="mt-3 text-sm text-gray-400 font-medium">Click to change avatar</p>
          </div>

          <div className="h-px bg-white/5" />

          {/* 2. Personal Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <User size={18} className="text-[#C6FF00]" /> Personal Details
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Full Name</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C6FF00] outline-none"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Email Address</label>
                <div className="flex items-center gap-2 w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed">
                  <Mail size={16} />
                  <span>{user?.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute top-3.5 left-4 text-gray-500" />
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91 99999 99999"
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-[#C6FF00] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">City</label>
                <div className="relative">
                  <MapPin size={16} className="absolute top-3.5 left-4 text-gray-500" />
                  <select 
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-[#C6FF00] outline-none appearance-none cursor-pointer"
                  >
                    {['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Goa'].map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* 3. Security */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Lock size={18} className="text-[#C6FF00]" /> Security & Privacy
            </h3>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
              <div>
                <p className="font-bold text-white text-sm">Password</p>
                <p className="text-xs text-gray-400">Last changed: Never</p>
              </div>
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 border border-white/20 rounded-lg text-xs font-bold hover:bg-white/5 transition-colors"
              >
                Change Password
              </button>
            </div>

            <label className="flex items-center gap-3 p-4 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:border-[#C6FF00]/30 transition-colors">
              <input 
                type="checkbox" 
                checked={formData.allowGlobalBookings}
                onChange={(e) => setFormData({...formData, allowGlobalBookings: e.target.checked})}
                className="w-5 h-5 rounded border-gray-600 text-[#C6FF00] focus:ring-[#C6FF00]"
              />
              <div>
                <p className="font-bold text-white text-sm">Allow Global Bookings</p>
                <p className="text-xs text-gray-400">Show my profile to planners outside my city</p>
              </div>
            </label>
          </div>

          {/* 4. Actions */}
          <div className="pt-4 flex flex-col md:flex-row items-center gap-4 justify-between">
            <button className="text-red-400 text-xs font-bold flex items-center gap-2 hover:text-red-300 transition-colors">
              <Trash2 size={14} /> Delete Account
            </button>
            
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto px-8 py-3 bg-[#C6FF00] text-[#263238] rounded-xl font-bold hover:bg-white transition-all shadow-[0_0_20px_-5px_rgba(198,255,0,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Changes
            </button>
          </div>

        </div>
      </div>

      {/* --- PASSWORD MODAL --- */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#37474F] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Change Password</h3>
            <input 
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password (min 6 chars)"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:border-[#C6FF00] outline-none"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 py-3 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={handleChangePassword}
                className="flex-1 py-3 bg-[#C6FF00] text-[#263238] rounded-xl text-sm font-bold hover:bg-white"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}