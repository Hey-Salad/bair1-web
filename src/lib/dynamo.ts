import {
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  type AttributeValue,
  type QueryCommandInput,
  type ScanCommandInput,
} from "@aws-sdk/client-dynamodb";
import { dynamoClient } from "./aws-dynamo";

const TABLE = "bair1-readings";
// Readings carry a DynamoDB TTL. Raising this only affects rows written from
// here on — anything already past the old 14-day mark has been deleted and is
// not recoverable. Keep in step with RETENTION_DAYS in time-range.ts, which is
// what stops the UI offering a window the data cannot fill.
const RETENTION_SECONDS = 90 * 24 * 60 * 60;

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
  // Extended sensor fields (Genesis Mini multi-sensor)
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  dhtTemp: number | null;
  dhtHum: number | null;
  accelX: number | null;
  accelY: number | null;
  accelZ: number | null;
  gyroX: number | null;
  gyroY: number | null;
  gyroZ: number | null;
  batteryVoltage: number | null;
  batteryLevel: number | null;
  // Ride tagging (Genesis Mini firmware >= v2.2). Older readings have nulls;
  // rides.ts falls back to deriving motion from accelX/Y/Z in that case.
  rideId: string | null;
  riding: boolean | null;
  motionStdev: number | null;
}

export type ReadingInput = Omit<
  Reading,
  | "timestamp"
  | "lat" | "lng" | "locationAccuracy"
  | "pm1" | "pm25" | "pm4" | "pm10"
  | "sensorModel" | "board"
  | "temperature" | "humidity" | "pressure"
  | "dhtTemp" | "dhtHum"
  | "accelX" | "accelY" | "accelZ"
  | "gyroX" | "gyroY" | "gyroZ"
  | "batteryVoltage" | "batteryLevel"
  | "rideId" | "riding" | "motionStdev"
