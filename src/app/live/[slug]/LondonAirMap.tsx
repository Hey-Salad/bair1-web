"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { PublicFeedReferenceStation } from "@/lib/public-feeds";
import {
  CITY_ATTRIBUTION,
  TFL_ATTRIBUTION,
  type CycleInfrastructure,
} from "@/lib/cycle-infrastructure";

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
  /** The coloured circle inside the (larger, transparent) hit area. */
  dot: HTMLSpanElement;
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

/** Violet and orange, kept clear of the green/amber/red particulate ramp. */
const DOCK_COLOR = "#a78bfa";
const BAY_COLOR = "#f97316";

/**
 * mapbox-gl v3 types the queried feature as `GeoJSONFeature`, which does not expose
 * `properties`, so read it through a narrow cast rather than widening the handler.
 */
function featureProperties(feature: unknown) {
  return (feature as { properties?: Record<string, string | number | null> } | undefined)
    ?.properties;
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
  const [showCycle, setShowCycle] = useState(false);
  const [cycle, setCycle] = useState<CycleInfrastructure | null>(null);
  const [cycleError, setCycleError] = useState<string | null>(null);
  const cycleLayersAdded = useRef(false);
  const stationSignature = stations
    .map((station) => `${station.id}:${station.timestamp}:${station.pm25Index}:${station.pm10Index}`)
    .join("|");
  const bair1LocationSignature = `${bair1Point.id}:${bair1Point.lat}:${bair1Point.lng}:${bair1Point.label}`;

  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedId) ?? null,
    [selectedId, stations],
  );
  const stationCounts = useMemo(
    () => ({
      low: stations.filter((station) => Math.max(station.pm25Index ?? 0, station.pm10Index ?? 0) < 4).length,
      moderate: stations.filter((station) => {
        const index = Math.max(station.pm25Index ?? 0, station.pm10Index ?? 0);
        return index >= 4 && index < 7;
      }).length,
      high: stations.filter((station) => Math.max(station.pm25Index ?? 0, station.pm10Index ?? 0) >= 7).length,
    }),
    [stations],
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
      // The layers died with the map; allow them to be re-added to the next one.
      cycleLayersAdded.current = false;
    };
  }, []);

  // Opt-in: BikePoint is a ~2.9 MB upstream feed, so it is only fetched the first
  // time the layer is switched on rather than on every map load.
  useEffect(() => {
    if (!showCycle || cycle) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/cycle-infrastructure");
        if (!res.ok) throw new Error(`Cycle layer unavailable (${res.status})`);
        const data = (await res.json()) as CycleInfrastructure;
        if (!cancelled) setCycle(data);
      } catch (error) {
        if (!cancelled) {
          setCycleError(error instanceof Error ? error.message : "Cycle layer failed to load");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cycle, showCycle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (cycle && !cycleLayersAdded.current) {
      map.addSource("cycle-bays", { type: "geojson", data: cycle.bays });
      map.addLayer({
        id: "cycle-bays-fill",
        type: "fill",
        source: "cycle-bays",
        paint: { "fill-color": BAY_COLOR, "fill-opacity": 0.45 },
      });
      map.addLayer({
        id: "cycle-bays-outline",
        type: "line",
        source: "cycle-bays",
        paint: { "line-color": BAY_COLOR, "line-width": 1.5 },
      });

      map.addSource("cycle-docks", { type: "geojson", data: cycle.docks });
      map.addLayer({
        id: "cycle-docks",
        type: "circle",
        source: "cycle-docks",
        paint: {
          // Radius follows zoom so all 799 stations stay legible at the default
          // London-wide view; e-bike share is carried by colour instead.
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2, 11, 3.5, 13, 6, 16, 11],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "eBikeShare"],
            0,
            "#475569",
            0.5,
            DOCK_COLOR,
            1,
            "#7c3aed",
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(248, 250, 252, 0.85)",
          "circle-opacity": 0.9,
        },
      });

      const popup = new mapboxgl.Popup({ closeButton: false, offset: 12 });

      map.on("click", "cycle-docks", (event) => {
        const props = featureProperties(event.features?.[0]);
        if (!props) return;
        popup
          .setLngLat(event.lngLat)
          .setHTML(
            `<div class="popup-title">${props.name}</div>` +
              `<div class="popup-detail">${props.eBikes} e-bikes · ${props.standardBikes} standard</div>` +
              `<div class="popup-detail">${props.emptyDocks} empty of ${props.docks} docks</div>`,
          )
          .addTo(map);
      });

      map.on("click", "cycle-bays-fill", (event) => {
        const props = featureProperties(event.features?.[0]);
        if (!props) return;
        popup
          .setLngLat(event.lngLat)
          .setHTML(
            `<div class="popup-title">${props.STREET_NAME ?? "Dockless bay"}</div>` +
              `<div class="popup-detail">${props.NUMBER_OF_BAYS ?? "?"} bays · City of London</div>`,
          )
          .addTo(map);
      });

      for (const id of ["cycle-docks", "cycle-bays-fill"]) {
        map.on("mouseenter", id, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", id, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      cycleLayersAdded.current = true;
    }

    if (!cycleLayersAdded.current) return;

    const visibility = showCycle ? "visible" : "none";
    for (const id of ["cycle-bays-fill", "cycle-bays-outline", "cycle-docks"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
    }
  }, [cycle, mapReady, showCycle]);

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
      // The button is a transparent hit area with 6px of padding around the visible
      // dot, taking an 18px pin to a 30px target (and Bair1's to 42px) without
      // changing how it looks. An 18px target is well under the ~44px touch minimum,
      // and these pins sit close together on a phone.
      const element = document.createElement("button");
      element.type = "button";
      element.setAttribute("aria-label", label);
      element.title = label;
      element.style.cssText = `
        padding: 6px;
        border: none;
        background: none;
        display: grid;
        place-items: center;
        cursor: pointer;
        line-height: 0;
      `;

      const dot = document.createElement("span");
      dot.style.cssText = `
        width: ${isBair1 ? 30 : 18}px;
        height: ${isBair1 ? 30 : 18}px;
        border: ${isBair1 ? 3 : 2}px solid #f8fafc;
        border-radius: 999px;
        background: ${color};
        color: #000;
        display: grid;
        place-items: center;
        font: 700 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.55);
        transition: box-shadow 140ms var(--ease-out-strong);
      `;
      dot.textContent = isBair1 ? "B1" : "";
      element.appendChild(dot);

      element.addEventListener("click", () => {
        setSelectedId(id);
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 12), duration: 700 });
      });
      const marker = new mapboxgl.Marker({ element }).setLngLat([lng, lat]).addTo(map);
      markersRef.current.set(id, { marker, element, dot });
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
    markersRef.current.forEach(({ element, dot }, id) => {
      const selected = id === selectedId;
      // The ring belongs on the dot, not on the padded hit area.
      dot.style.boxShadow = selected
        ? "0 0 0 3px #c6ff4a, 0 0 0 5px rgba(0, 0, 0, 0.7)"
        : "0 0 0 2px rgba(0, 0, 0, 0.55)";
      element.style.zIndex = selected ? "2" : "1";
    });
  }, [selectedId, mapReady]);

  return (
    <section className="border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">London air quality map</h2>
          <p className="mt-1 text-xs text-muted">
            Compare the indoor Bair1 feed with outdoor LAQN stations across London.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#60a5fa]" />Bair1</span>
          <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#00e676]" />Low</span>
          <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#ffb800]" />Moderate</span>
          <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#ff3b30]" />High</span>
          <label className="inline-flex cursor-pointer items-center gap-2 border-l border-border pl-4">
            <input
              type="checkbox"
              checked={showCycle}
              onChange={(event) => setShowCycle(event.target.checked)}
              className="accent-[#a78bfa]"
            />
            <i className="h-2.5 w-2.5 rounded-full bg-[#a78bfa]" />
            Cycle hire
          </label>
        </div>
      </div>

      <div className="grid border-b border-border text-xs sm:grid-cols-3">
        <div className="border-b border-border p-4 text-muted sm:border-b-0 sm:border-r">
          <p className="font-medium text-ink">Indoor vs outdoor</p>
          <p className="mt-1.5 leading-5">Bair1 is an indoor kitchen sensor. Every other pin is an outdoor LAQN reference point.</p>
        </div>
        <div className="border-b border-border p-4 text-muted sm:border-b-0 sm:border-r">
          <p className="font-medium text-ink">How to read the pins</p>
          <p className="mt-1.5 leading-5">Colour shows the latest hourly particulate index. Select a pin to see PM2.5 and PM10 detail.</p>
        </div>
        <div className="p-4 text-muted">
          <p className="font-medium text-ink">Network now</p>
          <p className="mt-1.5 leading-5">{stations.length} stations · {stationCounts.low} low · {stationCounts.moderate} moderate · {stationCounts.high} high</p>
          {showCycle && (
            <p className="mt-1.5 leading-5">
              {cycleError
                ? cycleError
                : cycle
                  ? `${cycle.summary.stations} cycle docks · ${cycle.summary.eBikes} e-bikes (${(cycle.summary.eBikeShare * 100).toFixed(0)}%) · ` +
                    // The council's bay endpoint is flaky; say so rather than
                    // implying the City has no bays.
                    (cycle.summary.baySites > 0
                      ? `${cycle.summary.baySites} dockless bays`
                      : "dockless bays unavailable")
                  : "Loading cycle hire…"}
            </p>
          )}
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

      {/* TfL's licence requires these notices wherever the data is displayed. */}
      {showCycle && (
        <p className="border-t border-border p-4 text-[11px] leading-5 text-muted">
          {TFL_ATTRIBUTION} {CITY_ATTRIBUTION}
        </p>
      )}
    </section>
  );
}
