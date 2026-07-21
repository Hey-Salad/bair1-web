"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { PublicFeedReferenceStation } from "@/lib/public-feeds";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type Bair1Point = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  pm25: number | null;
  timestamp: string | null;
};

type Props = {
  stations: PublicFeedReferenceStation[];
  bair1Point: Bair1Point;
};

type MarkerEntry = {
  marker: mapboxgl.Marker;
  element: HTMLButtonElement;
};

function formatIndex(value: number | null) {
  return value == null || value === 0 ? "--" : String(value);
}

function formatTime(value: string | null) {
  if (!value) return "Waiting for data";
  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function stationColor(station: PublicFeedReferenceStation) {
  const index = Math.max(station.pm25Index ?? 0, station.pm10Index ?? 0);
  if (index >= 7) return "#ff3b30";
  if (index >= 4) return "#ffb800";
  return "#00e676";
}

export default function LondonAirMap({ stations, bair1Point }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const stationsRef = useRef(stations);
  const bair1PointRef = useRef(bair1Point);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState(bair1Point.id);
  const stationSignature = stations
    .map((station) => `${station.id}:${station.timestamp}:${station.pm25Index}:${station.pm10Index}`)
    .join("|");
  const bair1LocationSignature = `${bair1Point.id}:${bair1Point.lat}:${bair1Point.lng}:${bair1Point.label}`;

  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedId) ?? null,
    [selectedId, stations],
  );
  const selectedBair1 = selectedId === bair1Point.id;

  useEffect(() => {
    stationsRef.current = stations;
    bair1PointRef.current = bair1Point;
  }, [bair1Point, stations]);

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN || mapRef.current) return;

    const container = containerRef.current;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-0.11, 51.51],
      zoom: 9.5,
      minZoom: 8,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setMapReady(true));
    mapRef.current = map;
    const markers = markersRef.current;
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();

    const addMarker = (
      id: string,
      label: string,
      lng: number,
      lat: number,
      color: string,
      isBair1 = false,
    ) => {
      const element = document.createElement("button");
      element.type = "button";
      element.setAttribute("aria-label", label);
      element.title = label;
      element.style.cssText = `
        width: ${isBair1 ? 30 : 18}px;
        height: ${isBair1 ? 30 : 18}px;
        border: ${isBair1 ? 3 : 2}px solid #f8fafc;
        border-radius: 999px;
        background: ${color};
        color: #000;
        cursor: pointer;
        font: 700 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.55);
        transition: box-shadow 140ms ease;
      `;
      element.textContent = isBair1 ? "B1" : "";
      element.addEventListener("click", () => {
        setSelectedId(id);
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 12), duration: 700 });
      });
      const marker = new mapboxgl.Marker({ element }).setLngLat([lng, lat]).addTo(map);
      markersRef.current.set(id, { marker, element });
    };

    for (const station of stationsRef.current) {
      addMarker(
        station.id,
        `${station.stationName}, PM index ${Math.max(station.pm25Index ?? 0, station.pm10Index ?? 0)}`,
        station.lng,
        station.lat,
        stationColor(station),
      );
    }
    addMarker(
      bair1PointRef.current.id,
      bair1PointRef.current.label,
      bair1PointRef.current.lng,
      bair1PointRef.current.lat,
      "#60a5fa",
      true,
    );
  }, [bair1LocationSignature, mapReady, stationSignature]);

  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => {
      const selected = id === selectedId;
      element.style.boxShadow = selected
        ? "0 0 0 3px #c6ff4a, 0 0 0 5px rgba(0, 0, 0, 0.7)"
        : "0 0 0 2px rgba(0, 0, 0, 0.55)";
      element.style.zIndex = selected ? "2" : "1";
    });
  }, [selectedId, mapReady]);

  return (
    <section className="border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">London particulate network</h2>
          <p className="mt-1 text-xs text-muted">
            {stations.length} active LAQN particulate stations · latest hourly index
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#60a5fa]" />Bair1</span>
          <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#00e676]" />Low</span>
          <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#ffb800]" />Moderate</span>
          <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#ff3b30]" />High</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        {MAPBOX_TOKEN ? (
          <div
            ref={containerRef}
            className="h-[60vh] min-h-[480px] overflow-hidden lg:h-[calc(100vh-210px)] lg:min-h-[640px] lg:max-h-[860px]"
          />
        ) : (
          <div className="flex h-[60vh] min-h-[480px] items-center justify-center bg-bg text-sm text-muted lg:h-[calc(100vh-210px)] lg:min-h-[640px] lg:max-h-[860px]">
            Map unavailable
          </div>
        )}

        <aside className="min-h-[230px] border-t border-border bg-surface p-5 lg:border-l lg:border-t-0" aria-live="polite">
          {selectedBair1 ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{bair1Point.label}</p>
                <span className="h-3 w-3 rounded-full bg-[#60a5fa]" />
              </div>
              <p className="mt-1 text-xs text-muted">Bair1 live sensor reference point</p>
              <div className="mt-6">
                <p className="text-xs text-muted">PM2.5</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums">
                  {bair1Point.pm25 == null ? "--" : bair1Point.pm25.toFixed(0)}
                  <span className="ml-2 text-xs font-normal text-muted">ug/m3</span>
                </p>
              </div>
              <p className="mt-6 text-xs text-muted">{formatTime(bair1Point.timestamp)}</p>
            </>
          ) : selectedStation ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{selectedStation.stationName}</p>
                  <p className="mt-1 text-xs text-muted">{selectedStation.stationCode} · {selectedStation.siteType}</p>
                </div>
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: stationColor(selectedStation) }} />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted">PM2.5 index</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">{formatIndex(selectedStation.pm25Index)}</p>
                  <p className="mt-1 text-xs text-muted">{selectedStation.pm25Band ?? "No data"}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted">PM10 index</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">{formatIndex(selectedStation.pm10Index)}</p>
                  <p className="mt-1 text-xs text-muted">{selectedStation.pm10Band ?? "No data"}</p>
                </div>
              </div>
              <p className="mt-6 text-xs text-muted">Observed {formatTime(selectedStation.timestamp)}</p>
              <p className="mt-2 text-xs text-muted">London Air Quality Network · index scale 1-10</p>
            </>
          ) : (
            <p className="text-sm text-muted">Select a monitoring point.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
