"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { CloneThreadShell } from "@/components/assistant-ui/clone-thread-shell";
import { chatSpace } from "@/lib/chat-space";
import { LanguageProvider } from "@/lib/i18n";

/** Keeps the URL on the active thread: bare /chat becomes /chat/<remoteId>. */
const ThreadUrlSync = () => {
  const router = useRouter();
  useEffect(() => {
    const onId = (id: string) => {
      if (window.location.pathname === "/chat") {
        router.replace(`/chat/${id}`);
      }
    };
    threadIdListeners.add(onId);
    return () => {
      threadIdListeners.delete(onId);
    };
  }, [router]);
  return null;
};

type HistoryRow = {
  id: string;
  parentId: string | null;
  format: string;
  content: unknown;
};

type ThreadJson = {
  remoteId: string;
  status: "regular" | "archived";
  runStatus?: string;
  title?: string;
  lastMessageAt?: string;
  createdAt?: string;
};

/** Server run state rides on the thread's `custom` metadata. */
const customFor = (thread: ThreadJson) => ({
  runStatus: thread.runStatus ?? "idle",
});

const threadMeta = (thread: ThreadJson) => ({
  remoteId: thread.remoteId,
  status: thread.status,
  title: thread.title,
  custom: customFor(thread),
  // Threads without activity (e.g. migrated ones) group by creation date
  // instead of defaulting into "Today".
  lastMessageAt: thread.lastMessageAt
    ? new Date(thread.lastMessageAt)
    : thread.createdAt
      ? new Date(thread.createdAt)
      : undefined,
});

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

/* New threads get their remote id only when initialized (first send). */
const threadIdListeners = new Set<(id: string) => void>();
const emitThreadId = (id: string) => {
  for (const listener of threadIdListeners) listener(id);
};

/**
 * Polls the stored run status so a detached run's settle still lands in the
 * sidebar (and in the open thread's transcript) — the client can disconnect
 * from a run without the run stopping, so the UI has to re-sync from the
 * server rather than trust only its own streams.
 */
const RunStatusSync = () => {
  const aui = useAui();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let previous = new Map<string, string>();

    const poll = async () => {
      let next = previous;
      let anyRunning = false;
      try {
        const data = (await fetch("/api/pi/threads?light=1").then((r) =>
          r.json(),
        )) as { threads?: { remoteId: string; runStatus?: string }[] };
        if (disposed) return;
        next = new Map(
          (data.threads ?? []).map((t) => [t.remoteId, t.runStatus ?? "idle"]),
        );
        anyRunning = [...next.values()].some((status) => status === "running");
        const changed =
          next.size !== previous.size ||
          [...next].some(([id, status]) => previous.get(id) !== status);
        const openId = pathnameRef.current.startsWith("/chat/")
          ? decodeURIComponent(pathnameRef.current.split("/")[2] ?? "")
          : undefined;
        const openSettled =
          openId !== undefined &&
          previous.get(openId) === "running" &&
          next.get(openId) !== "running";
        if (changed) void aui.threads.reload();
        if (openSettled && !aui.thread.getState().isRunning) {
          void aui.threads.reloadMainThread();
        }
      } catch {
        // transient — try again sooner than the idle cadence
        if (!disposed) timer = setTimeout(poll, 15000);
        previous = next;
        return;
      }
      previous = next;
      timer = setTimeout(poll, anyRunning ? 5000 : 30000);
    };

    timer = setTimeout(poll, 1200);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [aui]);

  return null;
};

const threadListAdapter: RemoteThreadListAdapter = {
  async list() {
    const data = (await fetch("/api/pi/threads").then((r) => r.json())) as {
      threads?: ThreadJson[];
    };
    return {
      threads: (data.threads ?? []).map(threadMeta),
    };
  },
  async initialize() {
    const { id } = (await fetch("/api/pi/threads", { method: "POST" }).then(
      (r) => r.json(),
    )) as { id: string };
    emitThreadId(id);
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
    return threadMeta(thread);
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

/**
 * The authenticated app: one runtime and one shell around every route, so
 * navigating between pages never remounts the conversation. The URL is the
 * source of truth — /chat/<threadId> drives which thread the runtime shows,
 * and thread switches write the URL back.
 */
export const AppShell = ({
  children,
  role,
}: {
  children: ReactNode;
  role?: string;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const threadId = pathname.startsWith("/chat/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : undefined;

  const runtime = useRemoteThreadListRuntime({
    threadId,
    runtimeHook: () =>
      useChatRuntime({
        // No sendAutomaticallyWhen: every tool executes server-side inside the
        // pi harness, so the client must never auto-continue a run.
        transport: new AssistantChatTransport({
          api: "/api/chat",
          // A chat opened from a space carries the space id, so the relay
          // can ground every turn in that space's sources.
          body: () => (chatSpace.id ? { spaceId: chatSpace.id } : {}),
        }),
        // A message sent while the thread is running waits in composer.queue
        // and dispatches when the run settles, like pixelspacev3's follow-ups.
        unstable_enableMessageQueue: true,
        adapters: {
          attachments: new CompositeAttachmentAdapter([
            new SimpleImageAttachmentAdapter(),
            new SimpleTextAttachmentAdapter(),
          ]),
        },
        onThreadIdChange: (id) => {
          const target = id ? `/chat/${id}` : "/chat";
          const current = pathnameRef.current;
          if (current === target) return;
          // Clicking a session from any page opens it: replace in place on
          // /chat, push from everywhere else so Back returns to that page.
          if (current.startsWith("/chat")) router.replace(target);
          else router.push(target);
        },
      }),
    adapter: threadListAdapter,
  });

  // The provider must not remount between routes; a stable shell keeps the
  // conversation mounted while the URL changes.
  useEffect(() => {
    // no-op: kept to make the intent explicit next to the URL wiring
  }, [threadId]);

  return (
    <LanguageProvider>
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="h-dvh w-full overflow-hidden">
          <ThreadUrlSync />
          <RunStatusSync />
          <CloneThreadShell role={role}>{children}</CloneThreadShell>
        </div>
      </AssistantRuntimeProvider>
    </LanguageProvider>
  );
};
