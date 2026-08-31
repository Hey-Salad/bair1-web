import { createHmac, timingSafeEqual } from "node:crypto";

const SHARE_VERSION = "v1";

function shareSecret() {
  const secret = process.env.DEVICE_SHARE_SECRET ?? process.env.NOTEHUB_DEVICE_ID_SALT;
  if (!secret) throw new Error("device sharing is not configured");
  return secret;
}

export function createDeviceShareToken(deviceId: string) {
  return createHmac("sha256", shareSecret())
    .update(`${SHARE_VERSION}:${deviceId}`)
    .digest("base64url");
}

export function verifyDeviceShareToken(deviceId: string, supplied: string | null | undefined) {
  if (!supplied) return false;
  const expected = createDeviceShareToken(deviceId);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length
    && timingSafeEqual(suppliedBuffer, expectedBuffer);
}
