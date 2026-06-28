import { NextRequest, NextResponse } from "next/server";
import { getReadings, getReadingsInRange, Reading } from "@/lib/dynamo";

export const dynamic = "force-dynamic";

const API_KEY = process.env.SENSOR_API_KEY!;

function extractApiKey(req: NextRequest): string | null {
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey) return xApiKey;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function computeAnalytics(readings: Reading[]) {
  if (readings.length === 0) {
    return {
      totalReadings: 0,
      avgAqi: null,
      minAqi: null,
      maxAqi: null,
      avgPm25: null,
      firstReading: null,
      lastReading: null,
    };
  }

  const aqiValues = readings.map((r) => r.aqi);
  const pm25Values = readings.filter((r) => r.pm25 != null).map((r) => r.pm25 as number);
  const timestamps = readings
    .map((r) => r.timestamp)
    .filter(Boolean)
    .sort();

  const sumAqi = aqiValues.reduce((a, b) => a + b, 0);
  const sumPm25 = pm25Values.reduce((a, b) => a + b, 0);

  return {
    totalReadings: readings.length,
    avgAqi: Math.round((sumAqi / aqiValues.length) * 100) / 100,
    minAqi: Math.min(...aqiValues),
    maxAqi: Math.max(...aqiValues),
    avgPm25: pm25Values.length > 0
      ? Math.round((sumPm25 / pm25Values.length) * 100) / 100
      : null,
    firstReading: timestamps[0] ?? null,
    lastReading: timestamps[timestamps.length - 1] ?? null,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const key = extractApiKey(req);
  if (key !== API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { deviceId } = await params;

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    let readings: Reading[];
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return NextResponse.json({ error: "Invalid date format. Use ISO 8601." }, { status: 400 });
      }
      readings = await getReadingsInRange(deviceId, from, to);
    } else {
      // Default: fetch up to 10000 readings for analytics
      readings = await getReadings(deviceId, 10000);
    }

    const analytics = computeAnalytics(readings);

    return NextResponse.json({
      data: {
        deviceId,
        ...analytics,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/devices/[deviceId]/analytics] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
