import type { Reading } from "./dynamo";

/**
 * Ride segmentation.
 *
 * Two sources, in priority order:
 *
 *  1. `rideId` stamped by the device. Genesis Mini firmware >= v2.2 runs the
 *     detector on-board against the LSM6DS3 at 2 s resolution and tags every
 *     upload, so grouping is exact and needs no inference.
 *
 *  2. Derived, for readings predating that firmware. Same discriminator,
 *     recomputed here from accelX/Y/Z.
 *
 * The discriminator is the rolling standard deviation of |accel| over a 60 s
 * window. Measured against a full day of real device data:
 *
 *     riding      median 1.867   (p10 0.700)
 *     stationary  median 0.007   (p90 0.029)
 *
 * ~270x separation, so threshold placement is not delicate. Note that
 * position-based detection is *not* viable on this hardware: Wi-Fi fixes only
 * refresh once a minute, which yielded a single usable speed sample across an
 * entire day of readings.
 */

// Keep these in step with the firmware constants in bair1-genesis/src/main.cpp.
const WINDOW_MS = 60_000;
const ON_STDEV = 0.15;
const OFF_STDEV = 0.10;
const HANG_MS = 120_000;

// A ride must clear both to be reported. The distance gate is what separates
// "cycled somewhere" from "device was picked up and carried around a room" —
// without it, bench handling shows up as a 12-minute, 0.00 km ride.
const MIN_DURATION_MS = 180_000;
const MIN_DISTANCE_M = 300;

/** An uplink gap this long ends whatever ride was open. The hang timer alone
 *  cannot do this: it counts quiet *samples*, and a gap contains none, so a
 *  four-hour cafe stop between two legs of a trip gets spanned as one ride.
 *
 *  Calibrated against two real cases rather than picked round: a 12-minute
 *  drop-out mid-cycle on 7 Aug (leaving Wi-Fi range with the hotspot down)
 *  must stay one ride, while a 3h54m stop between two legs on 9 Aug must
 *  split. Anything from ~15 min to ~3 h satisfies both; 30 min sits clear of
 *  the longest drop-out actually observed while moving. */
const RIDE_SPLIT_MS = 1_800_000;

/* ---------------------------------------------------------------------------
 * Passive travel
 *
 * The accelerometer detector only sees journeys you power yourself. On a train
 * the device is almost perfectly still — measured median 0.10 against 1.4-3.1
 * while cycling — so a commute registers as nothing at all.
 *
 * The giveaway is the pair, not either alone: high ground speed *with* near
 * zero motion. Cycling is the inverse (moderate speed, high motion), so the
 * two separate cleanly. Measured on a real 9 km rail journey: 34-45 km/h at
 * motion 0.06-0.11.
 * ------------------------------------------------------------------------- */
export const PASSIVE_MIN_KMH = 20;
export const PASSIVE_MAX_MOTION = 0.5;
const PASSIVE_MIN_DISTANCE_M = 1000;
const PASSIVE_MIN_DURATION_MS = 180_000;

/** PM2.5 concentration bands in ug/m3, matching the device's own LED bands.
 *  Deliberately not `getAqiState()` from aqi.ts — that takes an AQI *index*
 *  (0-50 Good), whereas these are raw concentrations. */
const PM25_BANDS: Array<{ max: number; label: string; color: string }> = [
  { max: 12, label: "Good", color: "#008C44" },
  { max: 35, label: "Moderate", color: "#8DC44A" },
  { max: 55, label: "Sensitive groups", color: "#E8A02C" },
  { max: 150, label: "Unhealthy", color: "#D9531E" },
  { max: 250, label: "Very unhealthy", color: "#A04096" },
  { max: Infinity, label: "Hazardous", color: "#7A1A1A" },
];

export function pm25Band(v: number) {
  return PM25_BANDS.find((b) => v < b.max) ?? PM25_BANDS[PM25_BANDS.length - 1];
}

