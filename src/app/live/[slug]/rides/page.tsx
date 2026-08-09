import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PUBLIC_FEEDS } from "@/lib/public-feeds";
import { getReadingsInRange, listHiddenRideIds } from "@/lib/dynamo";
import { detectRides, type Ride } from "@/lib/rides";
import { resolveRange } from "@/lib/time-range";
import RangeSwitch from "@/components/RangeSwitch";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const feed = PUBLIC_FEEDS[slug];
  if (!feed) return {};
  return {
    title: `Rides — ${feed.title}`,
    description: `Journeys detected from ${feed.location}, with the air quality measured along each one.`,
  };
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export default async function RidesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { range } = await searchParams;
  const feed = PUBLIC_FEEDS[slug];
  if (!feed) notFound();

  // Rides default to a wider window than the live view: a 30-minute window
  // would almost never contain a complete ride.
  const window = resolveRange(range ?? "7d");

  // A feed can carry several devices; detect per device, then merge.
  const perDevice = await Promise.all(
    feed.devices.map(async (d) => {
      try {
        const [found, hiddenIds] = await Promise.all([
          getReadingsInRange(d.deviceId, window.from, window.to).then((rs) => detectRides(d.deviceId, rs)),
          listHiddenRideIds(d.deviceId).catch(() => [] as string[]),
        ]);
        const set = new Set(hiddenIds);
        return found.filter((r) => !set.has(r.rideId));
      } catch {
        return [] as Ride[];
      }
    }),
  );
  const rides = perDevice.flat().sort((a, b) => +new Date(b.start) - +new Date(a.start));

  const labelFor = (deviceId: string) =>
    feed.devices.find((d) => d.deviceId === deviceId)?.label ?? deviceId;

  return (
    <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <Link href={`/live/${feed.slug}`}
          className="font-mono text-xs uppercase tracking-[0.14em] text-muted hover:text-ink">
          ← {feed.title}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Rides</h1>
          <RangeSwitch active={window.key} />
        </div>
        <p className="max-w-[62ch] text-muted">
          Journeys picked out of the sensor stream by its accelerometer, with the air
          measured along each one. Showing {window.description}.
        </p>
      </header>

      {rides.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          <p className="text-ink">No rides detected in {window.description}.</p>
          <p className="mt-2 text-sm">
            A ride needs at least 3 minutes of movement covering 300 m, so bench
            handling and desk time are excluded.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rides.map((ride) => (
            <li key={`${ride.deviceId}-${ride.rideId}`}>
              <Link
                href={`/live/${feed.slug}/rides/${encodeURIComponent(ride.rideId)}?device=${encodeURIComponent(ride.deviceId)}`}
                className="group flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-xl font-semibold text-ink">
                      {fmtDate(ride.start)}
                    </span>
                    <span className="font-mono text-sm text-muted">
                      {fmtTime(ride.start)}–{fmtTime(ride.end)} UTC
                    </span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: `${ride.band.color}22`, color: ride.band.color }}
                  >
                    {ride.band.label}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  {[
                    ["Duration", `${ride.durationMin.toFixed(0)} min`],
                    ["Distance", `${ride.distanceKm.toFixed(2)} km`],
                    ["Mean PM2.5", `${ride.pm25.mean} µg/m³`],
                    ["Peak PM2.5", `${ride.pm25.peak} µg/m³`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-0.5">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{k}</dt>
                      <dd className="text-lg font-semibold tabular-nums text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>

                <p className="font-mono text-[11px] text-muted">
                  {labelFor(ride.deviceId)} · {ride.readingCount} readings · {ride.fixCount} fixes ·{" "}
                  {ride.source === "device" ? "tagged on-device" : "derived from IMU"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
