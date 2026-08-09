import { NextResponse } from "next/server";

import {
  CITY_ATTRIBUTION,
  TFL_ATTRIBUTION,
  getCycleInfrastructure,
} from "@/lib/cycle-infrastructure";

export async function GET() {
  try {
    const data = await getCycleInfrastructure();

    return NextResponse.json(
      { ...data, attribution: [TFL_ATTRIBUTION, CITY_ATTRIBUTION] },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
