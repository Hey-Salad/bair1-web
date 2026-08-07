const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

interface CellTower {
  mcc: number;
  mnc: number;
  lac: number;
  cid: number;
}

export interface WifiAccessPoint {
  macAddress: string;
  signalStrength?: number;
  channel?: number;
  ssid?: string;
}

interface ResolvedLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

/**
 * Resolve cell tower identifiers to lat/lng using Google Geolocation API.
 * Returns null if resolution fails or API key is missing.
 */
export async function resolveCellTower(
  tower: CellTower
): Promise<ResolvedLocation | null> {
  if (!GOOGLE_API_KEY) return null;
  if (!tower.lac || !tower.cid) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cellTowers: [
            {
              cellId: tower.cid,
              locationAreaCode: tower.lac,
              mobileCountryCode: tower.mcc,
              mobileNetworkCode: tower.mnc,
            },
          ],
        }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.location) return null;

    return {
      lat: data.location.lat,
      lng: data.location.lng,
      accuracy: data.accuracy ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve nearby WiFi access points to lat/lng using Google Geolocation API.
 * Google accepts up to 8 WiFi APs with macAddress (required, BSSID format
 * "AA:BB:CC:DD:EE:FF"), signalStrength (RSSI dBm), and channel.
 * Returns null if resolution fails, API key is missing, or no APs provided.
 */
export async function resolveWifiAccessPoints(
  accessPoints: WifiAccessPoint[]
): Promise<ResolvedLocation | null> {
  if (!GOOGLE_API_KEY) return null;
  if (!accessPoints || accessPoints.length === 0) return null;

  // Google requires macAddress; filter to valid entries + cap at 8
  const filtered = accessPoints
    .filter((ap) => ap && typeof ap.macAddress === "string" && ap.macAddress.length > 0)
    .slice(0, 8);
  if (filtered.length === 0) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wifiAccessPoints: filtered }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.location) return null;

    return {
      lat: data.location.lat,
      lng: data.location.lng,
      accuracy: data.accuracy ?? 0,
    };
  } catch {
    return null;
  }
}