> & {
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
    // Extended sensor fields (Genesis Mini multi-sensor)
    temperature: rawNumber(raw, "temperature"),
    humidity: rawNumber(raw, "humidity"),
    pressure: rawNumber(raw, "pressure"),
    dhtTemp: rawNumber(raw, "dhtTemp"),
    dhtHum: rawNumber(raw, "dhtHum"),
    accelX: rawNumber(raw, "accelX"),
    accelY: rawNumber(raw, "accelY"),
    accelZ: rawNumber(raw, "accelZ"),
    gyroX: rawNumber(raw, "gyroX"),
    gyroY: rawNumber(raw, "gyroY"),
    gyroZ: rawNumber(raw, "gyroZ"),
    batteryVoltage: rawNumber(raw, "batteryVoltage"),
    batteryLevel: rawNumber(raw, "batteryLevel"),
    rideId: raw.rideId ? String(raw.rideId) : null,
    riding: raw.riding == null ? null : Boolean(raw.riding),
    motionStdev: rawNumber(raw, "motionStdev"),
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
  if (latest && new Date(timestamp).getTime() - new Date(latest.timestamp).getTime() < 12_000) {
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

// ---------- Device command queue ----------
// Table: bair1-commands. PK: deviceId, SK: commandId (sortable ISO-ish).
// TTL 1 hour. Each command: {deviceId, commandId, type, payload, status, result, createdAt, expiresAt}.

const COMMANDS_TABLE = "bair1-commands";
const COMMAND_TTL_SECONDS = 60 * 60;

export type CommandType =
  | "set_led"
  | "read_sps30"
  | "clean_sps30"
  | "reboot"
  | "get_state"
  | "ota_update"
  | "beep"
  | "mute_buzzer"
  | "read_pm";

export interface Command {
  deviceId: string;
  commandId: string;
  type: CommandType;
  payload: Record<string, unknown> | null;
  status: "pending" | "done";
  result: Record<string, unknown> | null;
  createdAt: string;
  expiresAt: number;
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export async function enqueueCommand(
  deviceId: string,
  type: CommandType,
  payload: Record<string, unknown> | null = null,
): Promise<Command> {
  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const commandId = `${now.toString(36)}-${randomId("cmd")}`;
  const expiresAt = Math.floor(now / 1000) + COMMAND_TTL_SECONDS;
  const item: Record<string, AttributeValue> = {
    deviceId: { S: deviceId },
    commandId: { S: commandId },
    type: { S: type },
    status: { S: "pending" },
    createdAt: { S: createdAt },
    expiresAt: { N: String(expiresAt) },
  };
  if (payload) item.payload = { S: JSON.stringify(payload) };

  await dynamoClient.send(new PutItemCommand({ TableName: COMMANDS_TABLE, Item: item }));
  return {
    deviceId,
    commandId,
    type,
    payload,
    status: "pending",
    result: null,
    createdAt,
    expiresAt,
  };
}

export async function pollCommands(deviceId: string, limit = 10): Promise<Command[]> {
  const items = await queryAll({
    TableName: COMMANDS_TABLE,
    KeyConditionExpression: "deviceId = :deviceId",
    FilterExpression: "#status = :pending",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":deviceId": { S: deviceId },
      ":pending": { S: "pending" },
    },
    ScanIndexForward: true,
    Limit: Math.min(Math.max(limit, 1), 50),
  }, limit);

  return items
    .map(parseCommandItem)
    .filter((cmd): cmd is Command => cmd !== null);
}

export async function ackCommand(
  deviceId: string,
  commandId: string,
  ok: boolean,
  result: Record<string, unknown> | null = null,
): Promise<void> {
  const updateExpression = "SET #status = :status, #result = :result";
  const names = { "#status": "status", "#result": "result" };
  const values: Record<string, AttributeValue> = {
    ":status": { S: ok ? "done" : "done" },
    ":result": { S: JSON.stringify({ ok, ...(result ?? {}) }) },
  };
  await dynamoClient.send(new UpdateItemCommand({
    TableName: COMMANDS_TABLE,
    Key: {
      deviceId: { S: deviceId },
      commandId: { S: commandId },
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function getCommand(deviceId: string, commandId: string): Promise<Command | null> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: COMMANDS_TABLE,
    KeyConditionExpression: "deviceId = :deviceId AND commandId = :commandId",
    ExpressionAttributeValues: {
      ":deviceId": { S: deviceId },
      ":commandId": { S: commandId },
    },
    Limit: 1,
  }));
  const item = result.Items?.[0];
  return item ? parseCommandItem(item) : null;
}

function parseCommandItem(item: Record<string, AttributeValue>): Command | null {
  const deviceId = item["deviceId"]?.S;
  const commandId = item["commandId"]?.S;
  const type = item["type"]?.S as CommandType | undefined;
  if (!deviceId || !commandId || !type) return null;
  let payload: Record<string, unknown> | null = null;
  const payloadRaw = item["payload"]?.S;
  if (payloadRaw) {
    try {
      const parsed: unknown = JSON.parse(payloadRaw);
      payload = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
    } catch { /* ignore */ }
  }
  let result: Record<string, unknown> | null = null;
  const resultRaw = item["result"]?.S;
  if (resultRaw) {
    try {
      const parsed: unknown = JSON.parse(resultRaw);
      result = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
    } catch { /* ignore */ }
  }
  return {
    deviceId,
    commandId,
    type,
    payload,
    status: (item["status"]?.S as "pending" | "done") ?? "pending",
    result,
    createdAt: item["createdAt"]?.S ?? "",
    expiresAt: Number(item["expiresAt"]?.N ?? 0),
  };
}

// ---------- Device state (lightweight LED + last-seen) ----------
// Stored in COMMANDS_TABLE under PK=deviceId, SK=`state#latest` so we avoid
// creating a fourth table. Small, hot, overwritten on each ack/state update.

const STATE_SORT_KEY = "state#latest";
const HIDDEN_PREFIX = "hidden#";

/* ---------------------------------------------------------------------------
 * Hidden journeys
 *
 * Journeys are derived from readings, so there is nothing to delete — hiding
 * has to be recorded separately. These live in the commands table alongside
 * `state#latest`: same key shape, and rows written without `expiresAt` are
 * never touched by that table's TTL, so a hidden journey stays hidden.
 * ------------------------------------------------------------------------- */

export async function listHiddenRideIds(deviceId: string): Promise<string[]> {
  const res = await dynamoClient.send(
    new QueryCommand({
      TableName: COMMANDS_TABLE,
      KeyConditionExpression: "deviceId = :d AND begins_with(commandId, :p)",
      ExpressionAttributeValues: {
        ":d": { S: deviceId },
        ":p": { S: HIDDEN_PREFIX },
      },
    }),
  );
  return (res.Items ?? [])
    .map((i) => i.commandId?.S ?? "")
    .filter(Boolean)
    .map((k) => k.slice(HIDDEN_PREFIX.length));
}

export async function setRideHidden(
  deviceId: string,
  rideId: string,
  hidden: boolean,
): Promise<void> {
  const Key = {
    deviceId: { S: deviceId },
    commandId: { S: `${HIDDEN_PREFIX}${rideId}` },
  };
  if (!hidden) {
    await dynamoClient.send(new DeleteItemCommand({ TableName: COMMANDS_TABLE, Key }));
    return;
  }
  await dynamoClient.send(
    new PutItemCommand({
      TableName: COMMANDS_TABLE,
      // Deliberately no expiresAt: this must outlive the command TTL.
      Item: { ...Key, rideId: { S: rideId }, hiddenAt: { S: new Date().toISOString() } },
    }),
  );
}

export interface DeviceState {
  deviceId: string;
  led: { on: boolean; brightness: number; mode: string; manualColor: number };
  lastSeenAt: string | null;
  updatedAt: string;
}

export async function getDeviceState(deviceId: string): Promise<DeviceState> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: COMMANDS_TABLE,
    KeyConditionExpression: "deviceId = :deviceId AND commandId = :sk",
    ExpressionAttributeValues: {
      ":deviceId": { S: deviceId },
      ":sk": { S: STATE_SORT_KEY },
    },
    Limit: 1,
  }));
  const item = result.Items?.[0];
  if (!item) {
    return {
      deviceId,
      led: { on: false, brightness: 0, mode: "aqi", manualColor: 0 },
      lastSeenAt: null,
      updatedAt: "",
    };
  }
  return {
    deviceId,
    led: {
      on: item["ledOn"]?.BOOL ?? false,
      brightness: Number(item["ledBrightness"]?.N ?? 0),
      mode: item["ledMode"]?.S ?? "aqi",
      manualColor: Number(item["ledManualColor"]?.N ?? 0),
    },
    lastSeenAt: item["lastSeenAt"]?.S ?? null,
    updatedAt: item["updatedAt"]?.S ?? "",
  };
}

