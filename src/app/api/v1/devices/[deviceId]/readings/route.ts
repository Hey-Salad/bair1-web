import { NextRequest, NextResponse } from "next/server";
import { getReadings, getReadingsInRange } from "@/lib/dynamo";

export const dynamic = "force-dynamic";

const API_KEY = process.env.SENSOR_API_KEY!;

function extractApiKey(req: NextRequest): string | null {
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey) return xApiKey;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
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
    const limitParam = url.searchParams.get("limit");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 10000) : 50;

    let readings;
    if (from && to) {
      // Validate ISO date strings
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return NextResponse.json({ error: "Invalid date format. Use ISO 8601." }, { status: 400 });
      }
      readings = await getReadingsInRange(deviceId, from, to);
      // Apply limit after range query
      readings = readings.slice(0, limit);
    } else {
      readings = await getReadings(deviceId, limit);
    }

    return NextResponse.json({ data: readings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/devices/[deviceId]/readings] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
