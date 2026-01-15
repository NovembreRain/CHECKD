'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Image as ImageIcon, X, Loader2, Save } from 'lucide-react';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';

export default function PhotoUploadPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venueName, setVenueName] = useState('');
  
  // Editorial Fields
  const [description, setDescription] = useState(''); 
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // 1. Fetch Existing AI Data
  useEffect(() => {
    const fetchVenue = async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('name, description')
        .eq('id', id)
        .single();

      if (data) {
        setVenueName(data.name);
        setDescription(data.description || ''); 
      }
      setLoading(false);
    };
    fetchVenue();
  }, [id]);

  // 2. Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newFiles]);
      
      // Generate Previews
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // 3. Submit Logic (API Route)
  const handleSubmit = async () => {
    if (photos.length === 0) {
      toast.error("Please upload at least 1 photo.");
      return;
    }
    setSaving(true);

    const formData = new FormData();
    formData.append('shortDescription', description); // Send edited text
    photos.forEach(photo => {
      formData.append('photos', photo);
    });

    try {
      const res = await fetch(`/api/venues/${id}/photos`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      toast.success("Listing Published!");
      
      // --- FIX: Redirects to Owner Venue Dashboard instead of Results ---
      router.push(`/venue/${id}`);
      
    } catch (error: any) {
      console.error(error);
      toast.error('Upload failed: ' + error.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#263238] flex items-center justify-center text-[#C6FF00]"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#263238] text-white p-6 pt-24">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#37474F', color: '#fff' } }} />
      
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Final Touches for <span className="text-[#C6FF00]">{venueName}</span></h1>
        <p className="text-gray-400 mb-8">Review the AI-generated description and add photos to complete your listing.</p>

        <div className="space-y-8">
          
          {/* DESCRIPTION EDITOR */}
          <div className="bg-[#37474F]/50 border border-white/5 rounded-2xl p-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Listing Description (AI Generated)
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:border-[#C6FF00] outline-none resize-none leading-relaxed"
              placeholder="Describe your venue..."
            />
            <p className="text-xs text-gray-500 mt-2 text-right">Feel free to edit the AI's suggestion.</p>
          </div>

          {/* PHOTO UPLOAD */}
          <div className="bg-[#37474F]/50 border border-white/5 rounded-2xl p-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Gallery (Min 1)
            </label>
            
            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10">
                  {/* Note: unoptimized is not strictly needed for local blob URLs, but added for consistency */}
                  <Image src={url} alt="Preview" fill className="object-cover" unoptimized />
                  <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {/* Add Button */}
              {previewUrls.length < 10 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-[#C6FF00] hover:bg-[#C6FF00]/5 transition-all group">
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
                  <ImageIcon className="text-gray-500 group-hover:text-[#C6FF00] mb-2" />
                  <span className="text-xs text-gray-500 font-bold uppercase">Add Photo</span>
                </label>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end pt-4">
            <button 
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-[#C6FF00] text-[#263238] font-bold rounded-xl hover:bg-white transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}