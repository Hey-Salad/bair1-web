"use client";

import { useEffect, useRef, useState } from "react";
import { pm25Band, type RidePoint } from "@/lib/rides";

// WHO 2021 guidelines, the meaningful reference at urban-cycling levels.
const WHO_ANNUAL = 5;
const WHO_24H = 15;

/**
 * PM2.5 across a ride.
 *
 * Draws at the container's real width rather than a fixed viewBox, so one user
 * unit is always one CSS pixel. A fixed viewBox scaled to a phone shrinks the
 * axis labels along with everything else — which is what forced the chart into
 * a sideways-scrolling box. Measuring instead lets the chart genuinely fit,
 * and lets tick density follow the space available.
 */
export default function RideProfile({ points }: { points: RidePoint[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(940);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };

    // ResizeObserver alone is not enough: its callbacks are tied to rendering
    // and get throttled when the page is backgrounded or hidden, which leaves
    // the chart drawn at a stale width. The window listener and the rAF pass
    // cover those cases so the chart always matches the box it is in.
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  const pts = points.filter((p) => p.pm25 != null);
  if (pts.length < 2) return null;

  const narrow = width < 560;
  const H = narrow ? 190 : 210;
  const L = narrow ? 30 : 42;     // room for the y-axis numbers
  const R = 10;
  const B = narrow ? 34 : 30;     // room for the time labels
  const top = 16;

  const yMax = Math.max(WHO_24H + 1, ...pts.map((p) => p.pm25 ?? 0)) * 1.1;
  const t0 = +new Date(pts[0].timestamp);
  const span = +new Date(pts[pts.length - 1].timestamp) - t0 || 1;
  const px = (t: string) => L + ((+new Date(t) - t0) / span) * (width - L - R);
  const py = (v: number) => H - B - (v / yMax) * (H - B - top);
  const bw = Math.max(1.5, (width - L - R) / pts.length - 1.2);

  // One label per ~85px of axis, so they never collide at any width.
  const tickEvery = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor((width - L - R) / 85))));
  const gridValues = [0, 5, 10, 15].filter((v) => v <= yMax);

  return (
    <div ref={wrapRef} className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${width} ${H}`}
        width="100%"
        height={H}
        role="img"
        className="block"
        aria-label={`PM2.5 across the ride, peaking at ${Math.max(...pts.map((p) => p.pm25 ?? 0))} micrograms per cubic metre`}
      >
        {gridValues.map((v) => (
          <g key={v}>
            <line x1={L} y1={py(v)} x2={width - R} y2={py(v)}
              stroke="var(--color-border)" strokeWidth="1" />
            <text x={L - 6} y={py(v) + 3.5} textAnchor="end" className="fill-muted"
              style={{ font: "10px ui-monospace, monospace" }}>{v}</text>
          </g>
        ))}

        {pts.map((p, i) => {
          const v = p.pm25 ?? 0;
          return (
            <rect key={`${p.timestamp}-${i}`} x={px(p.timestamp) - bw / 2} y={py(v)}
              width={bw} height={Math.max(1.2, H - B - py(v))} rx="1" fill={pm25Band(v).color}>
              <title>{`${p.timestamp.slice(11, 16)} UTC — PM2.5 ${v} µg/m³`}</title>
            </rect>
          );
        })}

        {[[WHO_ANNUAL, narrow ? "WHO annual" : "WHO annual · 5"],
          [WHO_24H, narrow ? "WHO 24h" : "WHO 24-hour · 15"]]
          .filter(([v]) => (v as number) <= yMax)
          .map(([v, label]) => (
            <g key={String(label)}>
              <line x1={L} y1={py(v as number)} x2={width - R} y2={py(v as number)}
                stroke="var(--color-bear-brown)" strokeWidth="1" strokeDasharray="5 4" opacity="0.8" />
              <text x={width - R - 2} y={py(v as number) - 5} textAnchor="end"
                style={{ font: "9.5px ui-monospace, monospace", fill: "var(--color-bear-brown)" }}>
                {label}
              </text>
            </g>
          ))}

        {pts.map((p, i) =>
          i % tickEvery === 0 ? (
            <text key={`t-${p.timestamp}`} x={px(p.timestamp)} y={H - 10} textAnchor="middle"
              className="fill-muted" style={{ font: "10px ui-monospace, monospace" }}>
              {p.timestamp.slice(11, 16)}
            </text>
          ) : null,
        )}

        {/* Right-aligning this to the y-axis clips the leading µ once the
            narrow layout shrinks the left margin, so anchor it to the edge. */}
        <text x={narrow ? 0 : L - 6} y={11} textAnchor={narrow ? "start" : "end"}
          className="fill-muted" style={{ font: "10px ui-monospace, monospace" }}>µg/m³</text>
      </svg>
    </div>
  );
}
