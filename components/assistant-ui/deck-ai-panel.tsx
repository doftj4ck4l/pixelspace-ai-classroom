"use client";

import { useEffect, useRef, useState, type FC } from "react";
import {
  CheckIcon,
  Loader2Icon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating "Edit with AI" panel for the deck page.
 *
 * Talks to the same /api/chat endpoint but passes `deckEditTargetId`, which
 * scopes the turn to THIS deck (the server injects the deck spec and replaces
 * the artifact instead of creating a new one). The conversation lives in a
 * persistent per-deck thread, so history shows up in the sidebar.
 */

type PanelMessage = {
  role: "user" | "assistant" | "system";
  text: string;
};

type StreamEvent = {
  type?: string;
  delta?: string;
  toolName?: string;
  toolCallId?: string;
  errorText?: string;
};

export const DeckAiPanel: FC<{
  artifactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: { text: string; nonce: number } | null;
  focusedCardIndex?: number | null;
  onDeckUpdated: () => void;
}> = ({
  artifactId,
  open,
  onOpenChange,
  prefill,
  focusedCardIndex,
  onDeckUpdated,
}) => {
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (prefill?.text) {
      setInput(prefill.text);
      onOpenChange(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.nonce]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    const nextMessages: PanelMessage[] = [...messages, { role: "user", text }];
    setMessages([...nextMessages, { role: "assistant", text: "" }]);

    const abort = new AbortController();
    abortRef.current = abort;
    let deckUpdated = false;
    const pendingRenderUi = new Set<string>();

    const appendAssistant = (delta: string) =>
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        return [...prev.slice(0, -1), { ...last, text: last.text + delta }];
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            id: crypto.randomUUID(),
            role: message.role === "assistant" ? "assistant" : "user",
            parts: [{ type: "text", text: message.text }],
          })),
          deckEditTargetId: artifactId,
          ...(typeof focusedCardIndex === "number" ? { focusedCardIndex } : {}),
        }),
      });
      if (!res.ok || !res.body) throw new Error("request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line.slice(6)) as StreamEvent;
          } catch {
            continue;
          }
          if (event.type === "text-delta" && typeof event.delta === "string") {
            appendAssistant(event.delta);
          } else if (
            event.type === "tool-input-available" &&
            event.toolName === "render_ui" &&
            event.toolCallId
          ) {
            pendingRenderUi.add(event.toolCallId);
          } else if (
            event.type === "tool-output-available" &&
            event.toolCallId &&
            pendingRenderUi.has(event.toolCallId)
          ) {
            pendingRenderUi.delete(event.toolCallId);
            deckUpdated = true;
          } else if (event.type === "tool-output-error" && event.toolCallId) {
            pendingRenderUi.delete(event.toolCallId);
          }
        }
      }

      if (deckUpdated) {
        setMessages((prev) => [
          ...prev,
          { role: "system", text: "Deck updated — changes saved." },
        ]);
        onDeckUpdated();
      } else {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.text.trim()) {
            return [
              ...prev.slice(0, -1),
              {
                role: "system",
                text: "The agent did not update the deck. Try rephrasing your request.",
              },
            ];
          }
          return prev;
        });
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "system", text: "Something went wrong. Try again." },
        ]);
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="bg-foreground text-background fixed right-4 bottom-4 z-40 flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-lg transition-transform hover:scale-[1.03] sm:right-6 sm:bottom-6"
      >
        <SparklesIcon className="size-4" />
        Edit with AI
      </button>
    );
  }

  return (
    <div className="border-border/60 bg-background fixed right-3 bottom-3 z-40 flex max-h-[70vh] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:right-6 sm:bottom-6 sm:w-96">
      <div className="border-border/60 flex items-center gap-2 border-b px-3 py-2.5">
        <SparklesIcon className="size-4 text-teal-600 dark:text-teal-300" />
        <span className="flex-1 text-sm font-semibold">Edit with AI</span>
        <button
          type="button"
          aria-label="Tutup panel"
          onClick={() => onOpenChange(false)}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-lg transition-colors"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-24 flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground text-xs leading-relaxed">
            Ask for changes to <strong>this deck</strong> — e.g. &ldquo;make
            card 3 simpler&rdquo;, &ldquo;add 2 cards about condensation&rdquo;,
            or &ldquo;translate every back to English&rdquo;. New decks are made
            in the main chat.
          </p>
        )}
        {messages.map((message, index) =>
          message.role === "system" ? (
            <p
              key={index}
              className="text-muted-foreground flex items-center gap-1.5 text-xs"
            >
              <CheckIcon className="size-3.5 text-emerald-500" />
              {message.text}
            </p>
          ) : message.role === "user" ? (
            <div
              key={index}
              className="bg-foreground text-background ml-8 rounded-2xl rounded-br-md px-3 py-2 text-sm"
            >
              {message.text}
            </div>
          ) : (
            <p
              key={index}
              className="mr-8 text-sm leading-relaxed whitespace-pre-wrap"
            >
              {message.text || (
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Thinking...
                </span>
              )}
            </p>
          ),
        )}
      </div>

      <div className="border-border/60 border-t p-2.5">
        <div className="border-border/60 focus-within:ring-ring/40 flex items-end gap-2 rounded-xl border px-3 py-2 focus-within:ring-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Ask to change this deck..."
            className="max-h-28 min-h-6 flex-1 resize-none bg-transparent text-sm outline-none"
          />
          <button
            type="button"
            aria-label="Hantar"
            disabled={busy || !input.trim()}
            onClick={() => void send()}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              busy || !input.trim()
                ? "bg-muted text-muted-foreground"
                : "bg-foreground text-background hover:opacity-90",
            )}
          >
            {busy ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
