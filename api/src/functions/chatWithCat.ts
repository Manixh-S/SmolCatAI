import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient, TableServiceClient } from "@azure/data-tables";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { randomUUID } from "crypto";

type CatStats = {
  hunger: number;
  happiness: number;
  energy: number;
};

type ChatWithCatRequest = {
  sessionId?: string;
  catName?: string;
  stats: CatStats;
  userMessage: string;
};

type ChatMessageEntity = {
  partitionKey: string;
  rowKey: string;
  role: "user" | "cat";
  text: string;
  createdAt: number;
};

type SessionEntity = {
  partitionKey: string;
  rowKey: string;
  userId?: string;
  catName?: string;
  hunger?: number;
  happiness?: number;
  energy?: number;
  lastUpdated: number;
};

type ClientPrincipal = {
  userId?: string;
};

const CHAT_TABLE = "CatChatHistory";
const SESSION_TABLE = "CatSessions";
const SESSION_PARTITION = "session";
const MAX_HISTORY = 8;

const getUserIdFromHeader = (request: HttpRequest): string | null => {
  const headerValue = request.headers.get("x-ms-client-principal");
  if (!headerValue) {
    return null;
  }

  try {
    const decoded = Buffer.from(headerValue, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as ClientPrincipal;
    return parsed.userId ?? null;
  } catch {
    return null;
  }
};

const normalizeSessionId = (sessionId?: string): string => {
  const trimmed = sessionId?.trim();
  return trimmed ? trimmed : randomUUID();
};

const buildChatRowKey = (timestamp: number): string => {
  const inverted = 9_999_999_999_999 - timestamp;
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${inverted.toString().padStart(13, "0")}-${suffix}`;
};

const ensureTable = async (serviceClient: TableServiceClient, tableName: string) => {
  try {
    await serviceClient.createTable(tableName);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== 409) {
      throw error;
    }
  }
};

const handler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
  let payload: ChatWithCatRequest;

  try {
    payload = (await request.json()) as ChatWithCatRequest;
  } catch {
    return {
      status: 400,
      jsonBody: { error: "Invalid JSON body." },
    };
  }

  const { stats, userMessage, catName } = payload;

  if (!stats || typeof userMessage !== "string" || userMessage.trim().length === 0) {
    return {
      status: 400,
      jsonBody: { error: "stats and userMessage are required." },
    };
  }

  if (![stats.hunger, stats.happiness, stats.energy].every((value) => Number.isFinite(value))) {
    return {
      status: 400,
      jsonBody: { error: "stats must include hunger, happiness, and energy." },
    };
  }

  const sessionId = normalizeSessionId(payload.sessionId);

  const apiKey = process.env.GEMINI_API_KEY;
  const connectionString = process.env.AzureWebJobsStorage;

  if (!apiKey) {
    context.error("GEMINI_API_KEY is not configured.");
    return {
      status: 500,
      jsonBody: { error: "Server configuration error." },
    };
  }

  const systemPrompt = `You are a cozy virtual cat. Your hunger is ${stats.hunger}. Keep answers short and cute.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  const trimmedMessage = userMessage.trim();
  const chatHistory: ChatMessageEntity[] = [];

  let chatClient: TableClient | null = null;
  let sessionClient: TableClient | null = null;

  if (connectionString) {
    try {
      const serviceClient = TableServiceClient.fromConnectionString(connectionString);
      await Promise.all([ensureTable(serviceClient, CHAT_TABLE), ensureTable(serviceClient, SESSION_TABLE)]);

      chatClient = TableClient.fromConnectionString(connectionString, CHAT_TABLE);
      sessionClient = TableClient.fromConnectionString(connectionString, SESSION_TABLE);

      const safeSessionId = sessionId.replace(/'/g, "''");
      const query = chatClient.listEntities<ChatMessageEntity>({
        queryOptions: {
          filter: `PartitionKey eq '${safeSessionId}'`,
          select: ["rowKey", "role", "text", "createdAt"],
        },
      });

      let count = 0;
      for await (const entry of query) {
        if (entry.text && entry.role) {
          chatHistory.push(entry);
          count += 1;
        }

        if (count >= MAX_HISTORY) {
          break;
        }
      }

      chatHistory.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    } catch (error) {
      context.warn("Failed to load chat history", error);
      chatHistory.length = 0;
    }
  }

  try {
    const contents = chatHistory.map((entry) => ({
      role: entry.role === "user" ? "user" : "model",
      parts: [{ text: entry.text }],
    }));

    contents.push({ role: "user", parts: [{ text: trimmedMessage }] });

    const result = await model.generateContent({ contents });
    const responseText = result.response.text();

    if (chatClient) {
      const now = Date.now();
      const userEntity: ChatMessageEntity = {
        partitionKey: sessionId,
        rowKey: buildChatRowKey(now),
        role: "user",
        text: trimmedMessage,
        createdAt: now,
      };

      const catEntity: ChatMessageEntity = {
        partitionKey: sessionId,
        rowKey: buildChatRowKey(now + 1),
        role: "cat",
        text: responseText,
        createdAt: now + 1,
      };

      try {
        await Promise.all([chatClient.createEntity(userEntity), chatClient.createEntity(catEntity)]);
      } catch (error) {
        context.warn("Failed to save chat history", error);
      }
    }

    if (sessionClient) {
      const userId = getUserIdFromHeader(request);
      if (userId) {
        const now = Date.now();
        const sessionEntity: SessionEntity = {
          partitionKey: SESSION_PARTITION,
          rowKey: sessionId,
          userId,
          catName: catName?.trim() || undefined,
          hunger: stats.hunger,
          happiness: stats.happiness,
          energy: stats.energy,
          lastUpdated: now,
        };

        try {
          await sessionClient.upsertEntity(sessionEntity, "Merge");
        } catch (error) {
          context.warn("Failed to save session metadata", error);
        }
      }
    }

    return {
      status: 200,
      jsonBody: { text: responseText, sessionId },
    };
  } catch (error) {
    context.error("Failed to generate cat response", error);
    return {
      status: 500,
      jsonBody: { error: "Failed to generate response." },
    };
  }
};

app.http("chatWithCat", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler,
});
