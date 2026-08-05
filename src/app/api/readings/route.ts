import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromHeaders, validateApiKey } from "@/lib/api-keys";
import { getLatestReadings, storeReading } from "@/lib/dynamo";
import { resolveCellTower } from "@/lib/geolocation";
import { getDevice, createDevice, updateDevice } from "@/lib/devices";

export async function POST(req: NextRequest) {
  const principal = await validateApiKey(
    extractApiKeyFromHeaders(req.headers),
    ["write:readings"]
  );
  if (!principal) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const deviceId = String(body.deviceId ?? "unknown");
  const pm25 = body.pm25 != null ? Number(body.pm25) : null;
  const aqi = Number(body.aqi ?? pm25 ?? 0);
  const gasRaw = body.gasRaw != null ? Number(body.gasRaw) : null;
  const gasVoltage = body.gasVoltage != null ? Number(body.gasVoltage) : null;
  const airState = body.airState ? String(body.airState) : null;
  const rssi = body.rssi != null ? Number(body.rssi) : null;
  const firmwareVersion = body.firmwareVersion ? String(body.firmwareVersion) : null;
  const uptimeMs = body.uptimeMs != null ? Number(body.uptimeMs) : null;
  const sample = body.sample != null ? Number(body.sample) : null;
  const transport = body.transport ? String(body.transport) : null;

  try {
    // Resolve cell tower to lat/lng if present and no lat/lng already
    const ct = body.cellTower as Record<string, unknown> | undefined;
    if (ct && body.lat == null && body.lng == null) {
      const loc = await resolveCellTower({
        mcc: Number(ct.mcc ?? 0),
        mnc: Number(ct.mnc ?? 0),
        lac: Number(ct.lac ?? 0),
        cid: Number(ct.cid ?? 0),
      });
      if (loc) {
        body.lat = loc.lat;
        body.lng = loc.lng;
        body.locationAccuracy = loc.accuracy;
        body.locationSource = "cellTower";
      }
    }

    const existing = await getDevice(deviceId);
    if (principal.type === "developer" && existing && existing.ownerId !== principal.userId) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }

    const stored = await storeReading({
      deviceId,
      aqi,
      gasRaw,
      gasVoltage,
      airState,
      rssi,
      firmwareVersion,
      uptimeMs,
      sample,
      transport,
      rawPayload: body,
    });

    // Auto-register device if not yet known
    if (!existing) {
      const family = body.family ? String(body.family) : "";
      const preferredName =
        body.deviceName ? String(body.deviceName) :
        body.name ? String(body.name) :
        family ? `${family} sensor` :
        deviceId;
      await createDevice({
        deviceId,
        name: preferredName,
        location: "",
        lat: body.lat != null ? Number(body.lat) : null,
        lng: body.lng != null ? Number(body.lng) : null,
        ownerId: principal.type === "developer" ? principal.userId : "",
        orgId: principal.orgId,
        status: "active",
        createdAt: new Date().toISOString(),
      });
    } else if (body.lat != null && body.lng != null) {
      await updateDevice(deviceId, { lat: Number(body.lat), lng: Number(body.lng) });
    }

    return NextResponse.json({
      ok: true,
      stored,
      deviceId,
      aqi,
      pm25,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[readings] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({ readings: await getLatestReadings(20) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
