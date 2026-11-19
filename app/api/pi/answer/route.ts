import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { piConfigured, piFetch } from "@/lib/pi/client";
import { registry } from "@/lib/pi/registry";

/**
 * Deliver an answer to a pi `ask_user` question so the blocked run continues.
 */
export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as {
    threadId?: string;
    questionId?: string;
    answer?: string;
  };

  if (!body.threadId || !body.questionId || typeof body.answer !== "string") {
    return NextResponse.json(
      { error: "threadId, questionId and answer are required" },
      { status: 400 },
    );
  }

  const thread = await registry.get(user.id, body.threadId);
  if (!thread?.conversationId || !piConfigured()) {
    return NextResponse.json(
      { error: "no pi conversation for this thread" },
      { status: 404 },
    );
  }

  try {
    const res = await piFetch(`/api/chat/${thread.conversationId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: body.questionId,
        answer: body.answer,
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `the harness rejected the answer (${res.status})` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      (await res.json().catch(() => ({ ok: true }))) as Record<string, unknown>,
    );
  } catch {
    return NextResponse.json(
      { error: "could not reach the harness" },
      { status: 502 },
    );
  }
}
