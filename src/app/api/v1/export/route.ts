import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromHeaders, validateApiKey } from "@/lib/api-keys";
import { getDevice, getDevicesForUser } from "@/lib/devices";
import { getReadings, getReadingsInRange, Reading } from "@/lib/dynamo";
import { getAllDevices } from "@/lib/dynamo";
import { rangeFromSearchParams } from "@/lib/time-range";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 10000;

function escapeCsvField(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function readingsToCsv(readings: Reading[]): string {
  const headers = [
    "deviceId",
    "timestamp",
    "aqi",
    "pm1",
    "pm25",
    "pm4",
    "pm10",
    "gasRaw",
    "gasVoltage",
    "airState",
    "rssi",
    "firmwareVersion",
    "uptimeMs",
    "sample",
    "transport",
    "lat",
    "lng",
    "sensorModel",
    "board",
  ];

  const rows = readings.map((r) =>
    headers.map((h) => escapeCsvField(r[h as keyof Reading])).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export async function GET(req: NextRequest) {
  const principal = await validateApiKey(
    extractApiKeyFromHeaders(req.headers),
    ["export:readings"]
  );
  if (!principal) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json";
    const deviceParam = url.searchParams.get("device");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limitParam = url.searchParams.get("limit");

    if (format !== "json" && format !== "csv") {
      return NextResponse.json(
        { error: "Invalid format. Use 'json' or 'csv'." },
        { status: 400 }
      );
    }

    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT), MAX_LIMIT)
      : DEFAULT_LIMIT;

    // Determine which devices to export
    let deviceIds: string[];
    if (deviceParam) {
      if (principal.type === "developer") {
        const device = await getDevice(deviceParam);
        if (!device || device.ownerId !== principal.userId) {
          return NextResponse.json({ error: "device not found" }, { status: 404 });
        }
      }
      deviceIds = [deviceParam];
    } else {
      deviceIds = principal.type === "system"
        ? await getAllDevices()
        : (await getDevicesForUser(principal.userId)).map((device) => device.deviceId);
    }

    // Gather readings
    // ?range=24h|7d|30d|90d is shorthand; an explicit from/to still wins, so
    // existing export integrations are untouched.
    const hasWindow = url.searchParams.has("range") || (from != null && to != null);
    const window = hasWindow ? rangeFromSearchParams(url.searchParams) : null;
    if (hasWindow && !window) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601." },
        { status: 400 }
      );
    }

    let allReadings: Reading[] = [];
    for (const deviceId of deviceIds) {
      let readings: Reading[];
      if (window) {
        readings = await getReadingsInRange(deviceId, window.from, window.to);
      } else {
        readings = await getReadings(deviceId, limit);
      }
      allReadings = allReadings.concat(readings);
      if (allReadings.length >= limit) break;
    }

    // Apply limit
    allReadings = allReadings.slice(0, limit);

    if (format === "csv") {
      const csv = readingsToCsv(allReadings);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="bair1-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ data: allReadings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/export] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
