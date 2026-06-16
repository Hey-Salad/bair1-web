"use client";

import Image from "next/image";
import type { AqiState } from "@/lib/aqi";

interface BearOrbProps {
  aqiState: AqiState;
  aqi: number;
}

export default function BearOrb({ aqiState, aqi }: BearOrbProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Orb */}
      <div
        className="orb-pulse rounded-full mb-4"
        style={{
          width: 48,
          height: 48,
          backgroundColor: aqiState.orbColor,
          boxShadow: `0 0 24px 8px ${aqiState.orbColor}44`,
        }}
        role="img"
        aria-label={`Air quality orb: ${aqiState.level}`}
      />

      {/* Bear */}
      <div className="bear-breathe relative">
        <Image
          src="/bear-logo.jpg"
          alt={`Bair1 bear — ${aqiState.level} air quality`}
          width={200}
          height={200}
          className="rounded-3xl object-cover"
          priority
        />
      </div>

      {/* AQI number */}
      <div className="mt-5 text-center">
        <div className="text-6xl font-bold tracking-tight" style={{ color: aqiState.orbColor }}>
          {aqi}
        </div>
        <div className="text-sm font-medium text-forest-night/60 mt-1 uppercase tracking-widest">
          AQI
        </div>
      </div>

      {/* Level badge */}
      <div
        className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium text-white"
        style={{ backgroundColor: aqiState.orbColor }}
      >
        {aqiState.level} ({aqiState.range})
      </div>
    </div>
  );
}
