'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

// Define the shape of the stats object
export interface RadarStats {
  vibe: number;
  safety: number;
  acoustics: number;
  lighting: number;
  spaciousness: number;
  accessibility: number;
}

interface VenueRadarChartProps {
  stats: RadarStats;
  title?: string;
  className?: string;
  viewMode?: 'planner' | 'owner'; // Logic switch
}

export function VenueRadarChart({ 
  stats, 
  title, 
  className = "h-[300px] w-full",
  viewMode = 'planner' 
}: VenueRadarChartProps) {

  // 1. Transform Data for Recharts
  const data = [
    { subject: 'Vibe', A: stats.vibe || 0, fullMark: 10 },
    { subject: 'Safety', A: stats.safety || 0, fullMark: 10 },
    { subject: 'Acoustics', A: stats.acoustics || 0, fullMark: 10 },
    { subject: 'Lighting', A: stats.lighting || 0, fullMark: 10 },
    { subject: 'Space', A: stats.spaciousness || 0, fullMark: 10 },
    { subject: 'Access', A: stats.accessibility || 0, fullMark: 10 },
  ];

  // 2. Identify Critical Issues (Score < 5) for Owners
  const criticalIssues = data.filter(d => d.A < 5);

  // 3. Custom Tick Component to Color-Code Labels
  const CustomTick = ({ payload, x, y, textAnchor, stroke, radius }: any) => {
    const stat = data.find(d => d.subject === payload.value);
    const score = stat?.A || 0;
    
    // Logic: In 'Owner' mode, color low scores RED to grab attention
    let fill = "#9CA3AF"; // Default Gray
    if (viewMode === 'owner') {
      if (score < 5) fill = "#EF4444"; // Red (Warning)
      else if (score >= 8) fill = "#C6FF00"; // Lime (Excellent)
      else fill = "#FFFFFF"; // White (Good)
    } else {
      // Planner Mode: Just nice formatting
      if (score >= 8) fill = "#C6FF00";
    }

    return (
      <g className="recharts-layer recharts-polar-angle-axis-tick">
        <text
          radius={radius}
          stroke={stroke}
          x={x}
          y={y}
          className="text-[10px] font-bold uppercase tracking-wider"
          textAnchor={textAnchor}
          fill={fill}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {title && <h3 className="text-white font-bold mb-2 uppercase tracking-widest text-xs">{title}</h3>}
      
      <div className="w-full h-full min-h-[250px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            {/* The Web Grid */}
            <PolarGrid stroke="#ffffff20" />
            
            {/* The Labels (Customized) */}
            <PolarAngleAxis 
              dataKey="subject" 
              tick={(props) => <CustomTick {...props} />} 
            />
            
            {/* The Axis Line (Hidden but used for scale) */}
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 10]} 
              tick={false} 
              axisLine={false} 
            />
            
            {/* The Shape */}
            <Radar
              name="Venue Score"
              dataKey="A"
              stroke="#C6FF00"
              strokeWidth={2}
              fill="#C6FF00"
              fillOpacity={0.3}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#263238', borderColor: '#37474F', color: '#fff' }}
              itemStyle={{ color: '#C6FF00' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Footer Logic: Owner Recommendations vs Planner Highlights */}
      <div className="w-full mt-4 px-4">
        {viewMode === 'owner' ? (
          // OWNER VIEW: Show Alerts
          <div className="space-y-2">
            {criticalIssues.length > 0 ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase mb-1">
                  <AlertTriangle size={14} /> Attention Needed
                </div>
                <ul className="text-xs text-red-300 list-disc pl-4 space-y-1">
                  {criticalIssues.map(issue => (
                    <li key={issue.subject}>
                      Improve <b>{issue.subject}</b> (Score: {issue.A}/10)
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                <CheckCircle2 size={14} /> All Metrics Healthy
              </div>
            )}
          </div>
        ) : (
          // PLANNER VIEW: Show Highlights
          <div className="flex flex-wrap gap-2 justify-center">
            {data.filter(d => d.A >= 8).map(high => (
              <span key={high.subject} className="px-2 py-1 bg-[#C6FF00]/10 border border-[#C6FF00]/20 text-[#C6FF00] text-[10px] uppercase font-bold rounded">
                High {high.subject}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}