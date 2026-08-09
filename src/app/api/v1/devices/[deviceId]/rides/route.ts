import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromHeaders, validateApiKeyOrSession } from "@/lib/api-keys";
import { getDevice } from "@/lib/devices";
import { getReadings, getReadingsInRange } from "@/lib/dynamo";
import { detectRides, toSummary } from "@/lib/rides";
import { rangeFromSearchParams } from "@/lib/time-range";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const principal = await validateApiKeyOrSession(
    extractApiKeyFromHeaders(req.headers),
    ["read:readings"]
  );
  if (!principal) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { deviceId } = await params;

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
    }
    if (principal.type === "developer") {
      const device = await getDevice(deviceId);
      if (!device || device.ownerId !== principal.userId) {
        return NextResponse.json({ error: "device not found" }, { status: 404 });
      }
    }

    const url = new URL(req.url);
    const scanParam = url.searchParams.get("scan");
    const includePoints = url.searchParams.get("points") === "1";
    // Rides are inferred from a window of readings, so the caller controls how
    // far back we look rather than how many rides come out.
    const scan = scanParam
      ? Math.min(Math.max(1, parseInt(scanParam, 10) || 2000), 10000)
      : 2000;

    const hasWindow = url.searchParams.has("range") ||
      (url.searchParams.has("from") && url.searchParams.has("to"));
    let readings;
    let window = null;
    if (hasWindow) {
      window = rangeFromSearchParams(url.searchParams);
      if (!window) {
        return NextResponse.json({ error: "Invalid date format. Use ISO 8601." }, { status: 400 });
      }
      readings = await getReadingsInRange(deviceId, window.from, window.to);
    } else {
      readings = await getReadings(deviceId, scan);
    }

    const rides = detectRides(deviceId, readings);

    return NextResponse.json({
      data: includePoints ? rides : rides.map(toSummary),
      meta: {
        deviceId,
        readingsScanned: readings.length,
        rideCount: rides.length,
        range: window ? { key: window.key, from: window.from, to: window.to, exceedsRetention: window.exceedsRetention } : null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/devices/[deviceId]/rides] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
