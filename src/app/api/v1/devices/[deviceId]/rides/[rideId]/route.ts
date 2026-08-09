import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromHeaders, validateApiKeyOrSession } from "@/lib/api-keys";
import { getDevice } from "@/lib/devices";
import { getReadings } from "@/lib/dynamo";
import { detectRides } from "@/lib/rides";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string; rideId: string }> }
) {
  const principal = await validateApiKeyOrSession(
    extractApiKeyFromHeaders(req.headers),
    ["read:readings"]
  );
  if (!principal) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { deviceId, rideId } = await params;

    if (!deviceId || !rideId) {
      return NextResponse.json({ error: "deviceId and rideId are required" }, { status: 400 });
    }
    if (principal.type === "developer") {
      const device = await getDevice(deviceId);
      if (!device || device.ownerId !== principal.userId) {
        return NextResponse.json({ error: "device not found" }, { status: 404 });
      }
    }

    const url = new URL(req.url);
    const scanParam = url.searchParams.get("scan");
    const scan = scanParam
      ? Math.min(Math.max(1, parseInt(scanParam, 10) || 4000), 10000)
      : 4000;

    const readings = await getReadings(deviceId, scan);
    const ride = detectRides(deviceId, readings).find((r) => r.rideId === decodeURIComponent(rideId));

    if (!ride) {
      return NextResponse.json(
        { error: "ride not found in the scanned window. Try a larger ?scan=." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: ride });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/devices/[deviceId]/rides/[rideId]] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
