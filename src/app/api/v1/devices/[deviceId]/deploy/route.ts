import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromHeaders, validateApiKeyOrSession } from "@/lib/api-keys";
import { getDevice } from "@/lib/devices";
import { enqueueCommand, getDeviceFirmware } from "@/lib/dynamo";
import { getFirmwareDownloadUrl, isR2Configured } from "@/lib/r2";

export const dynamic = "force-dynamic";

// POST /api/v1/devices/[deviceId]/deploy
//   Orchestrate an OTA deployment: generate a presigned R2 download URL for the
//   previously-uploaded firmware binary and enqueue an `ota_update` command for
//   the device to fetch + install it. Requires write:devices scope.
//
// Body: { "version": "bair1-genesis-v2.1" }
//   If version is omitted, the most recently uploaded firmware is used.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const principal = await validateApiKeyOrSession(
    extractApiKeyFromHeaders(req.headers),
    ["write:devices"],
  );
  if (!principal) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { deviceId } = await params;
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  if (principal.type === "developer") {
    const device = await getDevice(deviceId);
    if (device && device.ownerId !== principal.userId) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "R2 not configured — set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY env vars" },
      { status: 500 },
    );
  }

  let body: { version?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const firmware = await getDeviceFirmware(deviceId);
  if (!firmware || !firmware.r2Key) {
    return NextResponse.json(
      { error: "no firmware uploaded yet — POST to /firmware first" },
      { status: 404 },
    );
  }

  // If a version is supplied, it must match the uploaded firmware's version.
  if (body.version && body.version !== firmware.version) {
    return NextResponse.json(
      { error: `version mismatch — uploaded firmware is ${firmware.version}, requested ${body.version}` },
      { status: 400 },
    );
  }

  try {
    // 15-minute presigned URL — device polls every 5s, download <30s on WiFi.
    const url = await getFirmwareDownloadUrl(firmware.r2Key, 900);
    const command = await enqueueCommand(deviceId, "ota_update", {
      url,
      version: firmware.version,
      sha256: firmware.sha256,
      r2Key: firmware.r2Key,
    });
    const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();
    return NextResponse.json({
      ok: true,
      deviceId,
      commandId: command.commandId,
      version: firmware.version,
      presignedUrlExpiresAt: expiresAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[deploy] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
