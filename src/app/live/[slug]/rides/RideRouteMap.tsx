"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { pm25Band, type RidePoint } from "@/lib/rides";
import type { PublicFeedReferenceStation } from "@/lib/public-feeds";
import RideMap from "./RideMap";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/**
 * Route over a real basemap.
 *
 * Falls back to the basemap-free SVG map when no Mapbox token is configured,
 * so a missing env var degrades to a working map rather than a blank panel.
 *
 * Accuracy rings are drawn as metric polygons rather than fixed-pixel circles.
 * A pixel radius would stay the same size as you zoom, which would quietly
 * misrepresent a ±500 m fix as tight once zoomed in — the whole point of
 * showing them is that they scale with the ground.
 */
/** LAQN publishes a 1-10 band index rather than a concentration, so these are
 *  its own bands, not the PM2.5 µg/m³ bands used for the ride itself. Keeping
 *  them visually distinct matters — conflating an index with a concentration
 *  is how you end up claiming a station read "3 µg/m³". */
function laqnColor(index: number | null): string {
  if (index == null) return "#6B7563";
  if (index <= 3) return "#008C44";   // Low
  if (index <= 6) return "#E8A02C";   // Moderate
  if (index <= 9) return "#D9531E";   // High
  return "#A04096";                   // Very high
}
const laqnLabel = (i: number | null) =>
  i == null ? "no index" : i <= 3 ? "Low" : i <= 6 ? "Moderate" : i <= 9 ? "High" : "Very high";