export async function setDeviceState(
  deviceId: string,
  led: { on: boolean; brightness: number; mode?: string; manualColor?: number },
  lastSeenAt: string | null = null,
): Promise<void> {
  const now = new Date().toISOString();
  const item: Record<string, AttributeValue> = {
    deviceId: { S: deviceId },
    commandId: { S: STATE_SORT_KEY },
    ledOn: { BOOL: led.on },
    ledBrightness: { N: String(led.brightness) },
    updatedAt: { S: now },
  };
  if (led.mode != null) item.ledMode = { S: led.mode };
  if (led.manualColor != null) item.ledManualColor = { N: String(led.manualColor) };
  if (lastSeenAt) item.lastSeenAt = { S: lastSeenAt };
  await dynamoClient.send(new PutItemCommand({ TableName: COMMANDS_TABLE, Item: item }));
}

// Firmware metadata is stored in COMMANDS_TABLE under SK `firmware#latest`,
// following the same pattern as `state#latest` (avoids a fourth table).

const FIRMWARE_SORT_KEY = "firmware#latest";

export interface DeviceFirmware {
  deviceId: string;
  version: string;
  r2Key: string;
  sha256: string | null;
  uploadedAt: string;
}

export async function getDeviceFirmware(deviceId: string): Promise<DeviceFirmware | null> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: COMMANDS_TABLE,
    KeyConditionExpression: "deviceId = :deviceId AND commandId = :sk",
    ExpressionAttributeValues: {
      ":deviceId": { S: deviceId },
      ":sk": { S: FIRMWARE_SORT_KEY },
    },
    Limit: 1,
  }));
  const item = result.Items?.[0];
  if (!item) return null;
  return {
    deviceId,
    version: item["version"]?.S ?? "",
    r2Key: item["r2Key"]?.S ?? "",
    sha256: item["sha256"]?.S ?? null,
    uploadedAt: item["uploadedAt"]?.S ?? "",
  };
}

export async function setDeviceFirmware(
  deviceId: string,
  meta: { version: string; r2Key: string; sha256: string | null },
): Promise<void> {
  const uploadedAt = new Date().toISOString();
  const item: Record<string, AttributeValue> = {
    deviceId: { S: deviceId },
    commandId: { S: FIRMWARE_SORT_KEY },
    version: { S: meta.version },
    r2Key: { S: meta.r2Key },
    uploadedAt: { S: uploadedAt },
  };
  if (meta.sha256) item.sha256 = { S: meta.sha256 };
  await dynamoClient.send(new PutItemCommand({ TableName: COMMANDS_TABLE, Item: item }));
}
