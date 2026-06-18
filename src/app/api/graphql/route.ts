import { createSchema, createYoga } from "graphql-yoga";
import {
  getReadings,
  getLatestReading,
  getAllDevices,
  getReadingsInRange,
} from "@/lib/dynamo";

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

    type Device {
      deviceId: String!
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
      devices: [Device!]!
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
      devices: async () => {
        const ids = await getAllDevices();
        return ids.map((deviceId) => ({ deviceId }));
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
    Device: {
      latestReading: async (parent) => {
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