export default function RideRouteMap({
  points,
  stations = [],
  height,
}: {
  points: RidePoint[];
  /** Official monitoring sites drawn underneath the route for context. */
  stations?: PublicFeedReferenceStation[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const fixes = points.filter(
    (p): p is RidePoint & { lat: number; lng: number } => p.lat != null && p.lng != null,
  );

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN || mapRef.current || fixes.length < 2) return;

    // On a touch screen cooperative gestures demand two fingers to pan, which
    // reads as a broken map. Phones get direct one-finger panning; pointer
    // devices keep the guard so a page scroll doesn't turn into a map zoom.
    const isTouch =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches === true;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [fixes[0].lng, fixes[0].lat],
      zoom: 13,
      attributionControl: true,
      cooperativeGestures: !isTouch,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-left");

    const worst = pm25Band(Math.max(...fixes.map((p) => p.pm25 ?? 0)));
    const stationPopup = new mapboxgl.Popup({ closeButton: false, offset: 10 });
    const pmValues = fixes.map((p) => p.pm25 ?? 0);
    const pmMin = Math.min(...pmValues);
    const pmMax = Math.max(...pmValues);

    map.on("load", () => {
      // Pollution context first, so the ride always sits on top of it.
      const nearby = stations.filter(
        (st) =>
          st.lat != null && st.lng != null &&
          Math.abs(st.lat - fixes[0].lat) < 0.25 && Math.abs(st.lng - fixes[0].lng) < 0.4,
      );
      if (nearby.length) {
        map.addSource("stations", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: nearby.map((st) => ({
              type: "Feature" as const,
              properties: {
                color: laqnColor(st.pm25Index),
                label: `${st.stationName} — PM2.5 ${laqnLabel(st.pm25Index)}${st.pm25Index != null ? ` (index ${st.pm25Index})` : ""}`,
              },
              geometry: { type: "Point" as const, coordinates: [st.lng, st.lat] },
            })),
          },
        });
        map.addLayer({
          id: "station-halo",
          type: "circle",
          source: "stations",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 14, 16, 46],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.14,
          },
        });
        map.addLayer({
          id: "station-dots",
          type: "circle",
          source: "stations",
          paint: {
            "circle-radius": 5,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#0b0f08",
            "circle-opacity": 0.9,
          },
        });
        map.on("mouseenter", "station-dots", (e) => {
          const f = e.features?.[0] as
            | { geometry: { coordinates: [number, number] }; properties?: { label?: string } }
            | undefined;
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          stationPopup
            .setLngLat(f.geometry.coordinates)
            .setHTML(escapeHtml(String(f.properties?.label ?? "")))
            .addTo(map);
        });
        map.on("mouseleave", "station-dots", () => {
          map.getCanvas().style.cursor = "";
          stationPopup.remove();
        });
      }

      map.addSource("accuracy", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: fixes.map((p) => ({
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "Polygon" as const,
              coordinates: [circleRing(p.lng, p.lat, p.locationAccuracy ?? 25)],
            },
          })),
        },
      });
      map.addLayer({
        id: "accuracy-fill",
        type: "fill",
        source: "accuracy",
        paint: { "fill-color": worst.color, "fill-opacity": 0.12 },
      });

      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: fixes.map((p) => [p.lng, p.lat]),
          },
        },
      });
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#000000", "line-opacity": 0.55, "line-width": 9 },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": worst.color, "line-width": 4.5 },
      });

      map.addSource("fixes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: fixes.map((p) => {
            const v = p.pm25 ?? 0;
            return {
              type: "Feature" as const,
              properties: {
                color: pm25Band(v).color,
                radius: 4.5 + 5.5 * (pmMax > pmMin ? (v - pmMin) / (pmMax - pmMin) : 0),
                label:
                  `${p.timestamp.slice(11, 16)} UTC · PM2.5 ${v} µg/m³` +
                  (p.locationAccuracy != null ? ` · ±${Math.round(p.locationAccuracy)} m` : ""),
              },
              geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
            };
          }),
        },
      });
      map.addLayer({
        id: "fix-dots",
        type: "circle",
        source: "fixes",
        paint: {
          "circle-radius": ["get", "radius"],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#0b0f08",
        },
      });

      // Endpoints, so start and finish read at a glance.
      const ends = [fixes[0], fixes[fixes.length - 1]];
      map.addSource("ends", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: ends.map((p, i) => ({
            type: "Feature" as const,
            properties: { text: i === 0 ? "START" : "END" },
            geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
          })),
        },
      });
      map.addLayer({
        id: "end-labels",
        type: "symbol",
        source: "ends",
        layout: {
          "text-field": ["get", "text"],
          "text-size": 11,
          "text-offset": [0, -1.6],
          "text-letter-spacing": 0.12,
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": "#ffffff", "text-halo-color": "#000000", "text-halo-width": 1.4 },
      });

      const bounds = fixes.reduce(
        (b, p) => b.extend([p.lng, p.lat] as [number, number]),
        new mapboxgl.LngLatBounds(
          [fixes[0].lng, fixes[0].lat],
          [fixes[0].lng, fixes[0].lat],
        ),
      );
      map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: 0 });

      const popup = new mapboxgl.Popup({ closeButton: false, offset: 12 });
      map.on("mouseenter", "fix-dots", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0] as
          | { geometry: { coordinates: [number, number] }; properties?: { label?: string } }
          | undefined;
        if (!f) return;
        popup
          .setLngLat(f.geometry.coordinates)
          .setHTML(escapeHtml(String(f.properties?.label ?? "")))
          .addTo(map);
      });
      map.on("mouseleave", "fix-dots", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // fixes is derived from props; rebuilding the map on every render would
    // thrash the GL context, so this intentionally runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!MAPBOX_TOKEN || fixes.length < 2) {
    return <RideMap points={points} height={height} />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        ref={containerRef}
        style={height ? { height } : undefined}
        className="h-[320px] w-full overflow-hidden rounded-lg border border-border sm:h-[420px] lg:h-[460px]"
        aria-label="Route on a map with nearby air quality monitoring stations"
      />
      {stations.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
          <span className="text-ink">Ride</span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: "#008C44" }} />dots sized by PM2.5
          </span>
          <span className="text-ink">LAQN stations</span>
          {[["Low", "#008C44"], ["Moderate", "#E8A02C"], ["High", "#D9531E"], ["Very high", "#A04096"]].map(
            ([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                {label}
              </span>
            ),
          )}
          <span>· station shading is the LAQN 1–10 index, not µg/m³</span>
        </p>
      )}
    </div>
  );
}

/** Ring of lng/lat pairs approximating a circle of `metres` radius. */
function circleRing(lng: number, lat: number, metres: number, steps = 40): [number, number][] {
  const dLat = metres / 111_320;
  const dLng = metres / (111_320 * Math.cos((lat * Math.PI) / 180) || 1);
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    ring.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return ring;
}

/** Popup content is injected as HTML, so interpolated values must be escaped. */
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
