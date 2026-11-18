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

const messageText = (message: UIMessage) =>
  message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

/**
 * The new user turn is the text of the last message, and only when the last
 * message IS a user message. A request whose last message is an assistant or
 * tool continuation has no new turn to run — running it anyway makes the
 * agent answer an empty message and loop.
 */
const newUserText = (messages: UIMessage[]) => {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return null;
  return messageText(last);
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
  const userText = newUserText(body.messages);
  if (userText === null || userText.length === 0) return null;

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
      let textSeq = 0;
      let buffer = "";
      let failure: string | null = null;
      const pendingToolIds = new Map<string, string[]>();
      const openToolIds = new Set<string>();
      const completedToolIds = new Set<string>();
      let lastToolId: string | null = null;

      const closeText = () => {
        if (textId) {
          writer.write({ type: "text-end", id: textId });
          textId = null;
        }
      };

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
                textId = String(textSeq++);
                writer.write({ type: "text-start", id: textId });
              }
              writer.write({ type: "text-delta", id: textId, delta: event.delta });
            } else if (
              event.type === "tool_call" &&
              typeof event.id === "string" &&
              typeof event.name === "string"
            ) {
              // Close the current text segment so the transcript interleaves
              // like pixelspacev3's: text segment, tool group, next segment.
              closeText();
              lastToolId = event.id;
              openToolIds.add(event.id);
              const queued = pendingToolIds.get(event.name) ?? [];
              queued.push(event.id);
              pendingToolIds.set(event.name, queued);
              writer.write({
                type: "tool-input-start",
                toolCallId: event.id,
                toolName: event.name,
                dynamic: true,
              });
              writer.write({
                type: "tool-input-available",
                toolCallId: event.id,
                toolName: event.name,
                input: event.args ?? {},
                dynamic: true,
              });
            } else if (
              event.type === "tool_result" &&
              typeof event.name === "string"
            ) {
              const queued = pendingToolIds.get(event.name) ?? [];
              const toolCallId =
                typeof event.id === "string"
                  ? event.id
                  : (queued.shift() ?? lastToolId);
              if (toolCallId) {
                completedToolIds.add(toolCallId);
                if (event.ok === false) {
                  writer.write({
                    type: "tool-output-error",
                    toolCallId,
                    errorText: String(event.content ?? "Tool call failed"),
                    dynamic: true,
                  });
                } else {
                  const content =
                    typeof event.content === "string"
                      ? event.content.slice(0, 4000)
                      : event.content;
                  writer.write({
                    type: "tool-output-available",
                    toolCallId,
                    output: { content, ms: event.ms, calls: event.calls },
                    dynamic: true,
                  });
                }
              }
            } else if (
              event.type === "ask_user" &&
              typeof event.id === "string"
            ) {
              // The agent has paused the run waiting for a human. The question
              // id is live-only, so it has to ride a data part to the client.
              writer.write({
                type: "data-ask-user",
                data: {
                  questionId: event.id,
                  question:
                    typeof event.question === "string" ? event.question : "",
                  options: Array.isArray(event.options)
                    ? event.options.map((option) => String(option))
                    : [],
                  kind: event.kind === "approval" ? "approval" : "question",
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any);
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
        // A tool call the client sees without an output is a dangling tool call
        // — the runtime treats it as pending forever and can auto-continue the
        // run. Close every one we opened but never completed.
        for (const toolCallId of openToolIds) {
          if (!completedToolIds.has(toolCallId)) {
            writer.write({
              type: "tool-output-error",
              toolCallId,
              errorText: "The tool did not return a result.",
              dynamic: true,
            });
          }
        }
        closeText();
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

  if (newUserText(body.messages) === null) {
    // No new user turn (tool continuation without client tools): finish cleanly.
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: "start" });
        writer.write({ type: "start-step" });
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

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