/* ---------------------------------------------------------------------------
 * Position quality
 *
 * Fixes come from resolving a Wi-Fi AP scan, and they fail in two distinct
 * ways that need two distinct rules:
 *
 *  1. The resolver can't place the scan and falls back to the IP location of
 *     the *server* making the lookup. Observed as a handful of fixed
 *     coordinates in Northern Virginia (AWS us-east-1) carrying an accuracy
 *     radius of ~4,699 km. Trivially caught on accuracy: genuine fixes from
 *     this hardware run 11-88 m, and there is nothing in between.
 *
 *  2. The resolver places the scan confidently but wrongly, because an AP in
 *     its database has moved (mobile hotspots, buses). These arrive with
 *     entirely believable accuracy (+-42-88 m) while putting the device
 *     kilometres away. An accuracy filter does not touch them. The
 *     accelerometer is the arbiter: a 2 km jump while the IMU reads flat did
 *     not happen.
 * ------------------------------------------------------------------------- */

export const MAX_ACCURACY_M = 1000;
export const MAX_SPEED_KMH = 50;
export const STILL_STDEV = 0.15;
export const STILL_JUMP_M = 150;
/** Deliberately unused by the fix filter — see the note on passive travel in
 *  filterFixes(). Kept exported because callers reference the threshold. */
export const GAP_MS = 300_000;

export type FixRejectReason = "accuracy" | "speed" | "stationary-jump";

export type RejectedFix = {
  timestamp: string;
  lat: number;
  lng: number;
  reason: FixRejectReason;
  detail: string;
};

export type RidePoint = {
  timestamp: string;
  lat: number | null;
  lng: number | null;
  locationAccuracy: number | null;
  pm1: number | null;
  pm25: number | null;
  pm10: number | null;
  temperature: number | null;
  humidity: number | null;
  rssi: number | null;
};

export type Ride = {
  rideId: string;
  deviceId: string;
  /** How the journey was travelled. "active" is self-powered (cycling,
   *  walking) and comes from the accelerometer; "passive" is being carried
   *  (train, bus, car) and comes from ground speed. */
  mode: "active" | "passive";
  /** "device" when the firmware tagged it, "derived" when inferred here. */
  source: "device" | "derived";
  start: string;
  end: string;
  durationMin: number;
  /** Sum of straight lines between position fixes. Understates real distance:
   *  fixes are ~60 s apart, so the track cuts corners. */
  distanceKm: number;
  readingCount: number;
  fixCount: number;
  pm25: { mean: number; peak: number; min: number };
  pm10: { mean: number; peak: number };
  band: { label: string; color: string };
  /** Fixes discarded as implausible, with the rule that caught each. */
  rejectedFixes: RejectedFix[];
  /** Stretches with no uplink. The device keeps riding; the record doesn't,
   *  so distance across a gap is unmeasured and distanceKm is a floor. */
  gaps: Array<{ from: string; to: string; minutes: number }>;
  /** True when leading/trailing stationary readings were trimmed off. */
  trimmed: boolean;
  /** The route as it should be drawn: accepted fixes only, deduped to real
   *  movement. Distinct from `points`, which is every reading including ones
   *  whose position was rejected — draw those and a single 4,699 km accuracy
   *  halo swallows the map. */
  track: RidePoint[];
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
  startPoint: { lat: number; lng: number } | null;
  endPoint: { lat: number; lng: number } | null;
  points: RidePoint[];
};

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const ms = (t: string) => new Date(t).getTime();
const accelMagnitude = (r: Reading): number | null =>
  r.accelX == null || r.accelY == null || r.accelZ == null
    ? null
    : Math.hypot(r.accelX, r.accelY, r.accelZ);

