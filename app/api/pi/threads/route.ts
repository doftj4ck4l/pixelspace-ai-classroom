import { NextResponse } from "next/server";
import { generateId } from "ai";
import { requireApiUser } from "@/lib/auth-session";
import { piConfigured, piFetch } from "@/lib/pi/client";
import { registry } from "@/lib/pi/registry";

type PiConversation = { id: string; title?: string; updatedAt?: number };

export async function GET(req: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  // Polling (run-status sync) only needs the stored rows; skip the harness
  // title reconciliation so a 5-second poll stays one cheap query.
  const light = new URL(req.url).searchParams.get("light") === "1";

  const threads = await registry.list(user.id);

  if (!light && piConfigured()) {
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
            await registry.update(user.id, thread.remoteId, {
              title: conv.title,
            });
            thread.title = conv.title;
          }
        }
      }
    } catch {
      // titles are best-effort
    }
  }

  return NextResponse.json({
    threads: threads.map((thread) => ({
      remoteId: thread.remoteId,
      status: thread.status,
      runStatus: thread.runStatus ?? "idle",
      title: thread.title,
      lastMessageAt: thread.lastMessageAt,
      createdAt: thread.createdAt,
    })),
  });
}

export async function POST() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const id = generateId();
  await registry.create(user.id, id);
  return NextResponse.json({ id });
}
