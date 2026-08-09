import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromHeaders, validateApiKeyOrSession } from "@/lib/api-keys";
import { getCommand } from "@/lib/dynamo";

export const dynamic = "force-dynamic";

// GET /commands/[commandId] — poll status of a single command (dashboard uses this).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string; commandId: string }> }
) {
  const principal = await validateApiKeyOrSession(
    extractApiKeyFromHeaders(req.headers),
    ["read:devices"],
  );
  if (!principal) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { deviceId, commandId } = await params;
  if (!deviceId || !commandId) {
    return NextResponse.json({ error: "deviceId and commandId required" }, { status: 400 });
  }
  const command = await getCommand(deviceId, commandId);
  if (!command) {
    return NextResponse.json({ error: "command not found" }, { status: 404 });
  }
  return NextResponse.json({ command });
}
