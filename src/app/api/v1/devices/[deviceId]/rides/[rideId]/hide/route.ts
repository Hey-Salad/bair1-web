import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromHeaders, validateApiKeyOrSession } from "@/lib/api-keys";
import { getDevice } from "@/lib/devices";
import { listHiddenRideIds, setRideHidden } from "@/lib/dynamo";

export const dynamic = "force-dynamic";

/**
 * Hide or unhide one journey.
 *
 * Journeys are derived from readings, so there is nothing to delete — hiding
 * records an exclusion instead, and it is reversible. Requires ownership: a
 * read-scoped key should not be able to change what a public page shows.
 */
async function authorise(req: NextRequest, deviceId: string) {
  const principal = await validateApiKeyOrSession(
    extractApiKeyFromHeaders(req.headers),
    ["read:readings"],
  );
  if (!principal) return { error: "unauthorized" as const, status: 401 };
  const device = await getDevice(deviceId);
  if (!device) return { error: "device not found" as const, status: 404 };
  if (principal.type === "developer" && device.ownerId !== principal.userId) {
    return { error: "device not found" as const, status: 404 };
  }
  return { ok: true as const };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string; rideId: string }> },
) {
  try {
    const { deviceId, rideId } = await params;
    const auth = await authorise(req, deviceId);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    await setRideHidden(deviceId, decodeURIComponent(rideId), true);
    return NextResponse.json({ data: { rideId: decodeURIComponent(rideId), hidden: true } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/.../rides/[rideId]/hide] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string; rideId: string }> },
) {
  try {
    const { deviceId, rideId } = await params;
    const auth = await authorise(req, deviceId);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    await setRideHidden(deviceId, decodeURIComponent(rideId), false);
    return NextResponse.json({ data: { rideId: decodeURIComponent(rideId), hidden: false } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/.../rides/[rideId]/hide] DELETE error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  try {
    const { deviceId } = await params;
    const auth = await authorise(req, deviceId);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    return NextResponse.json({ data: await listHiddenRideIds(deviceId) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
