import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { randomBytes } from "crypto";
import { dynamoClient } from "./aws-dynamo";
import type { Ride, RidePoint } from "./rides";

/**
 * Unlisted share links for rides.
 *
 * A share is a random token that resolves to one ride, readable by anyone
 * holding the link and revocable by the owner. Deliberately *not* a public
 * gallery: the link is the capability, and nothing enumerates it.
 *
 * Requires a DynamoDB table `bair1-shares`:
 *   partition key  token  (S)
 *   GSI            owner-index  →  ownerId (S) / createdAt (S)
 *   TTL attribute  expiresAt
 */
const TABLE = "bair1-shares";
const OWNER_INDEX = "owner-index";

/** A shared route reveals where someone rides. Endpoints are the sensitive
 *  part: the start of a commute is usually a home address. Default to blurring
 *  both ends onto a grid, so a shared link places the rider in a
 *  neighbourhood, never at a door. */
export const DEFAULT_FUZZ_METRES = 500;

export type Share = {
  token: string;
  deviceId: string;
  rideId: string;
  ownerId: string;
  createdAt: string;
  /** 0 disables blurring — an explicit opt-in to publishing exact endpoints. */
  fuzzMetres: number;
  expiresAt: number | null;
};

const text = (i: Record<string, AttributeValue>, k: string) => i[k]?.S ?? "";
const num = (i: Record<string, AttributeValue>, k: string) =>
  i[k]?.N == null ? null : Number(i[k].N);

function parseItem(item: Record<string, AttributeValue>): Share {
  return {
    token: text(item, "token"),
    deviceId: text(item, "deviceId"),
    rideId: text(item, "rideId"),
    ownerId: text(item, "ownerId"),
    createdAt: text(item, "createdAt"),
    fuzzMetres: num(item, "fuzzMetres") ?? DEFAULT_FUZZ_METRES,
    expiresAt: num(item, "expiresAt"),
  };
}

/** URL-safe, unguessable, and short enough to paste into a message. */
export function newShareToken(): string {
  return randomBytes(9).toString("base64url"); // 72 bits
}

export async function createShare(input: {
  deviceId: string;
  rideId: string;
  ownerId: string;
  fuzzMetres?: number;
  expiresInDays?: number | null;
}): Promise<Share> {
  const share: Share = {
    token: newShareToken(),
    deviceId: input.deviceId,
    rideId: input.rideId,
    ownerId: input.ownerId,
    createdAt: new Date().toISOString(),
    fuzzMetres: input.fuzzMetres ?? DEFAULT_FUZZ_METRES,
    expiresAt: input.expiresInDays
      ? Math.floor(Date.now() / 1000) + input.expiresInDays * 86400
      : null,
  };

  const item: Record<string, AttributeValue> = {
    token: { S: share.token },
    deviceId: { S: share.deviceId },
    rideId: { S: share.rideId },
    ownerId: { S: share.ownerId },
    createdAt: { S: share.createdAt },
    fuzzMetres: { N: String(share.fuzzMetres) },
  };
  if (share.expiresAt) item.expiresAt = { N: String(share.expiresAt) };

  await dynamoClient.send(new PutItemCommand({ TableName: TABLE, Item: item }));
  return share;
}

export async function getShare(token: string): Promise<Share | null> {
  if (!token) return null;
  const res = await dynamoClient.send(
    new GetItemCommand({ TableName: TABLE, Key: { token: { S: token } } }),
  );
  if (!res.Item) return null;
  const share = parseItem(res.Item);
  // TTL deletion is eventual, so an expired row can still be returned.
  if (share.expiresAt && share.expiresAt * 1000 < Date.now()) return null;
  return share;
}

export async function revokeShare(token: string, ownerId: string): Promise<boolean> {
  const existing = await getShare(token);
  if (!existing || existing.ownerId !== ownerId) return false;
  await dynamoClient.send(
    new DeleteItemCommand({ TableName: TABLE, Key: { token: { S: token } } }),
  );
  return true;
}

