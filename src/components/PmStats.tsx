"use client";

interface PmStatsProps {
  pm25: number;
  pm10: number;
}

export default function PmStats({ pm25, pm10 }: PmStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm text-center">
        <div className="text-xs font-medium text-forest-night/50 uppercase tracking-wider">PM2.5</div>
        <div className="text-2xl font-bold text-forest-night mt-0.5">{pm25}</div>
        <div className="text-xs text-forest-night/40">µg/m³</div>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm text-center">
        <div className="text-xs font-medium text-forest-night/50 uppercase tracking-wider">PM10</div>
        <div className="text-2xl font-bold text-forest-night mt-0.5">{pm10}</div>
        <div className="text-xs text-forest-night/40">µg/m³</div>
      </div>
    </div>
  );
}
