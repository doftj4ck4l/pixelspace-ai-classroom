"use client";

import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  useAui,
  useRemoteThreadListRuntime,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { createAssistantStream } from "assistant-stream";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Gemini } from "@/components/assistant-ui/gemini";

type HistoryRow = {
  id: string;
  parentId: string | null;
  format: string;
  content: unknown;
};

type ThreadJson = {
  remoteId: string;
  status: "regular" | "archived";
  title?: string;
  lastMessageAt?: string;
};

function useThreadListAdapters() {
  const aui = useAui();
  const history = useMemo<ThreadHistoryAdapter>(
    () => ({
      async load() {
        return { messages: [] };
      },
      async append() {
        // pi persists the transcript server-side during the chat relay.
      },
      withFormat: (fmt) => ({
        async load() {
          const { remoteId } = aui.threadListItem.getState();
          if (!remoteId) return { messages: [] };
          try {
            const data = (await fetch(`/api/pi/history/${remoteId}`).then((r) =>
              r.json(),
            )) as { messages?: HistoryRow[] };
            return {
              messages: (data.messages ?? []).map((row) =>
                fmt.decode({
                  id: row.id,
                  parent_id: row.parentId,
                  format: row.format,
                  content: row.content as never,
                }),
              ),
            };
          } catch {
            return { messages: [] };
          }
        },
        async append() {
          // pi persists the transcript server-side during the chat relay.
        },
      }),
    }),
    [aui],
  );
  return useMemo(() => ({ history }), [history]);
}

const threadListAdapter: RemoteThreadListAdapter = {
  async list() {
    const data = (await fetch("/api/pi/threads").then((r) => r.json())) as {
      threads?: ThreadJson[];
    };
    return {
      threads: (data.threads ?? []).map((thread) => ({
        remoteId: thread.remoteId,
        status: thread.status,
        title: thread.title,
        lastMessageAt: thread.lastMessageAt
          ? new Date(thread.lastMessageAt)
          : undefined,
      })),
    };
  },
  async initialize() {
    const { id } = (await fetch("/api/pi/threads", { method: "POST" }).then(
      (r) => r.json(),
    )) as { id: string };
    return { remoteId: id };
  },
  async rename(remoteId, title) {
    await fetch(`/api/pi/threads/${remoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  },
  async archive(remoteId) {
    await fetch(`/api/pi/threads/${remoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
  },
  async unarchive(remoteId) {
    await fetch(`/api/pi/threads/${remoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "regular" }),
    });
  },
  async delete(remoteId) {
    await fetch(`/api/pi/threads/${remoteId}`, { method: "DELETE" });
  },
  async fetch(remoteId) {
    const thread = (await fetch(`/api/pi/threads/${remoteId}`).then((r) =>
      r.json(),
    )) as ThreadJson;
    return {
      remoteId: thread.remoteId,
      status: thread.status,
      title: thread.title,
      lastMessageAt: thread.lastMessageAt
        ? new Date(thread.lastMessageAt)
        : undefined,
    };
  },
  async generateTitle(remoteId, messages) {
    return createAssistantStream(async (controller) => {
      try {
        const { title } = (await fetch(`/api/pi/threads/${remoteId}/title`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        }).then((r) => r.json())) as { title?: string };
        controller.appendText(title ?? "New chat");
      } catch {
        controller.appendText("New chat");
      }
    });
  },
  unstable_useAdapters: useThreadListAdapters,
};

export const Assistant = () => {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => {
      const aui = useAui();
      return useChatRuntime({
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport: new AssistantChatTransport({
          api: "/api/chat",
          body: () => ({
            threadId: aui.threadListItem.getState().remoteId,
          }),
        }),
        adapters: {
          attachments: new CompositeAttachmentAdapter([
            new SimpleImageAttachmentAdapter(),
            new SimpleTextAttachmentAdapter(),
          ]),
        },
      });
    },
    adapter: threadListAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-dvh w-full overflow-hidden">
        <Gemini />
      </div>
    </AssistantRuntimeProvider>
  );
};
