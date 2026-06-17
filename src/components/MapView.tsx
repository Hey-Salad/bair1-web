"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getAqiColor } from "@/lib/aqi";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-0.06, 51.525],
      zoom: 13,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      mockSensors.forEach((sensor) => {
        const color = getAqiColor(sensor.aqi);

        const el = document.createElement("div");
        el.className = "bair1-marker";
        el.style.cssText = `
          width: 36px; height: 36px; border-radius: 50%;
          background: ${color}; border: 3px solid rgba(255,255,255,0.9);
          box-shadow: 0 0 12px ${color}, 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #fff;
          cursor: pointer; transition: transform 0.15s;
        `;
        el.textContent = String(sensor.aqi);
        el.onmouseenter = () => (el.style.transform = "scale(1.2)");
        el.onmouseleave = () => (el.style.transform = "scale(1)");

        new mapboxgl.Marker({ element: el })
          .setLngLat([sensor.lng, sensor.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
              <div style="font-family: system-ui; padding: 4px 0;">
                <div style="font-weight: 700; font-size: 14px;">${sensor.name}</div>
                <div style="font-size: 12px; color: #666; margin-top: 2px;">AQI ${sensor.aqi} · ${sensor.distance} away</div>
                <div style="font-size: 11px; color: #999; margin-top: 2px;">Updated ${sensor.lastUpdated}</div>
              </div>
            `)
          )
          .addTo(map.current!);
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="tab-content-enter px-4 pb-28">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Sensor Map</h2>
        <span className="text-[10px] font-medium bg-amber-yellow/15 text-amber-yellow/80 rounded-full px-2 py-0.5">
          Demo
        </span>
      </div>
      <p className="text-sm text-forest-night/50 mb-4">Air quality sensors near you — London</p>

      {/* Mapbox map */}
      {MAPBOX_TOKEN ? (
        <div ref={mapContainer} className="rounded-2xl overflow-hidden mb-4" style={{ height: 320 }} />
      ) : (
        <div className="bg-forest-night/5 rounded-2xl flex items-center justify-center mb-4" style={{ height: 320 }}>
          <p className="text-sm text-muted">Map token not configured</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 mb-4 justify-center">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-forest-night/60">{l.label}</span>
          </div>
        ))}
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
