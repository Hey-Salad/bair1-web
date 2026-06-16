"use client";

import { getAqiColor } from "@/lib/aqi";

interface SensorPin {
  id: string;
  name: string;
  aqi: number;
  lat: number;
  lng: number;
  distance: string;
  lastUpdated: string;
}

const mockSensors: SensorPin[] = [
  { id: "1", name: "Shoreditch High St", aqi: 42, lat: 51.523, lng: -0.077, distance: "0.3km", lastUpdated: "2m ago" },
  { id: "2", name: "Victoria Park", aqi: 28, lat: 51.536, lng: -0.039, distance: "1.2km", lastUpdated: "1m ago" },
  { id: "3", name: "Old Street", aqi: 67, lat: 51.526, lng: -0.088, distance: "0.8km", lastUpdated: "3m ago" },
  { id: "4", name: "Mile End Road", aqi: 85, lat: 51.522, lng: -0.035, distance: "1.5km", lastUpdated: "1m ago" },
  { id: "5", name: "Bethnal Green", aqi: 51, lat: 51.527, lng: -0.055, distance: "0.6km", lastUpdated: "2m ago" },
  { id: "6", name: "Liverpool Street", aqi: 73, lat: 51.518, lng: -0.082, distance: "1.1km", lastUpdated: "4m ago" },
];

const legend = [
  { label: "Good", color: "#8DC44A", range: "0–50" },
  { label: "Moderate", color: "#F5C542", range: "51–100" },
  { label: "Sensitive", color: "#ED8B00", range: "101–150" },
  { label: "Unhealthy", color: "#D63031", range: "151+" },
];

export default function MapView() {
  return (
    <div className="tab-content-enter px-4 pb-28">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Sensor Map</h2>
        <span className="text-[10px] font-medium bg-amber-yellow/15 text-amber-yellow/80 rounded-full px-2 py-0.5">
          Demo
        </span>
      </div>
      <p className="text-sm text-forest-night/50 mb-4">Air quality sensors near you — London</p>

      {/* Map placeholder */}
      <div className="relative bg-forest-night/5 rounded-2xl overflow-hidden mb-4" style={{ height: 280 }}>
        {/* Simulated map with sensor dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Grid lines for map feel */}
            <svg className="absolute inset-0 w-full h-full opacity-10">
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line x1={`${(i + 1) * 20}%`} y1="0" x2={`${(i + 1) * 20}%`} y2="100%" stroke="#1A2410" />
                  <line x1="0" y1={`${(i + 1) * 20}%`} x2="100%" y2={`${(i + 1) * 20}%`} stroke="#1A2410" />
                </g>
              ))}
            </svg>
            {/* Sensor dots positioned pseudo-randomly */}
            {mockSensors.map((sensor, i) => {
              const positions = [
                { x: 35, y: 40 },
                { x: 65, y: 25 },
                { x: 25, y: 60 },
                { x: 75, y: 55 },
                { x: 50, y: 30 },
                { x: 45, y: 70 },
              ];
              const pos = positions[i];
              return (
                <div
                  key={sensor.id}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: getAqiColor(sensor.aqi) }}
                  />
                  <span className="text-[10px] font-medium mt-0.5 bg-white/80 rounded px-1">
                    {sensor.aqi}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
          <div className="flex gap-3">
            {legend.map((l) => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] font-medium text-forest-night/70">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sensor list */}
      <div className="flex flex-col gap-2">
        {mockSensors.map((sensor) => (
          <div
            key={sensor.id}
            className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
          >
            <div
              className="w-4 h-4 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: getAqiColor(sensor.aqi) }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{sensor.name}</div>
              <div className="text-xs text-forest-night/50">
                {sensor.distance} away · {sensor.lastUpdated}
              </div>
            </div>
            <div className="text-lg font-bold" style={{ color: getAqiColor(sensor.aqi) }}>
              {sensor.aqi}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
