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
 * Talks to the same /api/chat endpoint but passes `artifactEditTargetId`, which
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
  data?: {
    questionId?: string;
    question?: string;
    options?: unknown[];
    kind?: string;
  };
};

type Ask = {
  questionId: string;
  question: string;
  options: string[];
};

export const ArtifactAiPanel: FC<{
  artifactId: string;
  /** Drives the copy and which tool signals a completed edit. */
  kind:
    | "flashcards"
    | "quizzes"
    | "slides"
    | "mindmaps"
    | "notes"
    | "reports"
    | "infographics";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: { text: string; nonce: number } | null;
  focusedIndex?: number | null;
  onDeckUpdated: () => void;
}> = ({
  artifactId,
  kind,
  open,
  onOpenChange,
  prefill,
  focusedIndex,
  onDeckUpdated,
}) => {
  const isQuiz = kind === "quizzes";
  const isMap = kind === "mindmaps";
  const isNotes = kind === "notes";
  // File-backed artifacts are edited by the agent re-sharing the file.
  const isFile =
    kind === "slides" || kind === "reports" || kind === "infographics";
  const isSlides = kind === "slides";
  const itemWord = isSlides
    ? "slide"
    : kind === "reports"
      ? "report"
      : kind === "infographics"
        ? "infographic"
        : isQuiz
          ? "question"
          : isMap
            ? "node"
            : isNotes
              ? "section"
              : "card";
  const setWord =
    kind === "reports"
      ? "report"
      : kind === "infographics"
        ? "infographic"
        : isQuiz
          ? "quiz"
          : isMap
            ? "map"
            : isNotes
              ? "notes"
              : "deck";
  const editTool = isFile ? "share_file" : "render_ui";
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [askSending, setAskSending] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
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

  const answerAsk = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !ask || askSending) return;
    setAskSending(true);
    setAskError(null);
    try {
      const res = await fetch("/api/pi/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactEditTargetId: artifactId,
          questionId: ask.questionId,
          answer: trimmed,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setAsk(null);
    } catch {
      setAskError("Could not send the answer — try again.");
    } finally {
      setAskSending(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setAsk(null);
    setMessages((prev) => [
      ...prev.filter(
        (message) => message.role !== "assistant" || message.text.trim(),
      ),
      { role: "system", text: "Stopped." },
    ]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setAsk(null);
    setAskError(null);
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
          // Only real conversation turns go upstream: system notes like
          // "Deck updated" are panel chrome, not something the model said.
          messages: nextMessages
            .filter(
              (message) => message.role !== "system" && message.text.trim(),
            )
            .map((message) => ({
              id: crypto.randomUUID(),
              role: message.role === "assistant" ? "assistant" : "user",
              parts: [{ type: "text", text: message.text }],
            })),
          artifactEditTargetId: artifactId,
          ...(typeof focusedIndex === "number" ? { focusedIndex } : {}),
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
            event.type === "data-ask-user" &&
            typeof event.data?.questionId === "string"
          ) {
            setAsk({
              questionId: event.data.questionId,
              question: String(event.data.question ?? ""),
              options: Array.isArray(event.data.options)
                ? event.data.options.map(String)
                : [],
            });
          } else if (
            event.type === "tool-input-available" &&
            event.toolName === editTool &&
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

      setAsk(null);
      if (deckUpdated) {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            text: `${isQuiz ? "Quiz" : isSlides ? "Slides" : isMap ? "Map" : isNotes ? "Notes" : kind === "reports" ? "Report" : kind === "infographics" ? "Infographic" : "Deck"} updated — changes saved.`,
          },
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
                text: `The agent did not update the ${setWord}. Try rephrasing your request.`,
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
      // Drop placeholder assistant bubbles that never received text (the run
      // answered with an ask prompt, a tool call, or nothing at all).
      setMessages((prev) =>
        prev.filter(
          (message) => message.role !== "assistant" || message.text.trim(),
        ),
      );
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
            {isNotes ? (
              <>
                Ask for changes to <strong>these notes</strong> — e.g.
                &ldquo;add a section about condensation&rdquo;, &ldquo;expand
                section 3&rdquo;, &ldquo;turn section 2 into a checklist&rdquo;.
                Ask about a section in its panel instead — that never edits the
                notes.
              </>
            ) : kind === "reports" ? (
              <>
                Ask for changes to <strong>this report</strong> — the agent
                edits the actual file and re-shares it. e.g. &ldquo;shorten the
                executive summary&rdquo;, &ldquo;add a chart of the monthly
                trend&rdquo;, &ldquo;translate it to English&rdquo;.
              </>
            ) : kind === "infographics" ? (
              <>
                Ask for changes to <strong>this infographic</strong> — the agent
                regenerates the image and re-shares it. e.g. &ldquo;warmer
                colours&rdquo;, &ldquo;add a section about condensation&rdquo;.
              </>
            ) : isMap ? (
              <>
                Ask for changes to <strong>this map</strong> — e.g. &ldquo;add a
                branch about asteroid&rdquo;, &ldquo;make the Marikh node
                simpler&rdquo;, &ldquo;add challenges to the weakest
                nodes&rdquo;. Ask about a node in its panel instead — that never
                edits the map.
              </>
            ) : isSlides ? (
              <>
                Ask for changes to <strong>this deck</strong> — the agent edits
                the actual PowerPoint file and re-shares it. e.g. &ldquo;add a
                slide about condensation&rdquo;, &ldquo;change the title of
                slide 2&rdquo;, &ldquo;translate every slide to English&rdquo;.
              </>
            ) : isQuiz ? (
              <>
                Ask for changes to the <strong>question on screen</strong>{" "}
                (&ldquo;change this question to open-ended&rdquo;, &ldquo;make
                it clearer&rdquo;) or the whole quiz (&ldquo;add 5 more
                questions&rdquo;, &ldquo;translate everything to
                English&rdquo;). New quizzes are made in the main chat.
              </>
            ) : (
              <>
                Ask for changes to the <strong>card on screen</strong>{" "}
                (&ldquo;change this card&hellip;&rdquo;, &ldquo;make it
                simpler&rdquo;) or the whole deck (&ldquo;add 2 cards about
                condensation&rdquo;, &ldquo;translate every back to
                English&rdquo;). New decks are made in the main chat.
              </>
            )}
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
          ) : message.text ? (
            <p
              key={index}
              className="mr-8 text-sm leading-relaxed whitespace-pre-wrap"
            >
              {message.text}
            </p>
          ) : busy && index === messages.length - 1 ? (
            <p
              key={index}
              className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
            >
              <Loader2Icon className="size-3.5 animate-spin" />
              {ask ? "Waiting for your answer..." : "Thinking..."}
            </p>
          ) : null,
        )}

        {ask && (
          <div className="border-border/60 bg-muted/40 rounded-xl border p-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {ask.question}
            </p>
            {ask.options.length > 0 && (
              <div className="mt-2.5 grid gap-1.5">
                {ask.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={askSending}
                    onClick={() => void answerAsk(option)}
                    className="border-border/60 bg-background hover:bg-muted rounded-lg border px-3 py-1.5 text-left text-xs transition-colors disabled:opacity-50"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2.5 flex items-center gap-2">
              <input
                placeholder="Or type your answer..."
                disabled={askSending}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void answerAsk(event.currentTarget.value);
                  }
                }}
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-8 min-w-0 flex-1 rounded-lg border px-2.5 text-xs outline-none focus-visible:ring-2"
              />
              {askSending && (
                <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
              )}
            </div>
            {askError && (
              <p className="text-destructive mt-1.5 text-xs">{askError}</p>
            )}
          </div>
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
            placeholder={`Ask to change this ${itemWord} or the ${setWord}...`}
            className="max-h-28 min-h-6 flex-1 resize-none bg-transparent text-sm outline-none"
          />
          {busy ? (
            <button
              type="button"
              aria-label="Berhenti"
              onClick={stop}
              className="bg-muted text-muted-foreground hover:bg-muted/70 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
            >
              <Loader2Icon className="size-4 animate-spin" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Hantar"
              disabled={!input.trim()}
              onClick={() => void send()}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                !input.trim()
                  ? "bg-muted text-muted-foreground"
                  : "bg-foreground text-background hover:opacity-90",
              )}
            >
              <SendIcon className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
