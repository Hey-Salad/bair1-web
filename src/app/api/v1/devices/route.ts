import { NextRequest, NextResponse } from "next/server";
import { getAllDevicesRegistry } from "@/lib/devices";
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

export async function GET(req: NextRequest) {
  const key = extractApiKey(req);
  if (key !== API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const devices = await getAllDevicesRegistry();

    const devicesWithLatest = await Promise.all(
      devices.map(async (device) => {
        const latestReading = await getLatestReading(device.deviceId);
        return {
          ...device,
          latestReading: latestReading ?? null,
        };
      })
    );

    return NextResponse.json({ data: devicesWithLatest });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[api/v1/devices] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
