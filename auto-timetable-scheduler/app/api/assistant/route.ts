type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 3000;
const MAX_CONVERSATION_LENGTH = 12000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json(
      { error: "Send chat messages as JSON." },
      { status: 415 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 64000) {
    return Response.json(
      { error: "This chat request is too large." },
      { status: 413 }
    );
  }

  const payload: unknown = await request.json().catch(() => null);
  if (!isRecord(payload) || !Array.isArray(payload.messages)) {
    return Response.json(
      { error: "The chat request must include a messages array." },
      { status: 400 }
    );
  }

  if (
    payload.messages.length === 0 ||
    payload.messages.length > MAX_MESSAGES
  ) {
    return Response.json(
      { error: `Send between 1 and ${MAX_MESSAGES} chat messages.` },
      { status: 400 }
    );
  }

  const messages: ChatMessage[] = [];
  let conversationLength = 0;

  for (const item of payload.messages) {
    if (
      !isRecord(item) ||
      (item.role !== "user" && item.role !== "assistant") ||
      typeof item.content !== "string"
    ) {
      return Response.json(
        { error: "Each chat message needs a valid role and text content." },
        { status: 400 }
      );
    }

    const content = item.content.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      return Response.json(
        { error: `Messages must contain 1-${MAX_MESSAGE_LENGTH} characters.` },
        { status: 400 }
      );
    }

    conversationLength += content.length;
    if (conversationLength > MAX_CONVERSATION_LENGTH) {
      return Response.json(
        { error: "This conversation is too long. Start a new chat session." },
        { status: 400 }
      );
    }

    messages.push({ role: item.role, content });
  }

  if (messages[messages.length - 1]?.role !== "user") {
    return Response.json(
      { error: "The latest chat message must be from the user." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_CHAT_MODEL;
  if (!apiKey || !model) {
    return Response.json(
      {
        error:
          "AI assistant is not configured. Set OPENAI_API_KEY and OPENAI_CHAT_MODEL in the server environment, then restart the app.",
      },
      { status: 503 }
    );
  }

  let providerResponse: Response;
  try {
    providerResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are Chronos, a friendly assistant for a student timetable planner. Help students reason about courses, study schedules, and using the app. Be clear, supportive, and concise. Do not claim to change or access the user's timetable; explain when an action must be done in the app.",
          },
          ...messages,
        ],
        max_tokens: 600,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return Response.json(
        { error: "The AI assistant timed out. Please try again." },
        { status: 504 }
      );
    }
    return Response.json(
      {
        error:
          "The AI assistant could not reach its provider. Check the server connection and try again.",
      },
      { status: 502 }
    );
  }

  const providerPayload: unknown = await providerResponse
    .json()
    .catch(() => null);
  if (!providerResponse.ok) {
    return Response.json(
      {
        error: `The AI provider returned an error (${providerResponse.status}). Check the server-side API key and model configuration.`,
      },
      { status: 502 }
    );
  }

  if (!isRecord(providerPayload) || !Array.isArray(providerPayload.choices)) {
    return Response.json(
      { error: "The AI provider returned an invalid response." },
      { status: 502 }
    );
  }

  const firstChoice = providerPayload.choices[0];
  if (
    !isRecord(firstChoice) ||
    !isRecord(firstChoice.message) ||
    typeof firstChoice.message.content !== "string" ||
    !firstChoice.message.content.trim()
  ) {
    return Response.json(
      { error: "The AI provider did not return a text response." },
      { status: 502 }
    );
  }

  return Response.json({ reply: firstChoice.message.content.trim() });
}
