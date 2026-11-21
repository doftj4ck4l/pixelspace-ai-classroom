import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { artifactRegistry } from "@/lib/pi/artifacts";
import { piConfigured, piFetch } from "@/lib/pi/client";
import { registry } from "@/lib/pi/registry";
import { threadRuns } from "@/lib/pi/runs";

/**
 * Stop the run in flight for a thread.
 *
 * Two things, because neither stops the run alone: tell the harness to cancel
 * the pi loop (aborting the streaming fetch only stops this browser reading),
 * and abort this process's relay so it stops draining. Best-effort — a run
 * that already finished returns `stopped: false`, which is not an error here.
 */
export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as {
    threadId?: string;
    artifactEditTargetId?: string;
  };

  // Panel stops address an artifact; resolve its thread the same way the
  // chat relay does (the thread the deck was created in, else a dedicated one).
  let threadId = body.threadId;
  if (!threadId && body.artifactEditTargetId) {
    const artifact = await artifactRegistry.get(
      user.id,
      body.artifactEditTargetId,
    );
    if (artifact?.threadId) {
      const original = await registry.get(user.id, artifact.threadId);
      threadId = original ? artifact.threadId : undefined;
    }
    threadId = threadId ?? `deck-edit-${body.artifactEditTargetId}`;
  }

  if (!threadId) {
    return NextResponse.json(
      { error: "threadId or artifactEditTargetId is required" },
      { status: 400 },
    );
  }

  const thread = await registry.get(user.id, threadId);
  if (!thread) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const run = threadRuns.get(threadId);
  const conversationId = thread.conversationId ?? run?.conversationId;

  let stopped = false;
  if (conversationId && piConfigured()) {
    try {
      const res = await piFetch(`/api/chat/${conversationId}/stop`, {
        method: "POST",
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          stopped?: boolean;
        };
        stopped = data.stopped === true;
      }
    } catch {
      // best-effort: the local abort below still stops this process's relay
    }
  }

  if (threadRuns.abort(threadId)) stopped = true;
  if (stopped) {
    await registry.update(user.id, threadId, { runStatus: "stopped" });
  }

  return NextResponse.json({ ok: true, stopped });
}
