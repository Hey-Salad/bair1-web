import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromHeaders, validateApiKeyOrSession } from "@/lib/api-keys";
import { getDevice } from "@/lib/devices";
import { getReadings } from "@/lib/dynamo";
import { detectRides } from "@/lib/rides";
import { createShare, revokeShare, DEFAULT_FUZZ_METRES } from "@/lib/shares";

export const dynamic = "force-dynamic";

/** Create an unlisted share link for one ride. */
export async function POST(
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
    const device = await getDevice(deviceId);
    if (!device) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }
    // Sharing publishes data, so it always requires ownership — a system key
    // reading everything is not the same as permission to expose someone's
    // route publicly.
    const ownerId = principal.type === "developer" ? principal.userId : device.ownerId;
    if (principal.type === "developer" && device.ownerId !== principal.userId) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }

    let body: { fuzzMetres?: number; expiresInDays?: number | null } = {};
    try {
      body = await req.json();
    } catch {
      /* empty body is fine — defaults apply */
    }

    // The ride has to exist before we hand out a link to it.
    const readings = await getReadings(deviceId, 4000);
    const ride = detectRides(deviceId, readings).find(
      (r) => r.rideId === decodeURIComponent(rideId)
    );
    if (!ride) {
      return NextResponse.json({ error: "ride not found" }, { status: 404 });
    }

    const fuzzMetres =
      body.fuzzMetres == null
        ? DEFAULT_FUZZ_METRES
        : Math.max(0, Math.min(5000, Number(body.fuzzMetres) || 0));

    const share = await createShare({
      deviceId,
      rideId: ride.rideId,
      ownerId,
      fuzzMetres,
      expiresInDays: body.expiresInDays ?? null,
    });

    const origin = new URL(req.url).origin;
    return NextResponse.json({
      data: {
        token: share.token,
        url: `${origin}/s/${share.token}`,
        fuzzMetres: share.fuzzMetres,
        expiresAt: share.expiresAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/.../rides/[rideId]/share] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Revoke a share link. Pass ?token=... */
export async function DELETE(
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
    const { deviceId } = await params;
    const device = await getDevice(deviceId);
    if (!device) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }
    const ownerId = principal.type === "developer" ? principal.userId : device.ownerId;
    if (principal.type === "developer" && device.ownerId !== principal.userId) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }

    const token = new URL(req.url).searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const ok = await revokeShare(token, ownerId);
    if (!ok) {
      return NextResponse.json({ error: "share not found" }, { status: 404 });
    }
    return NextResponse.json({ data: { revoked: true } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/.../rides/[rideId]/share] DELETE error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
