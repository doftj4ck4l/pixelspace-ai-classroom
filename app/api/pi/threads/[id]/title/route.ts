import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { registry } from "@/lib/pi/registry";

type MessageLike = {
  role?: string;
  content?: { type?: string; text?: string }[];
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const thread = await registry.get(user.id, id);
  if (!thread) return new Response(null, { status: 404 });
  if (thread.title) return NextResponse.json({ title: thread.title });

  const body = (await req.json().catch(() => ({}))) as {
    messages?: MessageLike[];
  };
  const firstUser = (body.messages ?? []).find(
    (message) => message.role === "user",
  );
  const text = (firstUser?.content ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join(" ")
    .trim();

  const title = text
    ? text.length > 48
      ? `${text.slice(0, 48)}…`
      : text
    : "New chat";

  await registry.update(user.id, id, { title });
  return NextResponse.json({ title });
}
