import { NextRequest, NextResponse } from "next/server";
import { getPublicFeedSnapshot, PUBLIC_FEEDS, type PublicFeedFilters } from "@/lib/public-feeds";
import { rangeFromSearchParams } from "@/lib/time-range";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const url = new URL(req.url);
    const feed = PUBLIC_FEEDS[slug];
    const requestedLimit = Number(url.searchParams.get("limit") ?? 120);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 120, 1), 500);
    const pollutantParam = url.searchParams.get("pollutant");
    const pollutant: PublicFeedFilters["pollutant"] =
      pollutantParam === "pm1" || pollutantParam === "pm10" || pollutantParam === "aqi" ? pollutantParam : "pm25";
    const devices = url.searchParams
      .getAll("device")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter((value) => feed?.devices.some((device) => device.deviceId === value));
    const includeReferences = url.searchParams.get("references") !== "false";
    // ?range=24h|7d|30d|90d is the shorthand; an explicit from+to still wins,
    // so existing consumers of this feed are unaffected.
    const hasWindow =
      url.searchParams.has("range") ||
      (url.searchParams.has("from") && url.searchParams.has("to"));
    const window = hasWindow ? rangeFromSearchParams(url.searchParams) : null;
    if (hasWindow && !window) {
      return NextResponse.json({ error: "Invalid date format. Use ISO 8601." }, { status: 400 });
    }

    const includeRides = url.searchParams.get("rides") === "1";
    const fuzzParam = url.searchParams.get("fuzz");
    const fuzzMetres = fuzzParam == null
      ? 500
      : Math.max(0, Math.min(5000, Number(fuzzParam) || 0));

    const snapshot = await getPublicFeedSnapshot(slug, {
      limit,
      pollutant,
      devices,
      from: window?.from ?? null,
      to: window?.to ?? null,
      includeReferences,
      includeRides,
      fuzzMetres,
    });

    if (!snapshot) {
      return NextResponse.json({ error: "feed not found" }, { status: 404 });
    }

    return NextResponse.json(snapshot, {
      headers: {
        // Without an explicit charset some clients decode UTF-8 as Latin-1
        // and the em dash in the title arrives as "â€”".
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=2, stale-while-revalidate=5",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
