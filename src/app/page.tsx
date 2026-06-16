"use client";

import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import BearOrb from "@/components/BearOrb";
import GuidanceStrip from "@/components/GuidanceStrip";
import PmStats from "@/components/PmStats";
import Navigation from "@/components/Navigation";
import MapView from "@/components/MapView";
import HistoryView from "@/components/HistoryView";
import AlertsView from "@/components/AlertsView";
import { getAqiState } from "@/lib/aqi";

type Tab = "home" | "map" | "history" | "alerts";

// Mock sensor data — replace with real API calls to bair1.live/api/readings
const MOCK_DATA = {
  aqi: 42,
  pm25: 12.3,
  pm10: 28.7,
  location: "Shoreditch, London",
  lastUpdated: new Date(),
  sensorId: "64E83383EC74",
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [data, setData] = useState(MOCK_DATA);
  const [lastUpdatedText, setLastUpdatedText] = useState("Just now");

  const aqiState = getAqiState(data.aqi);

  // Simulate live updates every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      // In production: fetch from /api/readings/latest
      setData((prev) => ({
        ...prev,
        aqi: Math.max(0, prev.aqi + Math.floor(Math.random() * 11 - 5)),
        pm25: Math.max(0, +(prev.pm25 + (Math.random() * 4 - 2)).toFixed(1)),
        pm10: Math.max(0, +(prev.pm10 + (Math.random() * 6 - 3)).toFixed(1)),
        lastUpdated: new Date(),
      }));
      setLastUpdatedText("Just now");
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Update "last updated" text
  useEffect(() => {
    const tick = setInterval(() => {
      const secs = Math.floor((Date.now() - data.lastUpdated.getTime()) / 1000);
      if (secs < 60) setLastUpdatedText("Just now");
      else setLastUpdatedText(`${Math.floor(secs / 60)}m ago`);
    }, 10000);
    return () => clearInterval(tick);
  }, [data.lastUpdated]);

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-fresh-linen/90 backdrop-blur-lg border-b border-forest-night/5">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <Logo />
          <div className="text-right">
            <div className="text-xs font-medium text-forest-night/70">{data.location}</div>
            <div className="text-[10px] text-forest-night/40">{lastUpdatedText}</div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full pt-6">
        {tab === "home" && (
          <div className="tab-content-enter flex flex-col items-center gap-6 px-4 pb-28">
            <BearOrb aqiState={aqiState} aqi={data.aqi} />
            <GuidanceStrip aqiState={aqiState} />
            <PmStats pm25={data.pm25} pm10={data.pm10} />

            {/* Sensor info */}
            <div className="w-full max-w-sm bg-white/60 rounded-xl px-4 py-3 text-center">
              <div className="text-xs text-forest-night/40">
                Sensor {data.sensorId.slice(-4)} · Bair1 Node
              </div>
            </div>
          </div>
        )}

        {tab === "map" && <MapView />}
        {tab === "history" && <HistoryView />}
        {tab === "alerts" && <AlertsView />}
      </div>

      {/* Bottom nav */}
      <Navigation active={tab} onChange={setTab} />
    </main>
  );
}
