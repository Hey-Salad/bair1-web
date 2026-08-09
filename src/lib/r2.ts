import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 (S3-compatible) client for firmware binary storage.
// Requires these env vars on the Vercel project:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
// The S3-compatible endpoint is https://<account_id>.r2.cloudflarestorage.com

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "bair1-firmware";
const R2_ENDPOINT = process.env.R2_ENDPOINT ?? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const s3 = R2_ACCESS_KEY_ID
  ? new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

export function isR2Configured(): boolean {
  return s3 !== null && R2_ACCOUNT_ID.length > 0;
}

/**
 * Upload a firmware binary to R2 under firmware/<deviceId>/<version>.bin.
 * Returns the R2 object key (not a URL).
 */
export async function uploadFirmware(
  deviceId: string,
  version: string,
  buffer: Buffer,
): Promise<string> {
  if (!s3) throw new Error("R2 not configured");
  const key = `firmware/${deviceId}/${version}.bin`;
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "application/octet-stream",
    }),
  );
  return key;
}

/**
 * Generate a short-lived presigned HTTPS URL for the ESP32 to download the
 * firmware binary with a plain GET (no auth headers needed).
 * Default TTL: 15 minutes (900s) — device polls every 5s, download <30s.
 */
export async function getFirmwareDownloadUrl(
  r2Key: string,
  ttlSeconds = 900,
): Promise<string> {
  if (!s3) throw new Error("R2 not configured");
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: r2Key }),
    { expiresIn: ttlSeconds },
  );
}

/** Remove a firmware binary from R2 (cleanup, optional). */
export async function deleteFirmware(r2Key: string): Promise<void> {
  if (!s3) return;
  await s3.send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: r2Key }),
  );
}