export async function listSharesForOwner(ownerId: string): Promise<Share[]> {
  const res = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: OWNER_INDEX,
      KeyConditionExpression: "ownerId = :o",
      ExpressionAttributeValues: { ":o": { S: ownerId } },
      ScanIndexForward: false,
    }),
  );
  return (res.Items ?? []).map(parseItem);
}

/* -------------------------------------------------------------------------- */

/** Snap a coordinate onto a grid of the given size. Snapping rather than adding
 *  random jitter matters: jitter re-rolls per render, and averaging repeated
 *  views of the same point recovers the true location. A grid is stable. */
function snapToGrid(lat: number, lng: number, metres: number) {
  const latStep = metres / 111_320;
  const lngStep = metres / (111_320 * Math.cos((lat * Math.PI) / 180) || 1);
  return {
    lat: Math.round(lat / latStep) * latStep,
    lng: Math.round(lng / lngStep) * lngStep,
  };
}

/**
 * Public projection of a ride. Drops the deviceId and every owner-identifying
 * field, and blurs the endpoints unless sharing was explicitly set to exact.
 *
 * Blurring only the first and last fixes would be theatre — the second fix is
 * a minute from the first and gives the origin away. We blur every fix within
 * `fuzzMetres` of either end.
 */
export type PublicRide = Omit<Ride, "deviceId" | "points" | "track"> & {
  points: RidePoint[];
  track: RidePoint[];
  fuzzMetres: number;
};

export function toPublicRide(ride: Ride, fuzzMetres: number): PublicRide {
  const { deviceId: _deviceId, ...rest } = ride;
  void _deviceId;

  if (fuzzMetres <= 0) {
    return { ...rest, points: ride.points, track: ride.track, fuzzMetres: 0 };
  }

  const fixes = ride.track.filter(
    (p): p is RidePoint & { lat: number; lng: number } => p.lat != null && p.lng != null,
  );
  if (fixes.length === 0) return { ...rest, points: ride.points, track: ride.track, fuzzMetres };

  const first = fixes[0];
  const last = fixes[fixes.length - 1];
  const nearEnd = (p: { lat: number; lng: number }) =>
    metresBetween(p, first) < fuzzMetres || metresBetween(p, last) < fuzzMetres;

  const blur = (p: RidePoint): RidePoint => {
    if (p.lat == null || p.lng == null) return p;
    if (!nearEnd({ lat: p.lat, lng: p.lng })) return p;
    const snapped = snapToGrid(p.lat, p.lng, fuzzMetres);
    return {
      ...p,
      lat: snapped.lat,
      lng: snapped.lng,
      // Report honest uncertainty rather than the original tight accuracy.
      locationAccuracy: Math.max(p.locationAccuracy ?? 0, fuzzMetres),
    };
  };

  const points = ride.points.map(blur);
  const track = ride.track.map(blur);

  const blurredFixes = track.filter(
    (p): p is RidePoint & { lat: number; lng: number } => p.lat != null && p.lng != null,
  );

  return {
    ...rest,
    points,
    track,
    fuzzMetres,
    startPoint: blurredFixes.length ? { lat: blurredFixes[0].lat, lng: blurredFixes[0].lng } : null,
    endPoint: blurredFixes.length
      ? { lat: blurredFixes[blurredFixes.length - 1].lat, lng: blurredFixes[blurredFixes.length - 1].lng }
      : null,
    bbox: blurredFixes.length
      ? {
          minLat: Math.min(...blurredFixes.map((p) => p.lat)),
          maxLat: Math.max(...blurredFixes.map((p) => p.lat)),
          minLng: Math.min(...blurredFixes.map((p) => p.lng)),
          maxLng: Math.max(...blurredFixes.map((p) => p.lng)),
        }
      : null,
    // The exact fixes we rejected are an owner-side diagnostic, not something
    // a share recipient needs — and they carry unblurred coordinates.
    rejectedFixes: [],
  };
}

function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
