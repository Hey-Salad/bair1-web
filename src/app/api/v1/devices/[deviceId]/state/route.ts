import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromHeaders, validateApiKeyOrSession } from "@/lib/api-keys";
import { getDeviceState, getLatestReading } from "@/lib/dynamo";

export const dynamic = "force-dynamic";

// GET /state — last-known snapshot: latest reading + last acked LED state.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const principal = await validateApiKeyOrSession(
    extractApiKeyFromHeaders(req.headers),
    ["read:devices"],
  );
  if (!principal) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { deviceId } = await params;
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  const [reading, state] = await Promise.all([
    getLatestReading(deviceId),
    getDeviceState(deviceId),
  ]);

  return NextResponse.json({
    deviceId,
    led: state.led,
    lastSeenAt: state.lastSeenAt,
    stateUpdatedAt: state.updatedAt,
    reading: reading ?? null,
  });
}
