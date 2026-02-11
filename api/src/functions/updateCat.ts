import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

type CatStateEntity = {
  partitionKey: string;
  rowKey: string;
  hunger: number;
  happiness: number;
  lastUpdated: number;
};

type CatStateUpdate = {
  hunger: number;
  happiness: number;
  lastUpdated?: number;
};

const TABLE_NAME = "CatStates";
const PARTITION_KEY = "cat";

const getUserIdFromHeader = (request: HttpRequest): string | null => {
  const headerValue = request.headers.get("x-ms-client-principal");
  if (!headerValue) {
    return null;
  }

  try {
    const decoded = Buffer.from(headerValue, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as { userId?: string };
    return parsed.userId ?? null;
  } catch {
    return null;
  }
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const handler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
  const connectionString = process.env.AzureWebJobsStorage;

  if (!connectionString) {
    context.error("AzureWebJobsStorage is not configured.");
    return {
      status: 500,
      jsonBody: { error: "Server configuration error." },
    };
  }

  const userId = getUserIdFromHeader(request);
  if (!userId) {
    return {
      status: 401,
      jsonBody: { error: "Missing user identity." },
    };
  }

  let payload: CatStateUpdate;
  try {
    payload = (await request.json()) as CatStateUpdate;
  } catch {
    return {
      status: 400,
      jsonBody: { error: "Invalid JSON body." },
    };
  }

  if (typeof payload.hunger !== "number" || typeof payload.happiness !== "number") {
    return {
      status: 400,
      jsonBody: { error: "hunger and happiness are required." },
    };
  }

  const now = Date.now();
  const entity: CatStateEntity = {
    partitionKey: PARTITION_KEY,
    rowKey: userId,
    hunger: clamp(payload.hunger, 0, 100),
    happiness: clamp(payload.happiness, 0, 100),
    lastUpdated: Number.isFinite(payload.lastUpdated) ? Number(payload.lastUpdated) : now,
  };

  const tableClient = TableClient.fromConnectionString(connectionString, TABLE_NAME);

  try {
    await tableClient.upsertEntity(entity, "Merge");
    return {
      status: 200,
      jsonBody: {
        hunger: entity.hunger,
        happiness: entity.happiness,
        lastUpdated: entity.lastUpdated,
      },
    };
  } catch (error) {
    context.error("Failed to upsert cat state", error);
    return {
      status: 500,
      jsonBody: { error: "Failed to update cat state." },
    };
  }
};

app.http("updateCat", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "updateCat",
  handler,
});
