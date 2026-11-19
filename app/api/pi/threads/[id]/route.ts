import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { piConfigured, piFetch } from "@/lib/pi/client";
import { registry } from "@/lib/pi/registry";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const thread = await registry.get(user.id, id);
  if (!thread) return new Response(null, { status: 404 });
  return NextResponse.json(thread);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const patch = (await req.json().catch(() => ({}))) as {
    title?: string;
    status?: "regular" | "archived";
  };
  const existing = await registry.get(user.id, id);
  if (!existing) return new Response(null, { status: 404 });

  await registry.update(user.id, id, {
    ...(typeof patch.title === "string" ? { title: patch.title } : {}),
    ...(patch.status ? { status: patch.status } : {}),
  });

  if (
    piConfigured() &&
    existing.conversationId &&
    typeof patch.title === "string"
  ) {
    await piFetch(`/api/conversations/${existing.conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: patch.title }),
    }).catch(() => {});
  }

  return new Response(null, { status: 204 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const thread = await registry.get(user.id, id);
  if (!thread) return new Response(null, { status: 404 });

  if (thread.conversationId && piConfigured()) {
    await piFetch(`/api/conversations/${thread.conversationId}`, {
      method: "DELETE",
    }).catch(() => {});
  }
  await registry.remove(user.id, id);
  return new Response(null, { status: 204 });
}
