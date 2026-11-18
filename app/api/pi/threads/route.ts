import { NextResponse } from "next/server";
import { generateId } from "ai";
import { piConfigured, piFetch } from "@/lib/pi/client";
import { registry } from "@/lib/pi/registry";

type PiConversation = { id: string; title?: string; updatedAt?: number };

export async function GET() {
  const threads = await registry.list();

  if (piConfigured()) {
    try {
      const res = await piFetch("/api/conversations");
      if (res.ok) {
        const data = (await res.json()) as {
          conversations?: PiConversation[];
        };
        const byConversation = new Map(
          (data.conversations ?? []).map((conv) => [conv.id, conv]),
        );
        for (const thread of threads) {
          if (!thread.conversationId) continue;
          const conv = byConversation.get(thread.conversationId);
          if (conv?.title && conv.title !== thread.title) {
            await registry.update(thread.remoteId, { title: conv.title });
          }
        }
      }
    } catch {
      // titles are best-effort
    }
  }

  threads.sort((a, b) =>
    (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
  );
  return NextResponse.json({
    threads: threads.map((thread) => ({
      remoteId: thread.remoteId,
      status: thread.status,
      title: thread.title,
      lastMessageAt: thread.lastMessageAt,
    })),
  });
}

export async function POST() {
  const id = generateId();
  await registry.create(id);
  return NextResponse.json({ id });
}
