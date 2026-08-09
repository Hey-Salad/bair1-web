import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromHeaders, validateApiKeyOrSession } from "@/lib/api-keys";
import { ackCommand, getCommand, setDeviceState, setDeviceFirmware } from "@/lib/dynamo";

export const dynamic = "force-dynamic";

// Device firmware acks a command here. Auth: SENSOR_API_KEY (system).
// Side effects:
//   - set_led: persist LED on/brightness/mode/color so dashboards can read it
//     via /state.
//   - ota_update (ok=true): persist the new firmware version as the device's
//     current firmware.
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

  let body: { commandId?: string; ok?: boolean; result?: Record<string, unknown>; firmwareVersion?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { commandId, ok, result } = body;
  if (!commandId) {
    return NextResponse.json({ error: "commandId is required" }, { status: 400 });
  }

  const existing = await getCommand(deviceId, commandId);
  try {
    await ackCommand(deviceId, commandId, Boolean(ok), result ?? null);

    if (existing?.type === "set_led" && existing.payload) {
      const on = existing.payload["on"];
      const brightness = existing.payload["brightness"];
      const mode = existing.payload["mode"];
      const color = existing.payload["color"];
      if (typeof on === "boolean") {
        // Parse hex color "#RRGGBB" → number; leave named colors for the device
        // (state stores the numeric manualColor the device echoed back).
        let manualColor: number | undefined;
        if (typeof color === "string" && color.startsWith("#")) {
          manualColor = parseInt(color.slice(1), 16) || 0;
        }
        await setDeviceState(deviceId, {
          on,
          brightness: typeof brightness === "number" ? brightness : 0,
          mode: typeof mode === "string" ? mode : undefined,
          manualColor,
        });
      }
    }

    if (existing?.type === "ota_update" && Boolean(ok) && existing.payload) {
      const version = existing.payload["version"];
      if (typeof version === "string" && version.length > 0) {
        // Persist the deployed firmware metadata as the device's current firmware.
        await setDeviceFirmware(deviceId, {
          version,
          r2Key: String(existing.payload["r2Key"] ?? ""),
          sha256: typeof existing.payload["sha256"] === "string"
            ? String(existing.payload["sha256"])
            : null,
        });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[ack] error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