/** Rolling stdev of |accel| over the preceding WINDOW_MS. Time-based rather
 *  than a fixed sample count, because upload cadence varies (the ingest path
 *  drops readings landing within 12 s of the previous one).
 *
 *  Returns null when the window holds too few samples to mean anything — the
 *  first readings after an uplink gap, for instance. That is *unknown*, not
 *  *stationary*, and conflating the two wrongly rejects the perfectly good
 *  fix that lands when the device comes back online somewhere new. */
function motionAt(readings: Reading[], i: number): number | null {
  const cutoff = ms(readings[i].timestamp) - WINDOW_MS;
  const w: number[] = [];
  for (let j = i; j >= 0 && ms(readings[j].timestamp) >= cutoff; j--) {
    const m = accelMagnitude(readings[j]);
    if (m != null) w.push(m);
  }
  if (w.length < 3) return null;
  const mean = w.reduce((s, v) => s + v, 0) / w.length;
  return Math.sqrt(w.reduce((s, v) => s + (v - mean) ** 2, 0) / w.length);
}

function toPoint(r: Reading): RidePoint {
  return {
    timestamp: r.timestamp,
    lat: r.lat,
    lng: r.lng,
    locationAccuracy: r.locationAccuracy,
    pm1: r.pm1,
    pm25: r.pm25,
    pm10: r.pm10,
    temperature: r.temperature,
    humidity: r.humidity,
    rssi: r.rssi,
  };
}

/** Split a segment's fixes into those we trust and those we don't. */
export function filterFixes(segment: Reading[]): {
  accepted: Array<Reading & { lat: number; lng: number }>;
  rejected: RejectedFix[];
} {
  const accepted: Array<Reading & { lat: number; lng: number }> = [];
  const rejected: RejectedFix[] = [];
  // The anchor is the *first* reading to report the current position, not the
  // most recent repeat of it. A resolved fix is cached and re-reported for
  // ~60 s, so measuring from the last repeat compresses a minute of travel
  // into the seconds before the next resolve and manufactures 75 km/h.
  let anchor: (Reading & { lat: number; lng: number }) | null = null;

  for (const r of segment) {
    if (r.lat == null || r.lng == null) continue;
    const fix = r as Reading & { lat: number; lng: number };
    const acc = r.locationAccuracy ?? 0;

    if (acc >= MAX_ACCURACY_M) {
      rejected.push({
        timestamp: r.timestamp, lat: fix.lat, lng: fix.lng, reason: "accuracy",
        detail: `accuracy ${Math.round(acc / 1000)} km — resolver fell back to the server's own IP location`,
      });
      continue;
    }

    const metres = anchor ? haversineMeters(anchor, fix) : 0;
    if (anchor && metres > 20) {
      const seconds = Math.max((ms(r.timestamp) - ms(anchor.timestamp)) / 1000, 1);
      const kmh = (metres / seconds) * 3.6;
      if (kmh > MAX_SPEED_KMH) {
        rejected.push({
          timestamp: r.timestamp, lat: fix.lat, lng: fix.lng, reason: "speed",
          detail: `implies ${Math.round(kmh)} km/h over ${Math.round(metres)} m`,
        });
        continue;
      }
      // There is deliberately no "moved while the IMU read still" rule here.
      // It looks sound and is not: on a train or a bus the device sits almost
      // perfectly still (measured 0.03-0.11) while the world moves past at
      // speed. Applying it discarded a real commute home — Tottenham Court
      // Road to Liverpool Street to Thamesmead — as though the fixes were
      // bogus. Accuracy catches the resolver's IP fallback and the speed gate
      // catches genuine teleports; that is enough without also calling
      // passive travel impossible.
    }

    accepted.push(fix);
    // Re-anchor only on a genuinely new position; repeats keep the original
    // timestamp so the next leg is timed from when we actually got here.
    if (!anchor || metres > 20) anchor = fix;
  }
  return { accepted, rejected };
}

