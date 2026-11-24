import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { piConfigured, piFetch } from "@/lib/pi/client";
import { registry } from "@/lib/pi/registry";

type PiMessage = { id?: string; kind?: string; text?: string };
type PiToolRow = {
  name?: string;
  args?: unknown;
  result?: unknown;
  ms?: number;
  ok?: boolean;
};
type HistoryRow = {
  id: string;
  parentId: string | null;
  format: string;
  content: unknown;
};

const MAX_RESULT = 4000;

/**
 * Deck-edit and space-grounded turns prepend context to the user message.
 * The transcript stores it verbatim, but the chat should show only what the
 * user actually typed.
 */
const stripDeckEditContext = (text: string) => {
  if (
    !text.startsWith("[Deck edit session]") &&
    !text.startsWith("[Artifact edit session]") &&
    !text.startsWith("[Sumber rujukan buku teks]")
  ) {
    return text;
  }
  const marker = "User request: ";
  const at = text.lastIndexOf(marker);
  return at >= 0 ? text.slice(at + marker.length) : text;
};

/**
 * Rebuild the UI message history from pi's transcript for one owned thread,
 * including tool calls and render_ui blocks.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const thread = await registry.get(user.id, id);
  if (!thread?.conversationId || !piConfigured()) {
    return NextResponse.json({ messages: [] });
  }

  try {
    const res = await piFetch(`/api/conversations/${thread.conversationId}`);
    if (!res.ok) return NextResponse.json({ messages: [] });
    const data = (await res.json()) as { messages?: PiMessage[] };

    const rows: HistoryRow[] = [];
    let previousId: string | null = null;
    let assistantId: string | null = null;
    let assistantParts: unknown[] = [];

    const flushAssistant = () => {
      if (assistantId && assistantParts.length > 0) {
        rows.push({
          id: assistantId,
          parentId: previousId,
          format: "ai-sdk/v6",
          content: { role: "assistant", parts: assistantParts },
        });
        previousId = assistantId;
      }
      assistantId = null;
      assistantParts = [];
    };

    const ensureAssistant = () => {
      if (!assistantId) {
        assistantId = `${thread.conversationId}-a${rows.length}`;
      }
      return assistantId;
    };

    for (const message of data.messages ?? []) {
      const text = typeof message.text === "string" ? message.text : "";
      const rowId = message.id ?? `${thread.conversationId}-${rows.length}`;

      if (message.kind === "user") {
        if (!text) continue;
        flushAssistant();
        rows.push({
          id: rowId,
          parentId: previousId,
          format: "ai-sdk/v6",
          content: {
            role: "user",
            parts: [{ type: "text", text: stripDeckEditContext(text) }],
          },
        });
        previousId = rowId;
      } else if (message.kind === "assistant") {
        if (!text) continue;
        ensureAssistant();
        assistantParts.push({ type: "text", text });
      } else if (message.kind === "tool") {
        let parsed: PiToolRow | null = null;
        try {
          parsed = JSON.parse(text) as PiToolRow;
        } catch {
          parsed = null;
        }
        if (!parsed?.name) continue;
        ensureAssistant();
        const ok = parsed.ok !== false;
        const result =
          typeof parsed.result === "string"
            ? parsed.result.slice(0, MAX_RESULT)
            : parsed.result;
        assistantParts.push({
          type: "dynamic-tool",
          toolName: parsed.name,
          toolCallId: rowId,
          state: ok ? "output-available" : "output-error",
          input: parsed.args ?? {},
          ...(ok
            ? { output: { content: result, ms: parsed.ms } }
            : {
                errorText:
                  typeof result === "string" ? result : "Tool call failed",
              }),
        });
      }
    }

    flushAssistant();
    return NextResponse.json({ messages: rows });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
