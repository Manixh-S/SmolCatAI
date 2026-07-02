import { TableClient, TableServiceClient } from "@azure/data-tables";

export const CHAT_TABLE = "CatChatHistory";
export const SESSION_TABLE = "CatSessions";
export const STATE_TABLE = "CatStates";
export const RATE_LIMIT_TABLE = "CatRateLimits";

/** Creates a table if it does not already exist (409 = already there). */
export const ensureTable = async (
  serviceClient: TableServiceClient,
  tableName: string
): Promise<void> => {
  try {
    await serviceClient.createTable(tableName);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== 409) {
      throw error;
    }
  }
};

export const getTableClient = (connectionString: string, tableName: string): TableClient =>
  TableClient.fromConnectionString(connectionString, tableName);