function summarise(
  deviceId: string,
  rideId: string,
  source: Ride["source"],
  segment: Reading[],
  trimmed: boolean,
  mode: Ride["mode"] = "active",
): Ride | null {
  if (segment.length === 0) return null;

  const points = segment.map(toPoint);
  const { accepted: fixes, rejected: rejectedFixes } = filterFixes(segment);

  const gaps: Ride["gaps"] = [];
  for (let i = 1; i < segment.length; i++) {
    const delta = ms(segment[i].timestamp) - ms(segment[i - 1].timestamp);
    if (delta >= GAP_MS) {
      gaps.push({
        from: segment[i - 1].timestamp,
        to: segment[i].timestamp,
        minutes: Number((delta / 60_000).toFixed(1)),
      });
    }
  }

  // Only count movement between fixes that actually moved: consecutive
  // readings repeat the same cached position between the once-a-minute
  // resolves, and summing those would add nothing but would inflate fixCount.
  let distance = 0;
  let prev: { lat: number; lng: number } | null = null;
  let movedFixes = 0;
  const track: RidePoint[] = [];
  for (const f of fixes) {
    const cur = { lat: f.lat, lng: f.lng };
    if (prev == null) {
      prev = cur;
      movedFixes = 1;
      track.push(toPoint(f));
    } else if (haversineMeters(prev, cur) > 20) {
      distance += haversineMeters(prev, cur);
      prev = cur;
      movedFixes++;
      track.push(toPoint(f));
    }
  }

  const nums = (pick: (r: Reading) => number | null) =>
    segment.map(pick).filter((v): v is number => v != null);
  const pm25 = nums((r) => r.pm25);
  const pm10 = nums((r) => r.pm10);
  const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

  const start = segment[0].timestamp;
  const end = segment[segment.length - 1].timestamp;
  const worst = pm25.length ? Math.max(...pm25) : 0;
  const band = pm25Band(worst);

  return {
    rideId,
    deviceId,
    mode,
    source,
    start,
    end,
    durationMin: (ms(end) - ms(start)) / 60_000,
    distanceKm: distance / 1000,
    readingCount: segment.length,
    fixCount: movedFixes,
    pm25: {
      mean: Number(avg(pm25).toFixed(2)),
      peak: pm25.length ? Math.max(...pm25) : 0,
      min: pm25.length ? Math.min(...pm25) : 0,
    },
    pm10: { mean: Number(avg(pm10).toFixed(2)), peak: pm10.length ? Math.max(...pm10) : 0 },
    band: { label: band.label, color: band.color },
    rejectedFixes,
    gaps,
    trimmed,
    track,
    bbox: fixes.length
      ? {
          minLat: Math.min(...fixes.map((f) => f.lat)),
          maxLat: Math.max(...fixes.map((f) => f.lat)),
          minLng: Math.min(...fixes.map((f) => f.lng)),
          maxLng: Math.max(...fixes.map((f) => f.lng)),
        }
      : null,
    startPoint: fixes.length ? { lat: fixes[0].lat, lng: fixes[0].lng } : null,
    endPoint: fixes.length
      ? { lat: fixes[fixes.length - 1].lat, lng: fixes[fixes.length - 1].lng }
      : null,
    points,
  };
}

export type DetectOptions = {
  /** Drop rides shorter than MIN_DURATION_MS / MIN_DISTANCE_M. Default true. */
  filterShort?: boolean;
  /** Trim leading/trailing stationary readings off each ride. Default true.
   *  Device-tagged rides get trimmed too: the firmware opens a ride two ticks
   *  after motion starts and holds it open through a 120 s quiet window, so
   *  both ends carry some stillness. */
  trim?: boolean;
};

/** Drop stationary readings from both ends, so a ride starts when the wheels
 *  turn rather than when the device was picked up off the bench. */
