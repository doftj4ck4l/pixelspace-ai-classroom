import { Suspense } from "react";
import { ChatSpaceSync } from "@/components/assistant-ui/chat-space-sync";
import { ThreadView } from "@/components/assistant-ui/gemini";

export default function ChatPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ChatSpaceSync />
      </Suspense>
      <ThreadView />
    </>
  );
}
