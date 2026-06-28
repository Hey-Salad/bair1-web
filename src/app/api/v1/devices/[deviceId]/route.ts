import { NextRequest, NextResponse } from "next/server";
import { getDevice } from "@/lib/devices";
import { getLatestReading } from "@/lib/dynamo";

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

    const device = await getDevice(deviceId);
    if (!device) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }

    const latestReading = await getLatestReading(deviceId);

    return NextResponse.json({
      data: {
        ...device,
        latestReading: latestReading ?? null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/devices/[deviceId]] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
