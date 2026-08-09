import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReadings } from "@/lib/dynamo";
import { detectRides } from "@/lib/rides";
import { getShare, toPublicRide } from "@/lib/shares";
import { getLondonReferenceStations } from "@/lib/public-feeds";
import RideRouteMap from "../../live/[slug]/rides/RideRouteMap";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/** Unlisted means unlisted: every branch below sets robots noindex so these
 *  pages stay out of search results. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const share = await getShare(token);
  if (!share) return { title: "Link not found", robots: { index: false, follow: false } };
  return {
    title: "A shared ride — Bair1",
    description: "Air quality measured along a cycle route.",
    robots: { index: false, follow: false },
  };
}

export default async function SharedRidePage({ params }: Props) {
  const { token } = await params;
  const share = await getShare(token);
  if (!share) notFound();

  const readings = await getReadings(share.deviceId, 4000);
  const ride = detectRides(share.deviceId, readings).find((r) => r.rideId === share.rideId);
  if (!ride) notFound();

  const publicRide = toPublicRide(ride, share.fuzzMetres);
  const stations = await getLondonReferenceStations().catch(() => []);

  const stats: Array<[string, string, string]> = [
    ["Duration", publicRide.durationMin.toFixed(0), "min"],
    ["Distance", publicRide.distanceKm.toFixed(2), "km"],
    ["Mean PM2.5", String(publicRide.pm25.mean), "µg/m³"],
    ["Peak PM2.5", String(publicRide.pm25.peak), "µg/m³"],
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
          Shared ride · {new Date(publicRide.start).toLocaleDateString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </span>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
          {publicRide.durationMin.toFixed(0)} minutes in{" "}
          <span style={{ color: publicRide.band.color }}>
            {publicRide.band.label.toLowerCase()}
          </span>{" "}
          air
        </h1>
        <p className="max-w-[62ch] text-muted">
          Measured with a Bair1 air quality sensor along the route below.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
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

      <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-mono text-xs uppercase tracking-[0.13em] text-muted">Route</h2>
        <RideRouteMap points={publicRide.track} stations={stations} />
        {publicRide.fuzzMetres > 0 && (
          <p className="font-mono text-[11px] text-muted">
            Start and end are shown to roughly {publicRide.fuzzMetres} m so the route does not
            reveal a precise address. The middle of the route is unmodified.
          </p>
        )}
      </section>

      <section className="border-t border-border pt-6">
        <p className="max-w-[70ch] text-sm text-muted">
          Positions come from Wi-Fi trilateration rather than GPS, so the line is the corridor
          travelled rather than the exact streets, and distance is a floor. This link is unlisted
          and can be revoked by its owner at any time.
        </p>
      </section>
    </main>
  );
}
