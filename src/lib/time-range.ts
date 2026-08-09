/**
 * One definition of "what window of data am I looking at", shared by the live
 * pages, the rides views and the CSV/JSON export so they cannot drift apart.
 *
 * The ceiling is real: readings carry a DynamoDB TTL (RETENTION_SECONDS in
 * dynamo.ts), so asking for a window longer than that returns a partially
 * empty chart rather than an error. Keep the two numbers in step.
 */

export const RETENTION_DAYS = 90;

export type RangeKey = "live" | "1h" | "24h" | "7d" | "30d" | "90d";

export type RangeDef = {
  key: RangeKey;
  /** Short form for the switch itself. */
  label: string;
  /** Long form for titles and empty states. */
  description: string;
  durationMs: number;
  /** Live polls; the historical windows are a snapshot and don't need to. */
  live: boolean;
};

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const RANGES: RangeDef[] = [
  { key: "live", label: "Live", description: "the last 30 minutes", durationMs: 30 * MIN, live: true },
  { key: "1h", label: "1h", description: "the last hour", durationMs: HOUR, live: false },
  { key: "24h", label: "24h", description: "the last 24 hours", durationMs: DAY, live: false },
  { key: "7d", label: "7d", description: "the last 7 days", durationMs: 7 * DAY, live: false },
  { key: "30d", label: "30d", description: "the last 30 days", durationMs: 30 * DAY, live: false },
  { key: "90d", label: "90d", description: "the last 90 days", durationMs: 90 * DAY, live: false },
];

export const DEFAULT_RANGE: RangeKey = "live";

const BY_KEY = new Map(RANGES.map((r) => [r.key, r]));

export function isRangeKey(v: unknown): v is RangeKey {
  return typeof v === "string" && BY_KEY.has(v as RangeKey);
}

/** Unknown or missing values fall back to the default rather than throwing —
 *  a bad query string should not 500 a dashboard. */
export function parseRange(v: unknown, fallback: RangeKey = DEFAULT_RANGE): RangeDef {
  return BY_KEY.get(isRangeKey(v) ? v : fallback) ?? BY_KEY.get(DEFAULT_RANGE)!;
}

export type ResolvedRange = {
  key: RangeKey;
  label: string;
  description: string;
  live: boolean;
  from: string;
  to: string;
  /** True when the window reaches past what retention can hold, so callers can
   *  say "we only have N days" instead of silently showing a half-empty chart. */
  exceedsRetention: boolean;
};

export function resolveRange(v: unknown, now: Date = new Date()): ResolvedRange {
  const def = parseRange(v);
  const retentionMs = RETENTION_DAYS * DAY;
  const exceedsRetention = def.durationMs > retentionMs;
  const span = Math.min(def.durationMs, retentionMs);
  return {
    key: def.key,
    label: def.label,
    description: def.description,
    live: def.live,
    from: new Date(now.getTime() - span).toISOString(),
    to: now.toISOString(),
    exceedsRetention,
  };
}

/**
 * Resolve a window from request params. An explicit from/to pair always wins,
 * so existing integrations keep working untouched; `range` is the shorthand.
 * Returns null when from/to are present but unparseable, so the caller can 400.
 */
export function rangeFromSearchParams(
  params: URLSearchParams,
  now: Date = new Date(),
): ResolvedRange | null {
  const from = params.get("from");
  const to = params.get("to");
  if (from && to) {
    const f = new Date(from);
    const t = new Date(to);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return null;
    return {
      key: "live", label: "Custom", description: "a custom window",
      live: false, from: f.toISOString(), to: t.toISOString(),
      exceedsRetention: Date.now() - f.getTime() > RETENTION_DAYS * DAY,
    };
  }
  return resolveRange(params.get("range"), now);
}
