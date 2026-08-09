import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PUBLIC_FEEDS } from "@/lib/public-feeds";
import { getReadingsInRange, listHiddenRideIds } from "@/lib/dynamo";
import { detectJourneys, type Ride } from "@/lib/rides";
import { resolveRange } from "@/lib/time-range";
import RangeSwitch from "@/components/RangeSwitch";
import JourneysMap, { MODE_COLOR } from "./JourneysMap";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string; hidden?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const feed = PUBLIC_FEEDS[slug];
  if (!feed) return {};
  return {
    title: `Journeys — ${feed.title}`,
    description: "Every recorded journey, mapped, with the air quality measured along each one.",
  };
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function JourneysPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { range, hidden } = await searchParams;
  const feed = PUBLIC_FEEDS[slug];
  if (!feed) notFound();

  const window = resolveRange(range ?? "30d");

  // ?hidden=1 shows what has been hidden, so an exclusion is never silent.
  const showHidden = hidden === "1";
  const perDevice = await Promise.all(
    feed.devices.map(async (d) => {
      try {
        const [found, hiddenIds] = await Promise.all([
          getReadingsInRange(d.deviceId, window.from, window.to).then((rs) =>
            detectJourneys(d.deviceId, rs),
          ),
          listHiddenRideIds(d.deviceId).catch(() => [] as string[]),
        ]);
        const set = new Set(hiddenIds);
        return found.filter((j) => (showHidden ? set.has(j.rideId) : !set.has(j.rideId)));
      } catch {
        return [] as Ride[];
      }
    }),
  );
  const journeys = perDevice.flat().sort((a, b) => +new Date(b.start) - +new Date(a.start));

  const totalKm = journeys.reduce((s, j) => s + j.distanceKm, 0);
  const totalMin = journeys.reduce((s, j) => s + j.durationMin, 0);
  const passive = journeys.filter((j) => j.mode === "passive");
  const peak = journeys.length ? Math.max(...journeys.map((j) => j.pm25.peak)) : 0;

  const tiles: Array<[string, string, string]> = [
    ["Journeys", String(journeys.length), ""],
    ["Distance", totalKm.toFixed(1), "km"],
    ["Moving", totalMin.toFixed(0), "min"],
    ["Self-powered", String(journeys.length - passive.length), ""],
    ["Carried", String(passive.length), ""],
    ["Peak PM2.5", String(peak), "µg/m³"],
  ];

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <Link href={`/live/${feed.slug}`}
          className="font-mono text-xs uppercase tracking-[0.14em] text-muted hover:text-ink">
          ← {feed.title}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Journeys</h1>
          <RangeSwitch active={window.key} />
        </div>
        <p className="max-w-[64ch] text-muted">
          Every journey the sensor recorded while moving, on one map, with the air measured along
          each. Showing {window.description}.
          {showHidden ? (
            <>
              {" "}Listing <strong className="text-ink">hidden</strong> journeys only.{" "}
              <Link href={`/live/${feed.slug}/journeys?range=${window.key}`} className="underline hover:text-ink">
                Show visible
              </Link>.
            </>
          ) : (
            <>
              {" "}
              <Link href={`/live/${feed.slug}/journeys?range=${window.key}&hidden=1`} className="underline hover:text-ink">
                View hidden
              </Link>.
            </>
          )}
        </p>
      </header>

      {journeys.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          <p className="text-ink">No journeys detected in {window.description}.</p>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
            {tiles.map(([k, v, u]) => (
              <div key={k} className="flex flex-col gap-1 bg-surface p-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{k}</dt>
                <dd className="text-2xl font-semibold leading-none tabular-nums text-ink">
                  {v}
                  {u && <span className="ml-1.5 text-xs font-medium text-muted">{u}</span>}
                </dd>
              </div>
            ))}
          </dl>

          <JourneysMap
            journeys={journeys.map((j) => ({
              rideId: j.rideId, mode: j.mode, start: j.start, end: j.end,
              track: j.track, distanceKm: j.distanceKm, pm25: j.pm25,
            }))}
          />

          <ul className="flex flex-col gap-3">
            {journeys.map((j) => (
              <li key={`${j.deviceId}-${j.rideId}`}>
                <Link
                  href={`/live/${feed.slug}/rides/${encodeURIComponent(j.rideId)}?device=${encodeURIComponent(j.deviceId)}`}
                  className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="h-3 w-3 flex-none rounded-sm"
                      style={{ background: MODE_COLOR[j.mode] }} />
                    <div className="min-w-0">
                      <div className="font-semibold text-ink">
                        {fmtDate(j.start)} · {j.start.slice(11, 16)}–{j.end.slice(11, 16)}
                      </div>
                      <div className="font-mono text-[11px] text-muted">
                        {j.mode === "passive" ? "carried — train, bus or car" : "self-powered — cycle or walk"}
                        {" · "}{j.fixCount} fixes
                        {j.rejectedFixes.length > 0 && ` · ${j.rejectedFixes.length} unusable`}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-sm tabular-nums text-ink">
                    <span>{j.distanceKm.toFixed(2)} km</span>
                    <span>{j.durationMin.toFixed(0)} min</span>
                    <span>{(j.distanceKm / (j.durationMin / 60)).toFixed(1)} km/h</span>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: `${j.band.color}22`, color: j.band.color }}>
                      {j.pm25.mean} µg/m³
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.13em] text-muted">How these are found</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
          <li>
            <span className="text-ink">Self-powered journeys come from the accelerometer</span> — a
            rolling 60-second standard deviation, which reads 1.4–3.1 while cycling against 0.007 sitting still.
          </li>
          <li>
            <span className="text-ink">Carried journeys come from ground speed instead</span>, because on a
            train the device is almost perfectly still. The test is the pair: above 20 km/h <em>with</em> motion
            under 0.5. A fast cycle fails the second half, so the two never get confused.
          </li>
          <li>
            <span className="text-ink">Dashed lines are inferred, not surveyed.</span> Moving quickly between
            access points, most position lookups fail — one rail journey here has three usable fixes across nine
            kilometres, so the line between them is a straight guess.
          </li>
          <li>
            <span className="text-ink">Distances are floors.</span> Position refreshes about once a minute, so
            every track cuts corners, and journeys where the device stopped uploading are missing entirely.
          </li>
        </ul>
      </section>
    </main>
  );
}
