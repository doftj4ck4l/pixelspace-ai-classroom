import { NextResponse } from "next/server";
import { generateId } from "ai";
import { registry } from "@/lib/pi/registry";

export async function GET() {
  const threads = await registry.list();
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