function trimToMotion(
  segment: Reading[],
  motionOf: (r: Reading) => number | null,
): { segment: Reading[]; trimmed: boolean } {
  // Unknown motion is not a reason to trim, so null keeps the reading.
  const isStill = (r: Reading) => {
    const m = motionOf(r);
    return m != null && m < STILL_STDEV;
  };
  let a = 0;
  let b = segment.length - 1;
  while (a < b && isStill(segment[a])) a++;
  while (b > a && isStill(segment[b])) b--;
  if (a === 0 && b === segment.length - 1) return { segment, trimmed: false };
  // Never trim a ride out of existence.
  if (b - a < 2) return { segment, trimmed: false };
  return { segment: segment.slice(a, b + 1), trimmed: true };
}

/**
 * Segment a device's readings into rides. Input may be in any order.
 * Returns newest first.
 */
export function detectRides(
  deviceId: string,
  readings: Reading[],
  opts: DetectOptions = {},
): Ride[] {
  const filterShort = opts.filterShort ?? true;
  const trim = opts.trim ?? true;
  const sorted = [...readings].sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
  const rides: Ride[] = [];

  // One motion value per reading, computed once. Prefer the device's own
  // figure: it is derived at 2 s resolution on-board, versus ~12 s between
  // stored readings here (the ingest path drops anything landing inside 12 s
  // of the previous reading).
  const motionByTimestamp = new Map<string, number | null>();
  sorted.forEach((r, i) => {
    motionByTimestamp.set(r.timestamp, r.motionStdev ?? motionAt(sorted, i));
  });
  const motionOf = (r: Reading): number | null => motionByTimestamp.get(r.timestamp) ?? null;

  const emit = (rideId: string, source: Ride["source"], raw: Reading[]) => {
    const t = trim ? trimToMotion(raw, motionOf) : { segment: raw, trimmed: false };
    const ride = summarise(deviceId, rideId, source, t.segment, t.trimmed);
    if (ride) rides.push(ride);
  };

  // 1. Device-tagged rides — authoritative, grouped straight off rideId.
  const tagged = new Map<string, Reading[]>();
  const untagged: Reading[] = [];
  for (const r of sorted) {
    if (r.rideId) {
      const list = tagged.get(r.rideId);
      if (list) list.push(r);
      else tagged.set(r.rideId, [r]);
    } else {
      untagged.push(r);
    }
  }
  for (const [rideId, segment] of tagged) {
    emit(rideId, "device", segment);
  }

  // 2. Derived rides from whatever the firmware didn't tag.
  let openedAt: number | null = null;
  let quietSince: number | null = null;
  let onHits = 0;

  const closeAt = (endIdx: number) => {
    if (openedAt == null) return;
    const segment = untagged.slice(openedAt, endIdx + 1);
    openedAt = null;
    quietSince = null;
    const first = segment[0];
    if (!first) return;
    emit(`derived-${first.timestamp}`, "derived", segment);
  };

  for (let i = 0; i < untagged.length; i++) {
    const r = untagged[i];

    // A long silence ends the ride at the last reading we actually have,
    // rather than stitching across it. Whatever happened during the gap, it
    // was not one continuous journey.
    if (i > 0 && ms(r.timestamp) - ms(untagged[i - 1].timestamp) >= RIDE_SPLIT_MS) {
      closeAt(i - 1);
      onHits = 0;
    }

    // For opening/closing a ride, unknown counts as not-moving: we would
    // rather miss the first few seconds than invent a ride out of a gap.
    const motion = motionOf(r) ?? 0;

    if (openedAt == null) {
      if (motion > ON_STDEV) {
        if (++onHits >= 2) {
          openedAt = Math.max(0, i - 1);
          onHits = 0;
        }
      } else {
        onHits = 0;
      }
      continue;
    }
    if (motion > OFF_STDEV) {
      quietSince = null;
    } else if (quietSince == null) {
      quietSince = ms(r.timestamp);
    } else if (ms(r.timestamp) - quietSince >= HANG_MS) {
      closeAt(i);
    }
  }
  if (openedAt != null) closeAt(untagged.length - 1);

  const kept = filterShort
    ? rides.filter(
        (r) =>
          ms(r.end) - ms(r.start) >= MIN_DURATION_MS &&
          r.distanceKm * 1000 >= MIN_DISTANCE_M,
      )
    : rides;

  return kept.sort((a, b) => ms(b.start) - ms(a.start));
}

