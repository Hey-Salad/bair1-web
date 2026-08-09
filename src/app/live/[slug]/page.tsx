import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicFeedSnapshot, PUBLIC_FEEDS } from "@/lib/public-feeds";
import { resolveRange } from "@/lib/time-range";
import RangeSwitch from "@/components/RangeSwitch";
import PublicFeedClient from "./PublicFeedClient";

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
    title: "Bair1 Live Data",
    description: "Live PM sensor data from Bair1.",
    openGraph: {
      title: "Bair1 Live Data",
      description: "Live PM sensor data from Bair1.",
      url: `https://app.bair1.live/live/${feed.slug}`,
      siteName: "Bair1",
    },
  };
}

export default async function PublicLiveFeedPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { range } = await searchParams;
  // Was hardcoded to the last 30 minutes; the window is now part of the URL so
  // it survives a reload and can be linked to.
  const window = resolveRange(range);
  // Historical windows need far more headroom than the live 30-minute view.
  const limit = window.live ? 500 : 10000;
  const snapshot = await getPublicFeedSnapshot(slug, {
    limit,
    from: window.from,
    to: window.to,
    includeReferences: true,
  });

  if (!snapshot) notFound();

  return (
    <>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 pt-6">
        <RangeSwitch active={window.key} />
        <div className="flex gap-4">
          <Link
            href={`/live/${slug}/journeys`}
            className="font-mono text-xs uppercase tracking-[0.14em] text-muted hover:text-ink"
          >
            Journeys →
          </Link>
          <Link
            href={`/live/${slug}/rides`}
            className="font-mono text-xs uppercase tracking-[0.14em] text-muted hover:text-ink"
          >
            Rides →
          </Link>
        </div>
      </div>
      <PublicFeedClient
        initialSnapshot={{ ...snapshot, title: "", description: "" }}
        windowMs={new Date(window.to).getTime() - new Date(window.from).getTime()}
        live={window.live}
      />
    </>
  );
}
