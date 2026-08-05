import {
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
  type AttributeValue,
  type QueryCommandInput,
  type ScanCommandInput,
} from "@aws-sdk/client-dynamodb";
import { dynamoClient } from "./aws-dynamo";

const TABLE = "bair1-readings";
const RETENTION_SECONDS = 14 * 24 * 60 * 60;

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
  pm1: number | null;
  pm25: number | null;
  pm4: number | null;
  pm10: number | null;
  sensorModel: string | null;
  board: string | null;
}

export type ReadingInput = Omit<Reading, "timestamp" | "lat" | "lng" | "locationAccuracy" | "pm1" | "pm25" | "pm4" | "pm10" | "sensorModel" | "board"> & {
  rawPayload: Record<string, unknown>;
  timestamp?: string;
};

type StoredReading = {
  deviceId: string;
  timestamp: string;
  rawPayload: Record<string, unknown>;
};

function text(item: Record<string, AttributeValue>, key: string): string | null {
  return item[key]?.S ?? null;
}

function number(item: Record<string, AttributeValue>, key: string): number | null {
  const value = item[key]?.N;
  return value == null ? null : Number(value);
}

function parseRawPayload(item: Record<string, AttributeValue>): Record<string, unknown> {
  const value = text(item, "rawPayload");
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function rawNumber(raw: Record<string, unknown>, key: string): number | null {
  const value = raw[key];
  return value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
}

function parseItem(item: Record<string, AttributeValue>): Reading {
  const raw = parseRawPayload(item);
  return {
    deviceId: text(item, "deviceId") ?? "unknown",
    timestamp: text(item, "timestamp") ?? "",
    aqi: number(item, "aqi") ?? 0,
    gasRaw: number(item, "gasRaw"),
    gasVoltage: number(item, "gasVoltage"),
    airState: text(item, "airState"),
    rssi: number(item, "rssi"),
    firmwareVersion: text(item, "firmwareVersion"),
    uptimeMs: number(item, "uptimeMs"),
    sample: number(item, "sample"),
    transport: text(item, "transport"),
    lat: rawNumber(raw, "lat"),
    lng: rawNumber(raw, "lng"),
    locationAccuracy: rawNumber(raw, "locationAccuracy"),
    pm1: rawNumber(raw, "pm1"),
    pm25: rawNumber(raw, "pm25"),
    pm4: rawNumber(raw, "pm4"),
    pm10: rawNumber(raw, "pm10"),
    sensorModel: raw.sensorModel ? String(raw.sensorModel) : null,
    board: raw.board ? String(raw.board) : null,
  };
}

async function queryAll(input: QueryCommandInput, limit?: number) {
  const items: Record<string, AttributeValue>[] = [];
  let exclusiveStartKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamoClient.send(
      new QueryCommand({ ...input, ExclusiveStartKey: exclusiveStartKey }),
    );
    items.push(...(result.Items ?? []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey && (!limit || items.length < limit));

  return limit ? items.slice(0, limit) : items;
}

async function scanAll(input: ScanCommandInput) {
  const items: Record<string, AttributeValue>[] = [];
  let exclusiveStartKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamoClient.send(
      new ScanCommand({ ...input, ExclusiveStartKey: exclusiveStartKey }),
    );
    items.push(...(result.Items ?? []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

export async function getReadings(deviceId: string, limit = 100): Promise<Reading[]> {
  const items = await queryAll({
    TableName: TABLE,
    KeyConditionExpression: "deviceId = :deviceId",
    ExpressionAttributeValues: { ":deviceId": { S: deviceId } },
    ScanIndexForward: false,
    Limit: Math.min(Math.max(limit, 1), 10_000),
  }, limit);
  return items.map(parseItem);
}

export async function getLatestReading(deviceId: string): Promise<Reading | null> {
  const readings = await getReadings(deviceId, 1);
  return readings[0] ?? null;
}

export async function getAllDevices(): Promise<string[]> {
  const items = await scanAll({
    TableName: TABLE,
    ProjectionExpression: "deviceId",
  });
  return [...new Set(items.map((item) => text(item, "deviceId")).filter((id): id is string => Boolean(id)))];
}

export async function getLatestReadings(limit = 20): Promise<Reading[]> {
  const latest = await Promise.all((await getAllDevices()).map((deviceId) => getLatestReading(deviceId)));
  return latest
    .filter((reading): reading is Reading => Boolean(reading))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export async function getReadingsInRange(deviceId: string, from: string, to: string): Promise<Reading[]> {
  const items = await queryAll({
    TableName: TABLE,
    KeyConditionExpression: "deviceId = :deviceId AND #timestamp BETWEEN :from AND :to",
    ExpressionAttributeNames: { "#timestamp": "timestamp" },
    ExpressionAttributeValues: {
      ":deviceId": { S: deviceId },
      ":from": { S: from },
      ":to": { S: to },
    },
    ScanIndexForward: true,
  });
  return items.map(parseItem);
}

export async function storeReading(input: ReadingInput): Promise<boolean> {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const latest = await getLatestReading(input.deviceId);
  if (latest && new Date(timestamp).getTime() - new Date(latest.timestamp).getTime() < 60_000) {
    return false;
  }

  const recordedAt = new Date(timestamp);
  const expiresAt = Math.floor((Number.isNaN(recordedAt.getTime()) ? Date.now() : recordedAt.getTime()) / 1000) + RETENTION_SECONDS;
  const item: Record<string, AttributeValue> = {
    deviceId: { S: input.deviceId },
    timestamp: { S: timestamp },
    aqi: { N: String(input.aqi) },
    rawPayload: { S: JSON.stringify(input.rawPayload) },
    expiresAt: { N: String(expiresAt) },
  };
  const optionalNumbers = {
    gasRaw: input.gasRaw,
    gasVoltage: input.gasVoltage,
    rssi: input.rssi,
    uptimeMs: input.uptimeMs,
    sample: input.sample,
  };
  for (const [key, value] of Object.entries(optionalNumbers)) {
    if (value != null) item[key] = { N: String(value) };
  }
  const optionalText = {
    airState: input.airState,
    firmwareVersion: input.firmwareVersion,
    transport: input.transport,
  };
  for (const [key, value] of Object.entries(optionalText)) {
    if (value) item[key] = { S: value };
  }

  await dynamoClient.send(new PutItemCommand({ TableName: TABLE, Item: item }));
  return true;
}

export async function getReadingsMissingLocation(): Promise<StoredReading[]> {
  const items = await scanAll({ TableName: TABLE, ProjectionExpression: "deviceId, #timestamp, rawPayload", ExpressionAttributeNames: { "#timestamp": "timestamp" } });
  return items
    .map((item) => ({
      deviceId: text(item, "deviceId") ?? "",
      timestamp: text(item, "timestamp") ?? "",
      rawPayload: parseRawPayload(item),
    }))
    .filter(({ rawPayload }) => rawPayload.cellTower && rawPayload.lat == null && rawPayload.lng == null);
}

export async function updateReadingRawPayload(reading: StoredReading): Promise<void> {
  await dynamoClient.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: {
      deviceId: { S: reading.deviceId },
      timestamp: { S: reading.timestamp },
    },
    UpdateExpression: "SET rawPayload = :rawPayload",
    ExpressionAttributeValues: { ":rawPayload": { S: JSON.stringify(reading.rawPayload) } },
  }));
}
