import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "eu-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const TABLE = "bair1-devices";

export type DeviceStatus = "active" | "inactive" | "provisioning";

export interface Device {
  deviceId: string;
  name: string;
  location: string;
  lat: number | null;
  lng: number | null;
  ownerId: string;
  orgId: string;
  status: DeviceStatus;
  createdAt: string;
}

function parseDevice(item: Record<string, any>): Device {
  return {
    deviceId: item.deviceId?.S ?? "",
    name: item.name?.S ?? "",
    location: item.location?.S ?? "",
    lat: item.lat?.N != null ? Number(item.lat.N) : null,
    lng: item.lng?.N != null ? Number(item.lng.N) : null,
    ownerId: item.ownerId?.S ?? "",
    orgId: item.orgId?.S ?? "default",
    status: (item.status?.S as DeviceStatus) ?? "inactive",
    createdAt: item.createdAt?.S ?? "",
  };
}

export async function getDevice(deviceId: string): Promise<Device | null> {
  const result = await client.send(
    new GetItemCommand({
      TableName: TABLE,
      Key: { deviceId: { S: deviceId } },
    })
  );
  return result.Item ? parseDevice(result.Item) : null;
}

export async function createDevice(device: Device): Promise<void> {
  await client.send(
    new PutItemCommand({
      TableName: TABLE,
      Item: {
        deviceId: { S: device.deviceId },
        name: { S: device.name },
        location: { S: device.location },
        ...(device.lat != null ? { lat: { N: String(device.lat) } } : {}),
        ...(device.lng != null ? { lng: { N: String(device.lng) } } : {}),
        ownerId: { S: device.ownerId },
        orgId: { S: device.orgId },
        status: { S: device.status },
        createdAt: { S: device.createdAt },
      },
    })
  );
}

export async function updateDevice(
  deviceId: string,
  updates: Partial<Pick<Device, "name" | "location" | "lat" | "lng" | "status" | "ownerId">>
): Promise<void> {
  const exprs: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, any> = {};

  if (updates.name !== undefined) {
    exprs.push("#n = :name");
    names["#n"] = "name";
    values[":name"] = { S: updates.name };
  }
  if (updates.location !== undefined) {
    exprs.push("#loc = :loc");
    names["#loc"] = "location";
    values[":loc"] = { S: updates.location };
  }
  if (updates.lat !== undefined) {
    exprs.push("lat = :lat");
    values[":lat"] = updates.lat != null ? { N: String(updates.lat) } : { NULL: true };
  }
  if (updates.lng !== undefined) {
    exprs.push("lng = :lng");
    values[":lng"] = updates.lng != null ? { N: String(updates.lng) } : { NULL: true };
  }
  if (updates.status !== undefined) {
    exprs.push("#st = :status");
    names["#st"] = "status";
    values[":status"] = { S: updates.status };
  }
  if (updates.ownerId !== undefined) {
    exprs.push("ownerId = :ownerId");
    values[":ownerId"] = { S: updates.ownerId };
  }

  if (exprs.length === 0) return;

  await client.send(
    new UpdateItemCommand({
      TableName: TABLE,
      Key: { deviceId: { S: deviceId } },
      UpdateExpression: `SET ${exprs.join(", ")}`,
      ...(Object.keys(names).length > 0
        ? { ExpressionAttributeNames: names }
        : {}),
      ExpressionAttributeValues: values,
    })
  );
}

export async function deleteDevice(deviceId: string): Promise<void> {
  await client.send(
    new DeleteItemCommand({
      TableName: TABLE,
      Key: { deviceId: { S: deviceId } },
    })
  );
}

export async function getAllDevicesRegistry(): Promise<Device[]> {
  const result = await client.send(
    new ScanCommand({ TableName: TABLE })
  );
  return (result.Items ?? []).map(parseDevice);
}

export async function getDevicesForUser(userId: string): Promise<Device[]> {
  const all = await getAllDevicesRegistry();
  return all.filter((d) => d.ownerId === userId);
}

export async function getDevicesForOrg(orgId: string): Promise<Device[]> {
  const all = await getAllDevicesRegistry();
  return all.filter((d) => d.orgId === orgId);
}
