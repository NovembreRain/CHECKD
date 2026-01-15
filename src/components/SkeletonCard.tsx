export function SkeletonCard() {
  return (
    <div className="bg-[#37474F] rounded-2xl overflow-hidden border border-white/5 h-full animate-pulse-slow">
      {/* Image Area */}
      <div className="h-64 bg-white/5 w-full relative">
        <div className="absolute top-4 right-4 w-24 h-6 bg-white/10 rounded-full" />
      </div>
      
      {/* Content Area */}
      <div className="p-5 space-y-4">
        <div className="h-6 bg-white/10 rounded w-3/4" />
        <div className="h-4 bg-white/5 rounded w-1/2" />
        
        {/* Tags */}
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-white/5 rounded" />
          <div className="h-5 w-16 bg-white/5 rounded" />
        </div>
        
        {/* Footer */}
        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
          <div className="space-y-1">
            <div className="h-3 w-8 bg-white/5 rounded" />
            <div className="h-6 w-24 bg-white/10 rounded" />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5" />
        </div>
      </div>
    </div>
  );
}