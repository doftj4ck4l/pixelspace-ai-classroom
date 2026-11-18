import { NextResponse } from "next/server";
import { piConfigured, piFetch } from "@/lib/pi/client";
import { registry } from "@/lib/pi/registry";

type PiMessage = {
  id?: string;
  role?: string;
  content?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const thread = await registry.get(id);
  if (!thread?.conversationId || !piConfigured()) {
    return NextResponse.json({ messages: [] });
  }

  try {
    const res = await piFetch(`/api/conversations/${thread.conversationId}`);
    if (!res.ok) return NextResponse.json({ messages: [] });
    const data = (await res.json()) as { messages?: PiMessage[] };

    const rows = (data.messages ?? [])
      .filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.length > 0,
      )
      .map((message, index, list) => {
        const messageId = message.id ?? `${thread.conversationId}-${index}`;
        const previous = list[index - 1];
        return {
          id: messageId,
          parentId:
            index > 0
              ? (previous.id ?? `${thread.conversationId}-${index - 1}`)
              : null,
          format: "ai-sdk/v6",
          content: {
            role: message.role,
            parts: [{ type: "text", text: message.content }],
          },
        };
      });

    return NextResponse.json({ messages: rows });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
