import { NextRequest, NextResponse } from "next/server";

import { getCycleInfrastructure } from "@/lib/cycle-infrastructure";
import {
  isR2Configured,
  uploadBikePointStations,
  uploadBikePointSnapshot,
} from "@/lib/r2";

/**
 * Archive one BikePoint availability snapshot to R2.
 *
 * TfL publishes no history for dock availability — BikePoint is point-in-time only, so
 * any interval that is not captured is lost permanently. This route exists to build
 * the time series that exposure work needs, and is driven by the Vercel cron in
 * vercel.json.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;

  // Without a secret configured, only allow local invocation so a missing env var
  // cannot quietly leave the production endpoint open.
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      {
        error: "R2 not configured",
        need: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"],
      },
      { status: 503 },
    );
  }

  try {
    const { docks, summary } = await getCycleInfrastructure();
    const takenAt = new Date();

    // Compact tuples keep a snapshot at a few KB. Station geography lives in the
    // separate daily manifest, which these rows join against on id.
    const snapshot = {
      t: Math.floor(takenAt.getTime() / 1000),
      f: ["id", "bikes", "ebikes", "standard", "emptyDocks"],
      s: docks.features.map((f) => [
        Number(f.properties.id.replace("BikePoints_", "")),
        f.properties.bikes,
        f.properties.eBikes,
        f.properties.standardBikes,
        f.properties.emptyDocks,
      ]),
    };

    const stations = {
      retrievedAt: takenAt.toISOString(),
      attribution: "Powered by TfL Open Data",
      stations: docks.features.map((f) => ({
        id: Number(f.properties.id.replace("BikePoints_", "")),
        name: f.properties.name,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        docks: f.properties.docks,
      })),
    };

    const [snapshotKey, stationsKey] = await Promise.all([
      uploadBikePointSnapshot(takenAt, snapshot),
      uploadBikePointStations(takenAt, stations),
    ]);

    return NextResponse.json({
      ok: true,
      takenAt: takenAt.toISOString(),
      snapshotKey,
      stationsKey,
      stations: summary.stations,
      eBikes: summary.eBikes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
