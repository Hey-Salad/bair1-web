"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getAqiColor } from "@/lib/aqi";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface SensorPin {
  deviceId: string;
  name: string;
  aqi: number;
  lat: number;
  lng: number;
  location: string;
  status: string;
}

const legend = [
  { label: "Good", color: "#8DC44A", range: "0-50" },
  { label: "Moderate", color: "#F5C542", range: "51-100" },
  { label: "Sensitive", color: "#ED8B00", range: "101-150" },
  { label: "Unhealthy", color: "#D63031", range: "151+" },
];

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [sensors, setSensors] = useState<SensorPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDevices() {
      try {
        const query = `{
          registeredDevices {
            deviceId name location lat lng status
            latestReading { aqi }
          }
        }`;
        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        const devices = json.data?.registeredDevices ?? [];
        const pins: SensorPin[] = devices
          .filter((d: any) => d.lat != null && d.lng != null)
          .map((d: any) => ({
            deviceId: d.deviceId,
            name: d.name,
            aqi: d.latestReading?.aqi ?? 0,
            lat: d.lat,
            lng: d.lng,
            location: d.location,
            status: d.status,
          }));
        setSensors(pins);
      } catch {
        // fail silently
      }
      setLoading(false);
    }
    fetchDevices();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || map.current) return;
    if (loading) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center: [number, number] =
      sensors.length > 0
        ? [sensors[0].lng, sensors[0].lat]
        : [-0.06, 51.525];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom: sensors.length > 0 ? 12 : 13,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      sensors.forEach((sensor) => {
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
                <div style="font-size: 12px; color: #666; margin-top: 2px;">AQI ${sensor.aqi} · ${sensor.location}</div>
                <div style="font-size: 11px; color: #999; margin-top: 2px;">${sensor.deviceId}</div>
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
  }, [loading, sensors]);

  return (
    <div className="tab-content-enter px-4 pb-28">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Sensor Map</h2>
        {sensors.length > 0 && (
          <span className="text-[10px] font-medium bg-bair-green/15 text-bair-green/80 rounded-full px-2 py-0.5">
            {sensors.length} sensor{sensors.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="text-sm text-muted mb-4">
        {sensors.length > 0
          ? "Registered sensors with GPS coordinates"
          : "No sensors with coordinates registered yet"}
      </p>

      {/* Mapbox map */}
      {MAPBOX_TOKEN ? (
        <div
          ref={mapContainer}
          className="rounded-2xl overflow-hidden mb-4"
          style={{ height: 320 }}
        />
      ) : (
        <div
          className="bg-forest-night/5 rounded-2xl flex items-center justify-center mb-4"
          style={{ height: 320 }}
        >
          <p className="text-sm text-muted">Map token not configured</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 mb-4 justify-center">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: l.color }}
            />
            <span className="text-xs text-muted/70">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Sensor list */}
      {sensors.length > 0 && (
        <div className="flex flex-col gap-2">
          {sensors.map((sensor) => (
            <div
              key={sensor.deviceId}
              className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3"
            >
              <div
                className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: getAqiColor(sensor.aqi) }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{sensor.name}</div>
                <div className="text-xs text-muted">
                  {sensor.location} · {sensor.deviceId.slice(-4)}
                </div>
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: getAqiColor(sensor.aqi) }}
              >
                {sensor.aqi}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
