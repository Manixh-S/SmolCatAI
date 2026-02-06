import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

type CatStats = {
  hunger: number;
  happiness: number;
  energy: number;
};

type ChatWithCatRequest = {
  stats: CatStats;
  userMessage: string;
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

  const { stats, userMessage } = payload;

  if (!stats || typeof userMessage !== "string" || userMessage.trim().length === 0) {
    return {
      status: 400,
      jsonBody: { error: "stats and userMessage are required." },
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

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
    model: "gemini-1.5-flash",
    systemInstruction: systemPrompt,
  });

  try {
    const result = await model.generateContent(userMessage.trim());
    const responseText = result.response.text();

    return {
      status: 200,
      jsonBody: { text: responseText },
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
