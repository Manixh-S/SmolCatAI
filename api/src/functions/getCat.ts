import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getUserIdFromHeader } from "../shared/auth";
import { applyDecay, buildDefaultState, normalizeStoredState } from "../shared/catState";
import { getTableClient, STATE_TABLE } from "../shared/tables";

const PARTITION_KEY = "cat";

type CatStateEntity = {
  partitionKey: string;
  rowKey: string;
  fullness?: number;
  /** Legacy field from the old schema (high = starving); converted on read. */
  hunger?: number;
  happiness: number;
  energy: number;
  lastUpdated: number;
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

  const tableClient = getTableClient(connectionString, STATE_TABLE);
  const now = Date.now();

  try {
    const entity = await tableClient.getEntity<CatStateEntity>(PARTITION_KEY, userId);
    const updatedState = applyDecay(normalizeStoredState(entity, now), now);

    return {
      status: 200,
      jsonBody: updatedState,
    };
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      return {
        status: 200,
        jsonBody: buildDefaultState(now),
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
