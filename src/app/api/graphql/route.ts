import { GraphQLError } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
import {
  getReadings,
  getLatestReading,
  getAllDevices,
  getReadingsInRange,
  getNotecardTelemetry,
} from "@/lib/dynamo";
import { getAllDevicesRegistry, getDevice, type Device } from "@/lib/devices";
import { extractApiKeyFromHeaders, validateApiKey, type ApiKeyPrincipal } from "@/lib/api-keys";
import { requireAuth } from "@/lib/auth";
import type { User } from "@/lib/users";

type Actor =
  | { kind: "user"; user: User }
  | { kind: "api-key"; principal: ApiKeyPrincipal };

type GraphqlContext = { actor: Actor };

function hasFullAccess(actor: Actor) {
  return actor.kind === "api-key"
    ? actor.principal.type === "system"
    : actor.user.role === "super_admin" || actor.user.role === "admin";
}

function canAccessDevice(actor: Actor, device: Device) {
  if (hasFullAccess(actor)) return true;
  if (actor.kind === "api-key") {
    return device.ownerId === actor.principal.userId;
  }
  return device.ownerId === actor.user.userId || device.orgId === actor.user.orgId;
}

async function requireDeviceAccess(actor: Actor, deviceId: string) {
  if (hasFullAccess(actor)) return;
  const device = await getDevice(deviceId);
  if (!device || !canAccessDevice(actor, device)) {
    throw new GraphQLError("device not found");
  }
}

async function authenticate(request: Request): Promise<Actor | Response> {
  const suppliedKey = extractApiKeyFromHeaders(request.headers);
  const isApiKey = request.headers.has("x-api-key") || suppliedKey?.startsWith("bair1_");
  if (isApiKey) {
    const principal = await validateApiKey(suppliedKey, ["read:readings", "read:devices"]);
    return principal
      ? { kind: "api-key", principal }
      : Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAuth(request);
  return auth instanceof Response ? auth : { kind: "user", user: auth.user };
}

const schema = createSchema<GraphqlContext>({
  typeDefs: /* GraphQL */ `
    type Reading {
      deviceId: String!
      timestamp: String!
      aqi: Int!
      gasRaw: Int
      gasVoltage: Float
      airState: String
      rssi: Int
      firmwareVersion: String
      uptimeMs: Float
      sample: Int
      transport: String
      lat: Float
      lng: Float
      locationAccuracy: Float
      pm1: Float
      pm25: Float
      pm4: Float
      pm10: Float
      sensorModel: String
      board: String
    }

    type RegisteredDevice {
      deviceId: String!
      name: String!
      location: String!
      lat: Float
      lng: Float
      orgId: String!
      status: String!
      createdAt: String!
      latestReading: Reading
    }

    type AqiTimeSeries {
      timestamp: String!
      aqi: Int!
      gasVoltage: Float
      rssi: Int
      lat: Float
      lng: Float
    }

    type LocationPoint {
      timestamp: String!
      lat: Float!
      lng: Float!
      aqi: Int!
      accuracy: Float
    }

    type NotecardTelemetry {
      capturedAt: String!
      receivedAt: String!
      temperature: Float
      humidity: Float
      pressure: Float
      locationAvailable: Boolean!
      locationSource: String
      sourceFile: String
      updatedAt: String!
    }

    type Query {
      readings(deviceId: String!, limit: Int): [Reading!]!
      latestReading(deviceId: String!): Reading
      activeDeviceIds: [String!]!
      registeredDevices: [RegisteredDevice!]!
      timeSeries(
        deviceId: String!
        from: String!
        to: String!
      ): [AqiTimeSeries!]!
      locationTrail(
        deviceId: String!
        from: String!
        to: String!
      ): [LocationPoint!]!
      notecardTelemetry(deviceId: String!): NotecardTelemetry
    }
  `,
  resolvers: {
    Query: {
      readings: async (_parent, args, context) => {
        await requireDeviceAccess(context.actor, args.deviceId);
        return getReadings(args.deviceId, args.limit ?? 100);
      },
      latestReading: async (_parent, args, context) => {
        await requireDeviceAccess(context.actor, args.deviceId);
        return getLatestReading(args.deviceId);
      },
      activeDeviceIds: async (_parent, _args, context) => {
        if (hasFullAccess(context.actor)) return getAllDevices();
        const devices = await getAllDevicesRegistry();
        return devices.filter((device) => canAccessDevice(context.actor, device)).map((device) => device.deviceId);
      },
      registeredDevices: async (_parent, _args, context) => {
        const devices = await getAllDevicesRegistry();
        return hasFullAccess(context.actor)
          ? devices
          : devices.filter((device) => canAccessDevice(context.actor, device));
      },
      timeSeries: async (_parent, args, context) => {
        await requireDeviceAccess(context.actor, args.deviceId);
        const readings = await getReadingsInRange(
          args.deviceId,
          args.from,
          args.to
        );
        return readings.map((r) => ({
          timestamp: r.timestamp,
          aqi: r.aqi,
          gasVoltage: r.gasVoltage,
          rssi: r.rssi,
          lat: r.lat,
          lng: r.lng,
        }));
      },
      locationTrail: async (_parent, args, context) => {
        await requireDeviceAccess(context.actor, args.deviceId);
        const readings = await getReadingsInRange(
          args.deviceId,
          args.from,
          args.to
        );
        return readings
          .filter((r) => r.lat != null && r.lng != null)
          .map((r) => ({
            timestamp: r.timestamp,
            lat: r.lat!,
            lng: r.lng!,
            aqi: r.aqi,
            accuracy: r.locationAccuracy,
          }));
      },
      notecardTelemetry: async (_parent, args, context) => {
        await requireDeviceAccess(context.actor, args.deviceId);
        const telemetry = await getNotecardTelemetry(args.deviceId);
        return telemetry
          ? {
              ...telemetry,
              locationAvailable: telemetry.lat != null && telemetry.lng != null,
            }
          : null;
      },
    },
    RegisteredDevice: {
      latestReading: async (parent: Device) => {
        return getLatestReading(parent.deviceId);
      },
    },
  },
});

const yoga = createYoga<GraphqlContext>({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
});

export async function GET(request: Request) {
  const actor = await authenticate(request);
  return actor instanceof Response ? actor : yoga.handleRequest(request, { actor });
}

export async function POST(request: Request) {
  const actor = await authenticate(request);
  return actor instanceof Response ? actor : yoga.handleRequest(request, { actor });
}
