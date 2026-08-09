import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { extractApiKeyFromHeaders, validateApiKeyOrSession } from "@/lib/api-keys";
import { getDevice } from "@/lib/devices";
import { getDeviceFirmware, setDeviceFirmware, getLatestReading } from "@/lib/dynamo";
import { uploadFirmware, isR2Configured } from "@/lib/r2";

export const dynamic = "force-dynamic";

// POST  /api/v1/devices/[deviceId]/firmware
//   Upload a firmware .bin to R2 and record metadata in DynamoDB.
//   Multipart form: field "file" (the .bin), field "version" (e.g. "bair1-genesis-v2.1").
//   Requires write:devices scope (developer who owns the device, or admin/system).
// GET /api/v1/devices/[deviceId]/firmware
//   Returns the device's current + target firmware metadata.

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

  // Developers can only upload firmware for devices they own; system/admin can do any.
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

  const formData = await req.formData();
  const file = formData.get("file");
  const version = formData.get("version");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "missing or empty 'file' field" }, { status: 400 });
  }
  if (typeof version !== "string" || version.length === 0) {
    return NextResponse.json({ error: "missing 'version' field" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  try {
    const r2Key = await uploadFirmware(deviceId, version, buffer);
    await setDeviceFirmware(deviceId, { version, r2Key, sha256 });
    return NextResponse.json({
      ok: true,
      deviceId,
      version,
      sha256,
      r2Key,
      size: buffer.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[firmware] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

  const [firmware, reading] = await Promise.all([
    getDeviceFirmware(deviceId),
    getLatestReading(deviceId),
  ]);

  return NextResponse.json({
    deviceId,
    currentVersion: reading?.firmwareVersion ?? null,
    targetVersion: firmware?.version ?? null,
    r2Key: firmware?.r2Key ?? null,
    sha256: firmware?.sha256 ?? null,
    uploadedAt: firmware?.uploadedAt ?? null,
    lastSeenAt: reading?.timestamp ?? null,
  });
}
