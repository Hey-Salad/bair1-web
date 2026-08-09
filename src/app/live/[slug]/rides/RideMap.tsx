import { pm25Band, type RidePoint } from "@/lib/rides";

/**
 * Plotted route as inline SVG. Deliberately basemap-free: positions come from
 * Wi-Fi trilateration (~15-75 m, refreshed once a minute), so drawing this
 * over street tiles would imply a precision the data doesn't have. Dot radius
 * encodes PM2.5; the soft ring behind each dot is the reported accuracy.
 */
export default function RideMap({
  points,
  height = 460,
}: {
  points: RidePoint[];
  height?: number;
}) {
  const fixes = points.filter(
    (p): p is RidePoint & { lat: number; lng: number } => p.lat != null && p.lng != null,
  );

  // Collapse repeated positions: the cached fix repeats between resolves.
  const track: typeof fixes = [];
  for (const f of fixes) {
    const prev = track[track.length - 1];
    if (!prev || Math.abs(prev.lat - f.lat) > 1e-5 || Math.abs(prev.lng - f.lng) > 1e-5) {
      track.push(f);
    }
  }

  if (track.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-border text-sm text-muted">
        Not enough position fixes to draw a route.
      </div>
    );
  }

  const W = 940;
  const PAD = 54;
  const lats = track.map((p) => p.lat);
  const lngs = track.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);

  const spanX = (maxLng - minLng) * k || 1e-9;
  const spanY = maxLat - minLat || 1e-9;
  const scale = Math.min((W - 2 * PAD) / spanX, (height - 2 * PAD) / spanY);
  const ox = PAD + (W - 2 * PAD - spanX * scale) / 2;
  const oy = PAD + (height - 2 * PAD - spanY * scale) / 2;
  const project = (lat: number, lng: number): [number, number] => [
    ox + (lng - minLng) * k * scale,
    oy + (maxLat - lat) * scale,
  ];

  const metresPerUnit = 111_320 / scale;
  // Pick a round scale-bar length that lands near a fifth of the frame.
  const target = ((W - 2 * PAD) / 5) * metresPerUnit;
  const barMetres =
    [50, 100, 250, 500, 1000, 2000, 5000].find((v) => v >= target) ?? 5000;
  const barPx = barMetres / metresPerUnit;

  const pmValues = track.map((p) => p.pm25 ?? 0);
  const pmMin = Math.min(...pmValues);
  const pmMax = Math.max(...pmValues);
  const polyline = track.map((p) => project(p.lat, p.lng).join(",")).join(" ");

  const [sx, sy] = project(track[0].lat, track[0].lng);
  const [ex, ey] = project(track[track.length - 1].lat, track[track.length - 1].lng);
  const worstBand = pm25Band(pmMax);

  return (
    <div className="min-w-0 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="block h-auto w-full min-w-[520px]"
        role="img"
        aria-label={`Plotted route across ${track.length} position fixes, worst PM2.5 band ${worstBand.label}`}
      >
        <line x1={PAD / 2} y1={oy} x2={W - PAD / 2} y2={oy}
          stroke="var(--color-border)" strokeWidth="1" strokeDasharray="2 6" />
        <line x1={ox} y1={PAD / 2} x2={ox} y2={height - PAD / 2}
          stroke="var(--color-border)" strokeWidth="1" strokeDasharray="2 6" />

        <polyline points={polyline} fill="none" stroke="var(--color-surface)"
          strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={polyline} fill="none" stroke={worstBand.color}
          strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />

        {track.map((p, i) => {
          const [x, y] = project(p.lat, p.lng);
          const v = p.pm25 ?? 0;
          const r = 3.4 + 3.4 * (pmMax > pmMin ? (v - pmMin) / (pmMax - pmMin) : 0);
          // One string, not several children: React renders adjacent JSX
          // expressions as separate text nodes, the browser merges them inside
          // <title>, and hydration then reports a mismatch.
          const label =
            `${p.timestamp.slice(11, 16)} UTC — PM2.5 ${v} µg/m³` +
            (p.locationAccuracy != null ? ` · ±${Math.round(p.locationAccuracy)} m` : "");
          return (
            <g key={`${p.timestamp}-${i}`}>
              <circle cx={x} cy={y} r={(p.locationAccuracy ?? 25) / metresPerUnit}
                fill={worstBand.color} opacity={0.09} />
              <circle cx={x} cy={y} r={r} fill={pm25Band(v).color}
                stroke="var(--color-surface)" strokeWidth="1.6">
                <title>{label}</title>
              </circle>
            </g>
          );
        })}

        <circle cx={sx} cy={sy} r={10} fill="none" stroke="var(--color-ink)" strokeWidth="2" />
        <text x={sx} y={sy + 26} textAnchor="middle" className="fill-ink"
          style={{ font: "600 11px ui-monospace, monospace" }}>
          START {track[0].timestamp.slice(11, 16)}
        </text>
        <circle cx={ex} cy={ey} r={7} fill="var(--color-ink)" />
        <text x={ex} y={ey - 16} textAnchor="middle" className="fill-ink"
          style={{ font: "600 11px ui-monospace, monospace" }}>
          END {track[track.length - 1].timestamp.slice(11, 16)}
        </text>

        <g transform={`translate(${W - PAD - barPx - 8}, ${height - 30})`}>
          <line x1="0" y1="0" x2={barPx} y2="0" stroke="var(--color-ink)" strokeWidth="2" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--color-ink)" strokeWidth="2" />
          <line x1={barPx} y1="-4" x2={barPx} y2="4" stroke="var(--color-ink)" strokeWidth="2" />
          <text x={barPx / 2} y="-9" textAnchor="middle" className="fill-muted"
            style={{ font: "9.5px ui-monospace, monospace" }}>
            {barMetres >= 1000 ? `${barMetres / 1000} km` : `${barMetres} m`}
          </text>
        </g>
        <g transform={`translate(${PAD - 16}, ${PAD - 14})`}>
          <path d="M0,14 L0,-6 M-4.5,-1 L0,-7 L4.5,-1" fill="none"
            stroke="var(--color-muted)" strokeWidth="1.6" />
          <text x="0" y="26" textAnchor="middle" className="fill-muted"
            style={{ font: "9.5px ui-monospace, monospace" }}>N</text>
        </g>
      </svg>
    </div>
  );
}
