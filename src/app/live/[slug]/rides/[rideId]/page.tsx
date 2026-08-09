import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PUBLIC_FEEDS } from "@/lib/public-feeds";
import { getReadings, listHiddenRideIds } from "@/lib/dynamo";
import { detectRides, type Ride } from "@/lib/rides";
import RideRouteMap from "../RideRouteMap";
import RideProfile from "../RideProfile";
import ShareButton from "./ShareButton";
import HideButton from "./HideButton";
import Auth0ProviderWrapper from "@/components/Auth0ProviderWrapper";
import SafeBoundary from "@/components/SafeBoundary";
import { getLondonReferenceStations } from "@/lib/public-feeds";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string; rideId: string }>;
  searchParams: Promise<{ device?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const feed = PUBLIC_FEEDS[slug];
  return feed ? { title: `Ride — ${feed.title}` } : {};
}

export default async function RideDetailPage({ params, searchParams }: Props) {
  const { slug, rideId } = await params;
  const { device } = await searchParams;
  const feed = PUBLIC_FEEDS[slug];
  if (!feed) notFound();

  const candidates = device
    ? feed.devices.filter((d) => d.deviceId === device)
    : feed.devices;

  let ride: Ride | undefined;
  for (const d of candidates) {
    try {
      ride = detectRides(d.deviceId, await getReadings(d.deviceId, 4000)).find(
        (r) => r.rideId === decodeURIComponent(rideId),
      );
    } catch {
      ride = undefined;
    }
    if (ride) break;
  }
  if (!ride) notFound();

  const isHidden = (await listHiddenRideIds(ride.deviceId).catch(() => [] as string[])).includes(
    ride.rideId,
  );

  const stats: Array<[string, string, string]> = [
    ["Duration", ride.durationMin.toFixed(0), "min"],
    ["Track length", ride.distanceKm.toFixed(2), "km"],
    ["Mean PM2.5", String(ride.pm25.mean), "µg/m³"],
    ["Peak PM2.5", String(ride.pm25.peak), "µg/m³"],
    ["Peak PM10", String(ride.pm10.peak), "µg/m³"],
    ["Fixes", String(ride.fixCount), "positions"],
  ];

  // Official LAQN monitoring sites, for context against the ride's own
  // readings. Network call to a third party, so a failure must not take the
  // page down with it.
  const stations = await getLondonReferenceStations().catch(() => []);

  const accuracies = ride.points
    .map((p) => p.locationAccuracy)
    .filter((v): v is number => v != null);

  return (
    <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <Link href={`/live/${feed.slug}/rides`}
          className="font-mono text-xs uppercase tracking-[0.14em] text-muted hover:text-ink">
          ← All rides
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[0.14em] text-muted">
          <span>{new Date(ride.start).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          <span>{ride.start.slice(11, 16)}–{ride.end.slice(11, 16)} UTC</span>
          <span>{ride.deviceId}</span>
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
          {ride.durationMin.toFixed(0)} minutes in{" "}
          <span style={{ color: ride.band.color }}>{ride.band.label.toLowerCase()}</span> air
        </h1>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([k, v, u]) => (
          <div key={k} className="flex flex-col gap-1 bg-surface p-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{k}</dt>
            <dd className="text-2xl font-semibold tabular-nums leading-none text-ink">
              {v}
              <span className="ml-1.5 text-xs font-medium text-muted">{u}</span>
            </dd>
          </div>
        ))}
      </dl>

      <SafeBoundary>
        <Auth0ProviderWrapper>
          <div className="flex flex-col gap-3">
            <ShareButton deviceId={ride.deviceId} rideId={ride.rideId} />
            <HideButton deviceId={ride.deviceId} rideId={ride.rideId} hidden={isHidden} />
          </div>
        </Auth0ProviderWrapper>
      </SafeBoundary>

      <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-[0.13em] text-muted">Route · plotted track</h2>
          <p className="mt-1 max-w-[62ch] text-sm text-muted">
            Dot size scales with PM2.5. The soft ring behind each is the reported position accuracy.
          </p>
        </div>
        <RideRouteMap points={ride.track} stations={stations} />
      </section>

      <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-[0.13em] text-muted">PM2.5 over the ride</h2>
          <p className="mt-1 max-w-[62ch] text-sm text-muted">
            Scaled against the WHO guidelines rather than the ride&apos;s own range.
          </p>
        </div>
        <RideProfile points={ride.points} />
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.13em] text-muted">How to read this</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
          <li>
            <span className="text-ink">Positions are Wi-Fi trilateration, not GPS.</span> The board has no
            GNSS — it scans nearby access points once a minute and the server resolves them.
            {accuracies.length > 0 && (
              <> Accuracy here ranged {Math.round(Math.min(...accuracies))}–{Math.round(Math.max(...accuracies))} m.</>
            )}{" "}
            Treat the line as the corridor travelled, not the exact streets.
          </li>
          <li>
            <span className="text-ink">Distance is understated.</span> {ride.fixCount} fixes across{" "}
            {ride.durationMin.toFixed(0)} minutes means the track cuts corners; {ride.distanceKm.toFixed(2)} km is
            the sum of straight lines between them. Air readings are unaffected — those arrive every ~10 s.
          </li>
          <li>
            <span className="text-ink">
              {ride.source === "device" ? "Tagged on-device." : "Derived after the fact."}
            </span>{" "}
            {ride.source === "device"
              ? "The firmware detected this ride live from the accelerometer and stamped every reading with its ride id."
              : "This ride predates on-device tagging, so it was reconstructed from the accelerometer data server-side."}
          </li>
        </ul>
      </section>
    </main>
  );
}
