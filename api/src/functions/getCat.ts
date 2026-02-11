import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

type CatStateEntity = {
  partitionKey: string;
  rowKey: string;
  hunger: number;
  happiness: number;
  lastUpdated: number;
};

type CatState = {
  hunger: number;
  happiness: number;
  lastUpdated: number;
};

const TABLE_NAME = "CatStates";
const PARTITION_KEY = "cat";
const HUNGER_PER_MINUTE = 1;
const HAPPINESS_PER_MINUTE = 1;

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

const buildDefaultState = (): CatState => ({
  hunger: 0,
  happiness: 100,
  lastUpdated: Date.now(),
});

const applyDecay = (state: CatState, now: number): CatState => {
  const lastUpdated = Number(state.lastUpdated);
  const safeLastUpdated = Number.isFinite(lastUpdated) ? lastUpdated : now;
  const minutesPassed = Math.max(0, Math.floor((now - safeLastUpdated) / 60000));

  if (minutesPassed === 0) {
    return { ...state, lastUpdated: now };
  }

  const hunger = clamp(state.hunger + minutesPassed * HUNGER_PER_MINUTE, 0, 100);
  const happiness = clamp(state.happiness - minutesPassed * HAPPINESS_PER_MINUTE, 0, 100);

  return {
    hunger,
    happiness,
    lastUpdated: now,
  };
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

  const tableClient = TableClient.fromConnectionString(connectionString, TABLE_NAME);
  const now = Date.now();

  try {
    const entity = (await tableClient.getEntity(PARTITION_KEY, userId)) as CatStateEntity;
    const updatedState = applyDecay(
      {
        hunger: Number(entity.hunger) || 0,
        happiness: Number(entity.happiness) || 0,
        lastUpdated: Number(entity.lastUpdated) || now,
      },
      now
    );

    return {
      status: 200,
      jsonBody: updatedState,
    };
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      return {
        status: 200,
        jsonBody: buildDefaultState(),
      };
    }

    context.error("Failed to fetch cat state", error);
    return {
      status: 500,
      jsonBody: { error: "Failed to fetch cat state." },
    };
  }
};

app.http("getCat", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "getCat",
  handler,
});
