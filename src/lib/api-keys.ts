import { createHash, randomBytes } from "node:crypto";
import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { dynamoClient } from "./aws-dynamo";

const TABLE = "bair1-api-keys";

export type ApiKeyScope =
  | "read:devices"
  | "write:devices"
  | "read:readings"
  | "write:readings"
  | "export:readings";

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  userId: string;
  orgId: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ApiKeyPrincipal {
  type: "system" | "developer";
  userId: string;
  orgId: string;
  scopes: ApiKeyScope[];
  keyId?: string;
}

const DEFAULT_SCOPES: ApiKeyScope[] = [
  "read:devices",
  "write:devices",
  "read:readings",
  "write:readings",
  "export:readings",
];

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function parseScopes(value: string | null): ApiKeyScope[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as ApiKeyScope[] : [];
  } catch {
    return [];
  }
}

function text(item: Record<string, AttributeValue>, key: string): string | null {
  return item[key]?.S ?? null;
}

function parseItem(item: Record<string, AttributeValue>): ApiKeyRecord {
  return {
    id: text(item, "id") ?? "",
    name: text(item, "name") ?? "",
    prefix: text(item, "prefix") ?? "",
    userId: text(item, "userId") ?? "",
    orgId: text(item, "orgId") ?? "default",
    scopes: parseScopes(text(item, "scopes")),
    createdAt: text(item, "createdAt") ?? "",
    lastUsedAt: text(item, "lastUsedAt"),
    revokedAt: text(item, "revokedAt"),
  };
}

async function listByIndex(indexName: string, key: string, value: string): Promise<ApiKeyRecord[]> {
  const records: ApiKeyRecord[] = [];
  let exclusiveStartKey: Record<string, AttributeValue> | undefined;
  do {
    const result = await dynamoClient.send(new QueryCommand({
      TableName: TABLE,
      IndexName: indexName,
      KeyConditionExpression: "#key = :value",
      ExpressionAttributeNames: { "#key": key },
      ExpressionAttributeValues: { ":value": { S: value } },
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    }));
    records.push(...(result.Items ?? []).map(parseItem));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return records;
}

export async function listApiKeysForUser(userId: string): Promise<ApiKeyRecord[]> {
  return listByIndex("userId-createdAt-index", "userId", userId);
}

export async function listApiKeysForOrg(orgId: string): Promise<ApiKeyRecord[]> {
  return listByIndex("orgId-createdAt-index", "orgId", orgId);
}

export async function createApiKey(input: {
  name: string;
  userId: string;
  orgId: string;
  scopes?: ApiKeyScope[];
}): Promise<{ key: string; record: ApiKeyRecord }> {
  const key = `bair1_${randomBytes(24).toString("base64url")}`;
  const id = `key_${randomBytes(10).toString("hex")}`;
  const prefix = key.slice(0, 12);
  const scopes = input.scopes?.length ? input.scopes : DEFAULT_SCOPES;
  const createdAt = new Date().toISOString();
  const record: ApiKeyRecord = {
    id,
    name: input.name,
    prefix,
    userId: input.userId,
    orgId: input.orgId,
    scopes,
    createdAt,
    lastUsedAt: null,
    revokedAt: null,
  };

  await dynamoClient.send(new PutItemCommand({
    TableName: TABLE,
    Item: {
      id: { S: id },
      keyHash: { S: hashKey(key) },
      prefix: { S: prefix },
      name: { S: input.name },
      userId: { S: input.userId },
      orgId: { S: input.orgId },
      scopes: { S: JSON.stringify(scopes) },
      createdAt: { S: createdAt },
    },
  }));
  return { key, record };
}

export async function revokeApiKey(input: { id: string; userId?: string; orgId?: string }): Promise<void> {
  const result = await dynamoClient.send(new GetItemCommand({
    TableName: TABLE,
    Key: { id: { S: input.id } },
  }));
  if (!result.Item) return;
  const record = parseItem(result.Item);
  if (input.userId ? record.userId !== input.userId : record.orgId !== (input.orgId ?? "default")) {
    return;
  }
  await dynamoClient.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { id: { S: input.id } },
    UpdateExpression: "SET revokedAt = :revokedAt",
    ExpressionAttributeValues: { ":revokedAt": { S: new Date().toISOString() } },
  }));
}

export async function validateApiKey(
  key: string | null,
  requiredScopes: ApiKeyScope[] = [],
): Promise<ApiKeyPrincipal | null> {
  if (!key) return null;
  if (process.env.SENSOR_API_KEY && key === process.env.SENSOR_API_KEY) {
    return {
      type: "system",
      userId: "system",
      orgId: "default",
      scopes: DEFAULT_SCOPES,
    };
  }

  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "keyHash-index",
    KeyConditionExpression: "keyHash = :keyHash",
    ExpressionAttributeValues: { ":keyHash": { S: hashKey(key) } },
    Limit: 1,
  }));
  const item = result.Items?.[0];
  if (!item) return null;

  const record = parseItem(item);
  if (record.revokedAt || !requiredScopes.every((scope) => record.scopes.includes(scope))) {
    return null;
  }

  await dynamoClient.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { id: { S: record.id } },
    UpdateExpression: "SET lastUsedAt = :lastUsedAt",
    ExpressionAttributeValues: { ":lastUsedAt": { S: new Date().toISOString() } },
  }));

  return {
    type: "developer",
    keyId: record.id,
    userId: record.userId,
    orgId: record.orgId,
    scopes: record.scopes,
  };
}

export function extractApiKeyFromHeaders(headers: Headers): string | null {
  const xApiKey = headers.get("x-api-key");
  if (xApiKey) return xApiKey;
  const authorization = headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

/**
 * Validate an API key OR an Auth0 session token, returning a unified principal.
 * Used by /api/v1/* routes so the dashboard (Auth0 Bearer) and devices (bair1
 * x-api-key) can hit the same endpoints. Auth0 sessions are mapped to a
 * developer principal scoped to the user's own devices.
 */
export async function validateApiKeyOrSession(
  keyOrToken: string | null,
  requiredScopes: ApiKeyScope[] = [],
): Promise<ApiKeyPrincipal | null> {
  if (!keyOrToken) return null;
  // 1. Try as a bair1 API key (system or developer key in DynamoDB).
  //    Wrap in try/catch so a DynamoDB error doesn't kill the Auth0 fallback.
  try {
    const principal = await validateApiKey(keyOrToken, requiredScopes);
    if (principal) return principal;
  } catch {
    // DynamoDB error or table missing — fall through to Auth0.
  }
  // 2. Fall back to Auth0 session token. The Auth0 user gets a developer
  //    principal with all default scopes; device-ownership checks happen
  //    in the route handler via getDevice().
  try {
    const { getOrCreateUser } = await import("./auth");
    const user = await getOrCreateUser(keyOrToken);
    if (!user) return null;
    return {
      type: "developer",
      keyId: undefined,
      userId: user.userId,
      orgId: user.orgId,
      scopes: DEFAULT_SCOPES,
    };
  } catch {
    return null;
  }
}
