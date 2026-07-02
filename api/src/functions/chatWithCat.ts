import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient, TableServiceClient } from "@azure/data-tables";
import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";
import { getUserIdFromHeader } from "../shared/auth";
import { CatStats } from "../shared/catState";
import { checkRateLimit } from "../shared/rateLimit";
import { CHAT_TABLE, ensureTable, getTableClient, RATE_LIMIT_TABLE, SESSION_TABLE } from "../shared/tables";

type ChatWithCatRequest = {
  sessionId?: string;
  catName?: string;
  stats: CatStats;
  userMessage: string;
};

type SessionEntity = {
  partitionKey: string;
  rowKey: string;
  userId?: string;
  catName?: string;
  lastUpdated?: number;
};

type ChatMessageEntity = {
  partitionKey: string;
  rowKey: string;
  role: "user" | "cat";
  text: string;
  createdAt: number;
};

const SESSION_PARTITION = "session";
const MAX_HISTORY = 8;
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeSessionId = (sessionId?: string): string | null => {
  const trimmed = sessionId?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Row keys use an inverted timestamp so Table Storage's natural ascending
 * order returns the newest messages first, letting us stop after MAX_HISTORY.
 */
const buildChatRowKey = (timestamp: number): string => {
  const inverted = 9_999_999_999_999 - timestamp;
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${inverted.toString().padStart(13, "0")}-${suffix}`;
};

const buildSystemPrompt = (catName: string, stats: CatStats): string => `
You are a sentient, pixel-art virtual cat living in a retro web application.
Your name is "${catName}". You speak in a cute, short, slightly sassy manner.

CURRENT VITAL STATS:
- Fullness: ${stats.fullness} / 100 (Low = Starving/Angry, High = Well Fed)
- Happiness: ${stats.happiness} / 100 (Low = Sad/Ignored)
- Energy: ${stats.energy} / 100 (High = Wide Awake, Low = Exhausted)

BEHAVIOR RULES:
1. **If Fullness is below 20:** You are "HANGRY". Ignore the user's topic and demand food. Use caps lock or hiss.
2. **If Energy is below 20:** You are falling asleep. Slur your words, yawn, or just say "Zzz...".
3. **If Happiness is above 80:** You are affectionate. Purr, use emojis like 😸, and be helpful.
4. **General:** Always include cat sounds (*mrrow*, *purr*, *meow*) and keep responses under 20 words (fit in a chat bubble).
`;

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

  if (![stats.fullness, stats.happiness, stats.energy].every((value) => Number.isFinite(value))) {
    return {
      status: 400,
      jsonBody: { error: "stats must include fullness, happiness, and energy." },
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const connectionString = process.env.AzureWebJobsStorage;

  if (!apiKey) {
    context.error("GEMINI_API_KEY is not configured.");
    return {
      status: 500,
      jsonBody: { error: "Server configuration error." },
    };
  }

  const userId = getUserIdFromHeader(request);
  const requestedSessionId = normalizeSessionId(payload.sessionId);

  if (requestedSessionId && !UUID_V4_REGEX.test(requestedSessionId)) {
    return {
      status: 400,
      jsonBody: { error: "sessionId must be a UUID v4." },
    };
  }

  if (!userId && !requestedSessionId) {
    return {
      status: 400,
      jsonBody: { error: "sessionId is required for anonymous chat." },
    };
  }

  const sessionId = requestedSessionId ?? randomUUID();
  const trimmedMessage = userMessage.trim();
  const chatHistory: ChatMessageEntity[] = [];

  let chatClient: TableClient | null = null;
  let sessionClient: TableClient | null = null;

  if (connectionString) {
    try {
      const serviceClient = TableServiceClient.fromConnectionString(connectionString);
      await Promise.all([
        ensureTable(serviceClient, CHAT_TABLE),
        ensureTable(serviceClient, SESSION_TABLE),
        ensureTable(serviceClient, RATE_LIMIT_TABLE),
      ]);

      chatClient = getTableClient(connectionString, CHAT_TABLE);
      sessionClient = getTableClient(connectionString, SESSION_TABLE);

      // Signed-in sessions are bound to a single authenticated user.
      if (userId) {
        try {
          const existing = await sessionClient.getEntity<SessionEntity>(SESSION_PARTITION, sessionId);
          if (existing.userId && existing.userId !== userId) {
            return {
              status: 403,
              jsonBody: { error: "This chat session belongs to a different account." },
            };
          }
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode !== 404) {
            throw error;
          }
        }
      }

      // Signed-in users are trusted; anonymous sessions get a fixed-window
      // limit so a stray script can't burn the Gemini quota.
      if (!userId) {
        const rateLimitClient = getTableClient(connectionString, RATE_LIMIT_TABLE);
        const allowed = await checkRateLimit(rateLimitClient, sessionId);
        if (!allowed) {
          return {
            status: 429,
            jsonBody: { error: "The cat needs a break. Try again in a minute, or sign in." },
          };
        }
      }

      const safeSessionId = sessionId.replace(/'/g, "''");
      const query = chatClient.listEntities<ChatMessageEntity>({
        queryOptions: {
          filter: `PartitionKey eq '${safeSessionId}'`,
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

    const resolvedCatName = catName?.trim() || "Pixel";
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: buildSystemPrompt(resolvedCatName, stats),
      },
    });

    const responseText = result.text ?? "...mrow?";

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

    // Session metadata links browser sessions to signed-in users. Stats are
    // intentionally NOT duplicated here; CatStates is the single source of
    // truth for persisted cat state.
    if (sessionClient && userId) {
      try {
        await sessionClient.upsertEntity(
          {
            partitionKey: SESSION_PARTITION,
            rowKey: sessionId,
            userId,
            catName: catName?.trim() || undefined,
            lastUpdated: Date.now(),
          },
          "Merge"
        );
      } catch (error) {
        context.warn("Failed to save session metadata", error);
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
