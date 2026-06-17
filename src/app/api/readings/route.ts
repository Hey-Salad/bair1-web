import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureTable } from "@/lib/db";

const API_KEY = process.env.SENSOR_API_KEY!;

export async function POST(req: NextRequest) {
  // Auth check
  const key = req.headers.get("x-api-key");
  if (key !== API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const deviceId = String(body.deviceId ?? "unknown");
  const aqi = Number(body.aqi ?? 0);
  const gasRaw = body.gasRaw != null ? Number(body.gasRaw) : null;
  const gasVoltage = body.gasVoltage != null ? Number(body.gasVoltage) : null;
  const airState = body.airState ? String(body.airState) : null;
  const rssi = body.rssi != null ? Number(body.rssi) : null;
  const firmwareVersion = body.firmwareVersion ? String(body.firmwareVersion) : null;
  const uptimeMs = body.uptimeMs != null ? Number(body.uptimeMs) : null;
  const sample = body.sample != null ? Number(body.sample) : null;
  const transport = body.transport ? String(body.transport) : null;

  try {
    const sql = getDb();
    await ensureTable();

    await sql`
      INSERT INTO readings (device_id, aqi, gas_raw, gas_voltage, air_state, rssi, firmware_version, uptime_ms, sample, transport, raw_payload)
      VALUES (${deviceId}, ${aqi}, ${gasRaw}, ${gasVoltage}, ${airState}, ${rssi}, ${firmwareVersion}, ${uptimeMs}, ${sample}, ${transport}, ${JSON.stringify(body)})
    `;

    return NextResponse.json({ ok: true, deviceId, aqi, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[readings] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTable();

    const rows = await sql`
      SELECT * FROM readings ORDER BY created_at DESC LIMIT 20
    `;

    return NextResponse.json({ readings: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
