"use client";

import { getAqiColor } from "@/lib/aqi";

interface DayData {
  day: string;
  date: string;
  peak: number;
  description: string;
}

const mockHistory: DayData[] = [
  { day: "Mon", date: "Jun 9", peak: 32, description: "Clean air all day" },
  { day: "Tue", date: "Jun 10", peak: 45, description: "Light breeze kept it fresh" },
  { day: "Wed", date: "Jun 11", peak: 78, description: "Moderate — traffic spike at 8am" },
  { day: "Thu", date: "Jun 12", peak: 55, description: "Mild pollen in the afternoon" },
  { day: "Fri", date: "Jun 13", peak: 112, description: "Worst spike at 3pm near A-road" },
  { day: "Sat", date: "Jun 14", peak: 28, description: "Best day this week" },
  { day: "Sun", date: "Jun 15", peak: 41, description: "Light cloud kept things calm" },
];

export default function HistoryView() {
  const maxPeak = Math.max(...mockHistory.map((d) => d.peak));
  const best = mockHistory.reduce((a, b) => (a.peak < b.peak ? a : b));
  const worst = mockHistory.reduce((a, b) => (a.peak > b.peak ? a : b));

  return (
    <div className="tab-content-enter px-4 pb-28">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-ink">7-Day History</h2>
        <span className="text-[10px] font-medium bg-amber-yellow/15 text-amber-yellow/80 rounded-full px-2 py-0.5">
          Demo
        </span>
      </div>
      <p className="text-sm text-muted mb-6">Air quality trends for your area</p>

      {/* Bar chart */}
      <div className="bg-surface border border-border rounded-2xl p-5 mb-5">
        <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
          {mockHistory.map((d, i) => {
            const height = Math.max((d.peak / maxPeak) * 130, 12);
            return (
              <div key={i} className="flex flex-col items-center flex-1 gap-1.5">
                <span className="text-xs font-medium text-muted">{d.peak}</span>
                <div
                  className="bar-grow w-full rounded-t-lg"
                  style={{
                    height,
                    backgroundColor: getAqiColor(d.peak),
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
                <span className="text-xs text-muted/60">{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Callouts */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-clean-air/15 border border-clean-air/20 rounded-xl p-3">
          <div className="text-xs font-medium text-bair-green mb-1">Best Day</div>
          <div className="text-sm font-bold text-ink">{best.day} — AQI {best.peak}</div>
        </div>
        <div className="bg-aqi-orange/15 border border-aqi-orange/20 rounded-xl p-3">
          <div className="text-xs font-medium text-aqi-orange mb-1">Worst Spike</div>
          <div className="text-sm font-bold text-ink">{worst.day} — AQI {worst.peak}</div>
        </div>
      </div>

      {/* Daily log */}
      <div className="flex flex-col gap-2">
        {mockHistory.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3"
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: getAqiColor(d.peak) }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink">
                {d.day}, {d.date}
              </div>
              <div className="text-xs text-muted truncate">{d.description}</div>
            </div>
            <div className="text-sm font-bold" style={{ color: getAqiColor(d.peak) }}>
              {d.peak}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
