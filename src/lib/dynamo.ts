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
  | "get_state";

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
    ExpressionAttributeValues: { ":deviceId": { S: deviceId } },
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
  const updateExpression = "SET #status = :status, result = :result";
  const names = { "#status": "status" };
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

export interface DeviceState {
  deviceId: string;
  led: { on: boolean; brightness: number };
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
    return { deviceId, led: { on: false, brightness: 0 }, lastSeenAt: null, updatedAt: "" };
  }
  return {
    deviceId,
    led: {
      on: item["ledOn"]?.BOOL ?? false,
      brightness: Number(item["ledBrightness"]?.N ?? 0),
    },
    lastSeenAt: item["lastSeenAt"]?.S ?? null,
    updatedAt: item["updatedAt"]?.S ?? "",
  };
}

export async function setDeviceState(
  deviceId: string,
  led: { on: boolean; brightness: number },
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
  if (lastSeenAt) item.lastSeenAt = { S: lastSeenAt };
  await dynamoClient.send(new PutItemCommand({ TableName: COMMANDS_TABLE, Item: item }));
}

const NOTECARD_TELEMETRY_SORT_KEY = "telemetry#notecard#latest";
const NOTECARD_TELEMETRY_EVENT_PREFIX = "telemetry#notecard#event#";
const NOTECARD_HISTORY_RETENTION_SECONDS = 90 * 24 * 60 * 60;

export interface NotecardTelemetry {
  deviceId: string;
  capturedAt: string;
  receivedAt: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  batteryVoltage: number | null;
  motion: number | null;
  deviceStatus: string | null;
  transport: string | null;
  lat: number | null;
  lng: number | null;
  locationAccuracy: number | null;
  locationSource: string | null;
  sourceFile: string | null;
  updatedAt: string;
}

export async function setNotecardTelemetry(
  telemetry: Omit<NotecardTelemetry, "updatedAt">,
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const values: Record<string, AttributeValue> = {
    ":capturedAt": { S: telemetry.capturedAt },
    ":receivedAt": { S: telemetry.receivedAt },
    ":updatedAt": { S: updatedAt },
  };
  const names: Record<string, string> = {};
  const expressions = [
    "capturedAt = :capturedAt",
    "receivedAt = :receivedAt",
    "updatedAt = :updatedAt",
  ];
  for (const [key, value] of Object.entries({
    temperature: telemetry.temperature,
    humidity: telemetry.humidity,
    pressure: telemetry.pressure,
    batteryVoltage: telemetry.batteryVoltage,
    motion: telemetry.motion,
    lat: telemetry.lat,
    lng: telemetry.lng,
    locationAccuracy: telemetry.locationAccuracy,
  })) {
    if (value == null) continue;
    names[`#${key}`] = key;
    values[`:${key}`] = { N: String(value) };
    expressions.push(`#${key} = :${key}`);
  }
  for (const [key, value] of Object.entries({
    deviceStatus: telemetry.deviceStatus,
    transport: telemetry.transport,
    locationSource: telemetry.locationSource,
    sourceFile: telemetry.sourceFile,
  })) {
    if (!value) continue;
    names[`#${key}`] = key;
    values[`:${key}`] = { S: value };
    expressions.push(`#${key} = :${key}`);
  }
  await dynamoClient.send(new UpdateItemCommand({
    TableName: COMMANDS_TABLE,
    Key: {
      deviceId: { S: telemetry.deviceId },
      commandId: { S: NOTECARD_TELEMETRY_SORT_KEY },
    },
    UpdateExpression: `SET ${expressions.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));

  const safeFile = (telemetry.sourceFile ?? "event").replace(/[^a-zA-Z0-9._-]/g, "_");
  const eventItem: Record<string, AttributeValue> = {
    deviceId: { S: telemetry.deviceId },
    commandId: {
      S: `${NOTECARD_TELEMETRY_EVENT_PREFIX}${telemetry.capturedAt}#${telemetry.receivedAt}#${safeFile}`,
    },
    capturedAt: { S: telemetry.capturedAt },
    receivedAt: { S: telemetry.receivedAt },
    updatedAt: { S: updatedAt },
    expiresAt: { N: String(Math.floor(Date.now() / 1000) + NOTECARD_HISTORY_RETENTION_SECONDS) },
  };
  for (const [key, value] of Object.entries({
    temperature: telemetry.temperature,
    humidity: telemetry.humidity,
    pressure: telemetry.pressure,
    batteryVoltage: telemetry.batteryVoltage,
    motion: telemetry.motion,
    lat: telemetry.lat,
    lng: telemetry.lng,
    locationAccuracy: telemetry.locationAccuracy,
  })) {
    if (value != null) eventItem[key] = { N: String(value) };
  }
  for (const [key, value] of Object.entries({
    deviceStatus: telemetry.deviceStatus,
    transport: telemetry.transport,
    locationSource: telemetry.locationSource,
    sourceFile: telemetry.sourceFile,
  })) {
    if (value) eventItem[key] = { S: value };
  }
  await dynamoClient.send(new PutItemCommand({ TableName: COMMANDS_TABLE, Item: eventItem }));
}

function parseNotecardTelemetryItem(
  deviceId: string,
  item: Record<string, AttributeValue>,
): NotecardTelemetry {
  return {
    deviceId,
    capturedAt: item.capturedAt?.S ?? "",
    receivedAt: item.receivedAt?.S ?? "",
    temperature: item.temperature?.N == null ? null : Number(item.temperature.N),
    humidity: item.humidity?.N == null ? null : Number(item.humidity.N),
    pressure: item.pressure?.N == null ? null : Number(item.pressure.N),
    batteryVoltage: item.batteryVoltage?.N == null ? null : Number(item.batteryVoltage.N),
    motion: item.motion?.N == null ? null : Number(item.motion.N),
    deviceStatus: item.deviceStatus?.S ?? null,
    transport: item.transport?.S ?? null,
    lat: item.lat?.N == null ? null : Number(item.lat.N),
    lng: item.lng?.N == null ? null : Number(item.lng.N),
    locationAccuracy: item.locationAccuracy?.N == null ? null : Number(item.locationAccuracy.N),
    locationSource: item.locationSource?.S ?? null,
    sourceFile: item.sourceFile?.S ?? null,
    updatedAt: item.updatedAt?.S ?? "",
  };
}

export async function getNotecardTelemetry(deviceId: string): Promise<NotecardTelemetry | null> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: COMMANDS_TABLE,
    KeyConditionExpression: "deviceId = :deviceId AND commandId = :sk",
    ExpressionAttributeValues: {
      ":deviceId": { S: deviceId },
      ":sk": { S: NOTECARD_TELEMETRY_SORT_KEY },
    },
    Limit: 1,
  }));
  const item = result.Items?.[0];
  if (!item) return null;
  return parseNotecardTelemetryItem(deviceId, item);
}

export async function getNotecardTelemetryHistory(
  deviceId: string,
  limit = 120,
): Promise<NotecardTelemetry[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: COMMANDS_TABLE,
    KeyConditionExpression: "deviceId = :deviceId AND begins_with(commandId, :prefix)",
    ExpressionAttributeValues: {
      ":deviceId": { S: deviceId },
      ":prefix": { S: NOTECARD_TELEMETRY_EVENT_PREFIX },
    },
    ScanIndexForward: false,
    Limit: Math.min(Math.max(limit, 1), 500),
  }));
  return (result.Items ?? []).map((item) => parseNotecardTelemetryItem(deviceId, item));
}
