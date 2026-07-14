import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";

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

function parseScopes(value: unknown): ApiKeyScope[] {
  if (Array.isArray(value)) return value as ApiKeyScope[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as ApiKeyScope[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseRow(row: Record<string, unknown>): ApiKeyRecord {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    prefix: String(row.prefix ?? ""),
    userId: String(row.user_id ?? ""),
    orgId: String(row.org_id ?? "default"),
    scopes: parseScopes(row.scopes),
    createdAt: row.created_at
      ? new Date(row.created_at as string).toISOString()
      : "",
    lastUsedAt: row.last_used_at
      ? new Date(row.last_used_at as string).toISOString()
      : null,
    revokedAt: row.revoked_at
      ? new Date(row.revoked_at as string).toISOString()
      : null,
  };
}

export async function ensureApiKeysTable(): Promise<void> {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL UNIQUE,
      prefix TEXT NOT NULL,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      org_id TEXT NOT NULL DEFAULT 'default',
      scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_api_keys_user_created
    ON api_keys (user_id, created_at DESC)
  `;
}

export async function listApiKeysForUser(userId: string): Promise<ApiKeyRecord[]> {
  const sql = getDb();
  await ensureApiKeysTable();
  const rows = await sql`
    SELECT id, prefix, name, user_id, org_id, scopes, created_at, last_used_at, revoked_at
    FROM api_keys
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map(parseRow);
}

export async function listApiKeysForOrg(orgId: string): Promise<ApiKeyRecord[]> {
  const sql = getDb();
  await ensureApiKeysTable();
  const rows = await sql`
    SELECT id, prefix, name, user_id, org_id, scopes, created_at, last_used_at, revoked_at
    FROM api_keys
    WHERE org_id = ${orgId}
    ORDER BY created_at DESC
  `;
  return rows.map(parseRow);
}

export async function createApiKey(input: {
  name: string;
  userId: string;
  orgId: string;
  scopes?: ApiKeyScope[];
}): Promise<{ key: string; record: ApiKeyRecord }> {
  const sql = getDb();
  await ensureApiKeysTable();

  const secret = `bair1_${randomBytes(24).toString("base64url")}`;
  const id = `key_${randomBytes(10).toString("hex")}`;
  const prefix = secret.slice(0, 12);
  const scopes = input.scopes?.length ? input.scopes : DEFAULT_SCOPES;
  const now = new Date().toISOString();

  await sql`
    INSERT INTO api_keys (id, key_hash, prefix, name, user_id, org_id, scopes, created_at)
    VALUES (
      ${id},
      ${hashKey(secret)},
      ${prefix},
      ${input.name},
      ${input.userId},
      ${input.orgId},
      ${JSON.stringify(scopes)}::jsonb,
      ${now}
    )
  `;

  return {
    key: secret,
    record: {
      id,
      name: input.name,
      prefix,
      userId: input.userId,
      orgId: input.orgId,
      scopes,
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
    },
  };
}

export async function revokeApiKey(input: {
  id: string;
  userId?: string;
  orgId?: string;
}): Promise<void> {
  const sql = getDb();
  await ensureApiKeysTable();

  if (input.userId) {
    await sql`
      UPDATE api_keys SET revoked_at = NOW()
      WHERE id = ${input.id} AND user_id = ${input.userId}
    `;
    return;
  }

  await sql`
    UPDATE api_keys SET revoked_at = NOW()
    WHERE id = ${input.id} AND org_id = ${input.orgId ?? "default"}
  `;
}

export async function validateApiKey(
  key: string | null,
  requiredScopes: ApiKeyScope[] = []
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

  const sql = getDb();
  await ensureApiKeysTable();
  const rows = await sql`
    SELECT id, user_id, org_id, scopes
    FROM api_keys
    WHERE key_hash = ${hashKey(key)} AND revoked_at IS NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const scopes = parseScopes(row.scopes);
  const hasScopes = requiredScopes.every((scope) => scopes.includes(scope));
  if (!hasScopes) return null;

  await sql`
    UPDATE api_keys SET last_used_at = NOW()
    WHERE id = ${String(row.id)}
  `;

  return {
    type: "developer",
    keyId: String(row.id),
    userId: String(row.user_id),
    orgId: String(row.org_id ?? "default"),
    scopes,
  };
}

export function extractApiKeyFromHeaders(headers: Headers): string | null {
  const xApiKey = headers.get("x-api-key");
  if (xApiKey) return xApiKey;
  const auth = headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
