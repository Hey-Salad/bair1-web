"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { pm25Band, type Ride } from "@/lib/rides";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export const MODE_COLOR: Record<Ride["mode"], string> = {
  active: "#4A8A1A",
  passive: "#C08D52",
};

/**
 * Every journey on one basemap, with a selector to isolate any single one.
 *
 * Passive journeys are drawn dashed. They are not a different kind of line for
 * decoration: a rail trip is three fixes across nine kilometres, so the line
 * between them is an inference, not a surveyed route, and it should not look
 * as solid as a cycle track sampled every minute.
 */
export default function JourneysMap({
  journeys,
  height = 520,
}: {
  journeys: Array<Pick<Ride, "rideId" | "mode" | "start" | "end" | "track" | "distanceKm" | "pm25">>;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const drawable = journeys.filter((j) => j.track.filter((p) => p.lat != null).length >= 2);

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN || mapRef.current || drawable.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-0.1, 51.51],
      zoom: 10,
      attributionControl: true,
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-left");
    const popup = new mapboxgl.Popup({ closeButton: false, offset: 12 });

    map.on("load", () => {
      for (const j of drawable) {
        const fixes = j.track.filter(
          (p): p is typeof p & { lat: number; lng: number } => p.lat != null && p.lng != null,
        );
        const color = MODE_COLOR[j.mode];
        const id = `j-${j.rideId}`;

        map.addSource(id, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: fixes.map((p) => [p.lng, p.lat]) },
          },
        });
        map.addLayer({
          id: `${id}-casing`, type: "line", source: id,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#000", "line-opacity": 0.6, "line-width": 9 },
        });
        map.addLayer({
          id: `${id}-line`, type: "line", source: id,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": color,
            "line-width": 4,
            ...(j.mode === "passive" ? { "line-dasharray": [2, 1.6] } : {}),
          },
        });

        map.addSource(`${id}-pts`, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: fixes.map((p) => ({
              type: "Feature" as const,
              properties: {
                color: pm25Band(p.pm25 ?? 0).color,
                label: `${p.timestamp.slice(11, 16)} · PM2.5 ${p.pm25 ?? 0} µg/m³`,
              },
              geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
            })),
          },
        });
        map.addLayer({
          id: `${id}-dots`, type: "circle", source: `${id}-pts`,
          paint: {
            "circle-radius": 5,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#0b0f08",
          },
        });
        map.on("mouseenter", `${id}-dots`, (e) => {
          const feat = e.features?.[0] as
            | { geometry: { coordinates: [number, number] }; properties?: { label?: string } }
            | undefined;
          if (!feat) return;
          map.getCanvas().style.cursor = "pointer";
          popup.setLngLat(feat.geometry.coordinates)
            .setHTML(escapeHtml(String(feat.properties?.label ?? "")))
            .addTo(map);
        });
        map.on("mouseleave", `${id}-dots`, () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }
      fitTo(map, drawable, null);
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Journeys are fixed for the life of the page; rebuilding would thrash the
    // GL context and lose the user's pan/zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Isolate one journey by dimming the rest, rather than removing them —
  // keeping the others faintly visible preserves the sense of scale.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const j of drawable) {
      const on = selected == null || selected === j.rideId;
      const id = `j-${j.rideId}`;
      for (const layer of [`${id}-line`, `${id}-casing`, `${id}-dots`]) {
        if (!map.getLayer(layer)) continue;
        map.setPaintProperty(
          layer,
          layer.endsWith("-dots") ? "circle-opacity" : "line-opacity",
          on ? (layer.endsWith("-casing") ? 0.6 : 1) : 0.12,
        );
      }
    }
    fitTo(map, drawable, selected);
  }, [selected, ready, drawable]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-xl border border-border p-8 text-center text-sm text-muted">
        Map unavailable — NEXT_PUBLIC_MAPBOX_TOKEN is not configured.
      </div>
    );
  }
  if (drawable.length === 0) {
    return (
      <div className="rounded-xl border border-border p-8 text-center text-sm text-muted">
        No journeys with enough position fixes to draw.
      </div>
    );
  }

  const chip =
    "rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelected(null)}
          className={`${chip} ${selected == null ? "border-primary bg-primary text-bg font-semibold" : "border-border text-muted hover:text-ink"}`}
        >
          All {drawable.length}
        </button>
        {drawable.map((j) => (
          <button
            key={j.rideId}
            onClick={() => setSelected(selected === j.rideId ? null : j.rideId)}
            className={`${chip} ${selected === j.rideId ? "text-bg font-semibold" : "text-muted hover:text-ink"}`}
            style={
              selected === j.rideId
                ? { background: MODE_COLOR[j.mode], borderColor: MODE_COLOR[j.mode] }
                : { borderColor: "var(--color-border)" }
            }
          >
            <span aria-hidden style={{ color: selected === j.rideId ? undefined : MODE_COLOR[j.mode] }}>
              {j.mode === "passive" ? "▤ " : "▬ "}
            </span>
            {new Date(j.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{" "}
            {j.start.slice(11, 16)} · {j.distanceKm.toFixed(1)} km
          </button>
        ))}
      </div>
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full overflow-hidden rounded-xl border border-border"
        aria-label="Map of all recorded journeys"
      />
    </div>
  );
}

function fitTo(
  map: mapboxgl.Map,
  journeys: Array<{ rideId: string; track: Array<{ lat: number | null; lng: number | null }> }>,
  selected: string | null,
) {
  const use = selected ? journeys.filter((j) => j.rideId === selected) : journeys;
  const pts = use
    .flatMap((j) => j.track)
    .filter((p): p is { lat: number; lng: number } => p.lat != null && p.lng != null);
  if (pts.length < 2) return;
  const bounds = pts.reduce(
    (b, p) => b.extend([p.lng, p.lat] as [number, number]),
    new mapboxgl.LngLatBounds([pts[0].lng, pts[0].lat], [pts[0].lng, pts[0].lat]),
  );
  map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 600 });
}

/** Popup content is injected as HTML, so interpolated values must be escaped. */
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
