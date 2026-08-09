/**
 * London cycle infrastructure — the two micromobility sources that are openly
 * licensed and usable today. Used as an exposure covariate layer on the London air
 * quality map.
 *
 * Deliberately absent: Lime, Forest, Voi and Bolt. None publishes a usable public
 * London feed, and the blocker is licensing rather than missing endpoints — Lime's
 * public GBFS terms cap retention at ten minutes and forbid aggregating their data
 * with third-party data, which rules out exposure work even with credentials.
 */

const BIKEPOINT_URL = "https://api.tfl.gov.uk/BikePoint";

const CITY_BAYS_URL =
  "https://www.mapping.cityoflondon.gov.uk/arcgis/rest/services/INSPIRE/MapServer/86/query";

/**
 * Required by TfL's terms (Open Government Licence v2.0 with TfL amendments). These
 * must be displayed wherever the data is surfaced — they are a licence condition.
 * https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service
 */
export const TFL_ATTRIBUTION =
  "Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016. Geomni UK Map data © and database rights 2019.";

/**
 * City of London publishes the bay polygons as an INSPIRE service via data.gov.uk,
 * which records no explicit licence. Confirm reuse terms with the Corporation before
 * publishing derived maps.
 */
export const CITY_ATTRIBUTION =
  "Dockless bike bays © City of London Corporation (INSPIRE; licence unconfirmed).";

type TflBikePoint = {
  id: string;
  commonName: string;
  lat: number;
  lon: number;
  additionalProperties: Array<{ key: string; value: string }>;
};

export type DockGeoJSON = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: {
      id: string;
      name: string;
      docks: number;
      bikes: number;
      eBikes: number;
      standardBikes: number;
      emptyDocks: number;
      eBikeShare: number;
    };
  }>;
};

export type BayGeoJSON = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: number[][][] };
    properties: {
      OBJECTID: number;
      STREET_NAME: string | null;
      PRESCRIBED_HOURS: string | null;
      NUMBER_OF_BAYS: number | null;
    };
  }>;
};

export type CycleInfrastructure = {
  docks: DockGeoJSON;
  bays: BayGeoJSON;
  summary: {
    stations: number;
    eBikes: number;
    standardBikes: number;
    emptyDocks: number;
    eBikeShare: number;
    baySites: number;
    bays: number;
  };
  retrievedAt: string;
};

/**
 * BikePoint availability moves constantly but not second by second.
 *
 * The raw payload is ~2.9 MB, which is over the 2 MB ceiling on Next's fetch cache —
 * passing `next: { revalidate }` fails silently there and re-downloads the whole feed
 * on every request. Caching the normalised result (well under 200 KB) in-process
 * avoids that and keeps us far inside TfL's 500 requests/minute limit.
 */
const TTL_MS = 60_000;
let cache: { at: number; value: CycleInfrastructure } | null = null;

function readProp(props: Map<string, string>, key: string): number {
  const value = Number(props.get(key));
  return Number.isFinite(value) ? value : 0;
}

async function fetchDocks(): Promise<DockGeoJSON> {
  const key = process.env.TFL_APP_KEY;
  const res = await fetch(key ? `${BIKEPOINT_URL}?app_key=${key}` : BIKEPOINT_URL, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BikePoint returned ${res.status}`);

  const raw = (await res.json()) as TflBikePoint[];

  return {
    type: "FeatureCollection",
    features: raw.map((station) => {
      const props = new Map(station.additionalProperties.map((p) => [p.key, p.value]));
      const bikes = readProp(props, "NbBikes");
      const eBikes = readProp(props, "NbEBikes");
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [station.lon, station.lat] },
        properties: {
          id: station.id,
          name: station.commonName,
          docks: readProp(props, "NbDocks"),
          bikes,
          eBikes,
          standardBikes: readProp(props, "NbStandardBikes"),
          emptyDocks: readProp(props, "NbEmptyDocks"),
          eBikeShare: bikes > 0 ? eBikes / bikes : 0,
        },
      };
    }),
  };
}

async function fetchBays(): Promise<BayGeoJSON> {
  const url = new URL(CITY_BAYS_URL);
  url.searchParams.set("where", "1=1");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "geojson");

  // Bay locations change on a traffic-order timescale, not hourly.
  const res = await fetch(url, { next: { revalidate: 86_400 } });
  if (!res.ok) throw new Error(`City of London bays returned ${res.status}`);
  return (await res.json()) as BayGeoJSON;
}

export async function getCycleInfrastructure(): Promise<CycleInfrastructure> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const [docks, bays] = await Promise.all([fetchDocks(), fetchBays()]);

  const totals = docks.features.reduce(
    (acc, f) => {
      acc.bikes += f.properties.bikes;
      acc.eBikes += f.properties.eBikes;
      acc.standardBikes += f.properties.standardBikes;
      acc.emptyDocks += f.properties.emptyDocks;
      return acc;
    },
    { bikes: 0, eBikes: 0, standardBikes: 0, emptyDocks: 0 },
  );

  const value: CycleInfrastructure = {
    docks,
    bays,
    summary: {
      stations: docks.features.length,
      eBikes: totals.eBikes,
      standardBikes: totals.standardBikes,
      emptyDocks: totals.emptyDocks,
      eBikeShare: totals.bikes > 0 ? totals.eBikes / totals.bikes : 0,
      baySites: bays.features.length,
      bays: bays.features.reduce((sum, f) => sum + (f.properties.NUMBER_OF_BAYS ?? 0), 0),
    },
    retrievedAt: new Date().toISOString(),
  };

  cache = { at: Date.now(), value };
  return value;
}
