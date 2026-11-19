import { ThreadView } from "@/components/assistant-ui/gemini";

/** The URL carries the thread id; the runtime switches to it. */
export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  await params;
  return <ThreadView />;
}
