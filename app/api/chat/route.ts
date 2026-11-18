import { createOpenAI } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";
import {
  type JSONSchema7,
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { piConfigured, piFetch } from "@/lib/pi/client";
import { registry } from "@/lib/pi/registry";

export const maxDuration = 300;

const gateway = createOpenAI({
  baseURL: `${(process.env.AI_CHAT_BASE_URL ?? "https://model.arasintegrasi.ai").replace(/\/+$/, "")}/v1`,
  apiKey: process.env.AI_CHAT_API_KEY,
});

type ChatBody = {
  messages: UIMessage[];
  system?: string;
  tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  /** The chat transport sends the initialized thread's remoteId as `id`. */
  id?: string;
  /** Kept for compatibility with callers that pass the thread explicitly. */
  threadId?: string;
};

const lastUserText = (messages: UIMessage[]) => {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "";
  return last.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
};

/** pi records the transcript but does not replay it — send the full history each turn. */
const toPiMessages = (messages: UIMessage[]) =>
  messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.parts
        .filter(
          (part): part is { type: "text"; text: string } => part.type === "text",
        )
        .map((part) => part.text)
        .join("\n")
        .trim(),
    }))
    .filter((message) => message.content.length > 0);

type PiEvent = { type?: string; [key: string]: unknown };

/** Relay one turn through the pi harness. Returns null to fall back to the gateway. */
const piChat = async (req: Request, body: ChatBody): Promise<Response | null> => {
  if (!piConfigured()) return null;
  const userText = lastUserText(body.messages);
  if (!userText) return null;

  const threadId = body.id ?? body.threadId;
  const thread = threadId ? await registry.get(threadId) : undefined;

  let upstream: Response;
  try {
    upstream = await piFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        harnessId: process.env.PI_HARNESS ?? "pi",
        ...(process.env.PI_MODEL ? { modelId: process.env.PI_MODEL } : {}),
        // The full agent harness: sandbox tools (file/shell), web search, and
        // document generation — never the lightweight chat-only path.
        mode: "work",
        ...(thread?.conversationId
          ? { conversationId: thread.conversationId }
          : {}),
        messages: toPiMessages(body.messages),
      }),
      signal: req.signal,
    });
  } catch {
    return null;
  }
  if (!upstream.ok || !upstream.body) return null;

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });

      let textId: string | null = null;
      let reasoningId: string | null = null;
      let buffer = "";
      let failure: string | null = null;

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            let event: PiEvent;
            try {
              event = JSON.parse(line.slice(6)) as PiEvent;
            } catch {
              continue;
            }

            if (event.type === "text" && typeof event.delta === "string") {
              if (!textId) {
                textId = "0";
                writer.write({ type: "text-start", id: textId });
              }
              writer.write({ type: "text-delta", id: textId, delta: event.delta });
            } else if (
              event.type === "reasoning" &&
              typeof event.delta === "string"
            ) {
              if (!reasoningId) {
                reasoningId = "r0";
                writer.write({ type: "reasoning-start", id: reasoningId });
              }
              writer.write({
                type: "reasoning-delta",
                id: reasoningId,
                delta: event.delta,
              });
            } else if (
              event.type === "conversation" &&
              typeof event.id === "string" &&
              threadId
            ) {
              await registry.update(threadId, { conversationId: event.id });
            } else if (
              event.type === "title" &&
              typeof event.title === "string" &&
              threadId
            ) {
              await registry.update(threadId, { title: event.title });
            } else if (
              event.type === "error" &&
              typeof event.message === "string"
            ) {
              failure = event.message;
            }
          }
        }
      } finally {
        if (reasoningId) writer.write({ type: "reasoning-end", id: reasoningId });
        if (textId) writer.write({ type: "text-end", id: textId });
      }

      if (failure) throw new Error(failure);

      if (threadId) {
        await registry.update(threadId, {
          lastMessageAt: new Date().toISOString(),
        });
      }
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish" });
    },
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });

  return createUIMessageStreamResponse({ stream });
};

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;

  const viaPi = await piChat(req, body);
  if (viaPi) return viaPi;

  const aiSDKTools = { ...frontendTools(body.tools ?? {}) };
  const result = streamText({
    abortSignal: req.signal,
    model: gateway.chat(process.env.AI_CHAT_MODEL ?? "Qwen/Qwen3.8-27B"),
    messages: await convertToModelMessages(body.messages, { tools: aiSDKTools }),
    system: body.system,
    tools: aiSDKTools,
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
}