/**
 * Journeys where the device was carried rather than powered — trains, buses,
 * car passenger trips. Found from ground speed between trusted fixes, gated on
 * low accelerometer motion so a fast cycle is never mistaken for one.
 *
 * Runs over readings *outside* the active rides, so nothing is double counted.
 */
export function detectPassiveJourneys(
  deviceId: string,
  readings: Reading[],
  activeRides: Ride[] = [],
): Ride[] {
  const sorted = [...readings].sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
  const motionByTimestamp = new Map<string, number | null>();
  sorted.forEach((r, i) => motionByTimestamp.set(r.timestamp, r.motionStdev ?? motionAt(sorted, i)));

  const busy = activeRides.map((r) => [ms(r.start), ms(r.end)] as const);
  const insideActive = (t: number) => busy.some(([a, b]) => t >= a && t <= b);

  const { accepted } = filterFixes(sorted);
  // Collapse to distinct positions; a repeated cached fix carries no speed.
  const nodes: Array<Reading & { lat: number; lng: number }> = [];
  for (const fix of accepted) {
    const prev = nodes[nodes.length - 1];
    if (!prev || haversineMeters(prev, fix) > 20) nodes.push(fix);
  }

  // Mark the fast, still hops.
  const fast: Array<{ from: number; to: number }> = [];
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1];
    const b = nodes[i];
    const seconds = (ms(b.timestamp) - ms(a.timestamp)) / 1000;
    if (seconds <= 0 || seconds * 1000 >= RIDE_SPLIT_MS) continue;
    const kmh = (haversineMeters(a, b) / seconds) * 3.6;
    const motion = motionByTimestamp.get(b.timestamp);
    if (kmh < PASSIVE_MIN_KMH) continue;
    if (motion != null && motion > PASSIVE_MAX_MOTION) continue;
    if (insideActive(ms(a.timestamp)) || insideActive(ms(b.timestamp))) continue;
    fast.push({ from: ms(a.timestamp), to: ms(b.timestamp) });
  }
  if (!fast.length) return [];

  // Merge hops that run together into one journey.
  const spans: Array<{ from: number; to: number }> = [];
  for (const hop of fast) {
    const last = spans[spans.length - 1];
    if (last && hop.from - last.to < RIDE_SPLIT_MS) last.to = Math.max(last.to, hop.to);
    else spans.push({ ...hop });
  }

  const out: Ride[] = [];
  for (const span of spans) {
    const segment = sorted.filter(
      (r) => ms(r.timestamp) >= span.from && ms(r.timestamp) <= span.to,
    );
    if (segment.length < 2) continue;
    const ride = summarise(
      deviceId,
      `passive-${segment[0].timestamp}`,
      "derived",
      segment,
      false,
      "passive",
    );
    if (!ride) continue;
    if (ride.distanceKm * 1000 < PASSIVE_MIN_DISTANCE_M) continue;
    if (ms(ride.end) - ms(ride.start) < PASSIVE_MIN_DURATION_MS) continue;
    out.push(ride);
  }
  return out;
}

/** Everything the device recorded while moving: self-powered and carried. */
export function detectJourneys(
  deviceId: string,
  readings: Reading[],
  opts: DetectOptions = {},
): Ride[] {
  const active = detectRides(deviceId, readings, opts);
  const passive = detectPassiveJourneys(deviceId, readings, active);
  return [...active, ...passive].sort((a, b) => ms(b.start) - ms(a.start));
}

/** Everything except the per-reading points, for list views. */
export function toSummary(ride: Ride): Omit<Ride, "points"> {
  const summary: Partial<Ride> = { ...ride };
  delete summary.points;
  return summary as Omit<Ride, "points">;
}
