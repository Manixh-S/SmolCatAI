import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserIdFromHeader } from "../shared/auth";
import { clampStat } from "../shared/catState";
import { ensureTable, getTableClient, STATE_TABLE } from "../shared/tables";
import { TableServiceClient } from "@azure/data-tables";

const PARTITION_KEY = "cat";

type CatStateUpdate = {
  hunger: number;
  happiness: number;
  energy: number;
};

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

  if (
    typeof payload.hunger !== "number" ||
    typeof payload.happiness !== "number" ||
    typeof payload.energy !== "number"
  ) {
    return {
      status: 400,
      jsonBody: { error: "hunger, happiness, and energy are required." },
    };
  }

  // The server owns lastUpdated so clients cannot rewind the decay clock.
  const now = Date.now();
  const entity = {
    partitionKey: PARTITION_KEY,
    rowKey: userId,
    hunger: clampStat(payload.hunger),
    happiness: clampStat(payload.happiness),
    energy: clampStat(payload.energy),
    lastUpdated: now,
  };

  try {
    const serviceClient = TableServiceClient.fromConnectionString(connectionString);
    await ensureTable(serviceClient, STATE_TABLE);

    const tableClient = getTableClient(connectionString, STATE_TABLE);
    await tableClient.upsertEntity(entity, "Merge");
    return {
      status: 200,
      jsonBody: {
        hunger: entity.hunger,
        happiness: entity.happiness,
        energy: entity.energy,
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
