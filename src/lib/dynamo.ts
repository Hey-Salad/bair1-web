import {
  DynamoDBClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "eu-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const TABLE = "bair1-readings";

export interface Reading {
  deviceId: string;
  timestamp: string;
  aqi: number;
  gasRaw: number | null;
  gasVoltage: number | null;
  airState: string | null;
  rssi: number | null;
  firmwareVersion: string | null;
  uptimeMs: number | null;
  sample: number | null;
  transport: string | null;
  lat: number | null;
  lng: number | null;
  locationAccuracy: number | null;
}

function parseItem(item: Record<string, any>): Reading {
  return {
    deviceId: item.deviceId?.S ?? "unknown",
    timestamp: item.timestamp?.S ?? "",
    aqi: Number(item.aqi?.N ?? 0),
    gasRaw: item.gasRaw?.N != null ? Number(item.gasRaw.N) : null,
    gasVoltage: item.gasVoltage?.N != null ? Number(item.gasVoltage.N) : null,
    airState: item.airState?.S ?? null,
    rssi: item.rssi?.N != null ? Number(item.rssi.N) : null,
    firmwareVersion: item.firmwareVersion?.S ?? null,
    uptimeMs: item.uptimeMs?.N != null ? Number(item.uptimeMs.N) : null,
    sample: item.sample?.N != null ? Number(item.sample.N) : null,
    transport: item.transport?.S ?? null,
    lat: item.lat?.N != null ? Number(item.lat.N) : null,
    lng: item.lng?.N != null ? Number(item.lng.N) : null,
    locationAccuracy: item.locationAccuracy?.N != null ? Number(item.locationAccuracy.N) : null,
  };
}

export async function getReadings(
  deviceId: string,
  limit = 100
): Promise<Reading[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "deviceId = :did",
      ExpressionAttributeValues: { ":did": { S: deviceId } },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return (result.Items ?? []).map(parseItem);
}

export async function getLatestReading(
  deviceId: string
): Promise<Reading | null> {
  const readings = await getReadings(deviceId, 1);
  return readings[0] ?? null;
}

export async function getAllDevices(): Promise<string[]> {
  const result = await client.send(
    new ScanCommand({
      TableName: TABLE,
      ProjectionExpression: "deviceId",
    })
  );
  const ids = new Set<string>();
  for (const item of result.Items ?? []) {
    if (item.deviceId?.S) ids.add(item.deviceId.S);
  }
  return [...ids];
}

export async function getReadingsInRange(
  deviceId: string,
  from: string,
  to: string
): Promise<Reading[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression:
        "deviceId = :did AND #ts BETWEEN :from AND :to",
      ExpressionAttributeNames: { "#ts": "timestamp" },
      ExpressionAttributeValues: {
        ":did": { S: deviceId },
        ":from": { S: from },
        ":to": { S: to },
      },
      ScanIndexForward: true,
    })
  );
  return (result.Items ?? []).map(parseItem);
}
