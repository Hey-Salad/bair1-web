import { createSchema, createYoga } from "graphql-yoga";
import {
  getReadings,
  getLatestReading,
  getAllDevices,
  getReadingsInRange,
} from "@/lib/dynamo";
import { getAllDevicesRegistry, type Device } from "@/lib/devices";

const schema = createSchema({
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
    }

    type RegisteredDevice {
      deviceId: String!
      name: String!
      location: String!
      lat: Float
      lng: Float
      ownerId: String!
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
    }
  `,
  resolvers: {
    Query: {
      readings: async (_parent, args) => {
        return getReadings(args.deviceId, args.limit ?? 100);
      },
      latestReading: async (_parent, args) => {
        return getLatestReading(args.deviceId);
      },
      activeDeviceIds: async () => {
        return getAllDevices();
      },
      registeredDevices: async () => {
        const devices = await getAllDevicesRegistry();
        return devices;
      },
      timeSeries: async (_parent, args) => {
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
        }));
      },
    },
    RegisteredDevice: {
      latestReading: async (parent: Device) => {
        return getLatestReading(parent.deviceId);
      },
    },
  },
});

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
});

export async function GET(request: Request) {
  return yoga.handleRequest(request, {});
}

export async function POST(request: Request) {
  return yoga.handleRequest(request, {});
}
