"use client";

import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  CircleCheckIcon,
  CircleIcon,
  ListIcon,
  Loader2Icon,
  RotateCcwIcon,
  SendIcon,
  SparklesIcon,
  SquareCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { accentTheme } from "@/components/assistant-ui/flashcard-deck";
import { type NotesSection, type NotesSpec } from "@/lib/notes/spec";

export type { NotesSection, NotesSpec } from "@/lib/notes/spec";

/**
 * Structured study notes: sticky table of contents, markdown bodies, bullet
 * lists, persisted checklists, per-section "ask the AI" (session-only) and the
 * full AI-edit parity of the other modules.
 */

type DoneState = Record<string, number[]>;

const Markdown: FC<{ children: string; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "[&_code]:bg-muted text-sm leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mt-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-2 [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_strong]:font-semibold [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5",
      className,
    )}
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);

export const NotesViewer: FC<{
  spec: NotesSpec;
  variant?: "inline" | "full";
  /** When given, checklist ticks persist per account. */
  notesId?: string;
  onClose?: () => void;
  onSectionChange?: (index: number) => void;
  onImproveSection?: (index: number, section: NotesSection) => void;
  initialIndex?: number;
}> = ({
  spec,
  variant = "inline",
  notesId,
  onClose,
  onSectionChange,
  onImproveSection,
  initialIndex,
}) => {
  const full = variant === "full";
  const theme = accentTheme(spec.accent);
  const total = spec.sections.length;

  const [done, setDone] = useState<DoneState>({});
  const [focused, setFocused] = useState(() =>
    typeof initialIndex === "number"
      ? (spec.sections[initialIndex]?.id ?? null)
      : null,
  );

  /* ------------------------------------------------------ checklist state */

  const persist = useCallback(
    (next: DoneState) => {
      if (!notesId) return;
      void fetch(`/api/notes/${notesId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      }).catch(() => {});
    },
    [notesId],
  );

  useEffect(() => {
    if (!notesId) return;
    let cancelled = false;
    fetch(`/api/notes/${notesId}/progress`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { done?: DoneState } | null) => {
        if (!cancelled && data?.done) setDone(data.done);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [notesId]);

  const toggleItem = (sectionId: string, index: number) => {
    setDone((prev) => {
      const checked = new Set(prev[sectionId] ?? []);
      if (checked.has(index)) checked.delete(index);
      else checked.add(index);
      const next = { ...prev, [sectionId]: [...checked].sort((a, b) => a - b) };
      persist(next);
      return next;
    });
  };

  const focusedIndex = focused
    ? spec.sections.findIndex((section) => section.id === focused)
    : -1;

  useEffect(() => {
    if (full && focusedIndex >= 0) onSectionChange?.(focusedIndex);
  }, [full, focusedIndex, onSectionChange]);

  const totalItems = useMemo(
    () =>
      spec.sections.reduce(
        (sum, section) => sum + (section.checklist?.length ?? 0),
        0,
      ),
    [spec.sections],
  );
  const doneItems = useMemo(
    () =>
      Object.values(done).reduce(
        (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
        0,
      ),
    [done],
  );
  const progress =
    totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  if (total === 0) {
    return (
      <div className="text-muted-foreground border-border/60 my-4 rounded-xl border border-dashed p-4 text-sm">
        These notes have no sections.
      </div>
    );
  }

  /* ---------------------------------------------------------------- inline */

  if (!full) {
    return (
      <div className="border-border/60 bg-card my-4 w-full max-w-xl overflow-hidden rounded-2xl border">
        <div className={cn("bg-gradient-to-r px-4 py-3", theme.header)}>
          <div className="flex items-center gap-2">
            <SquareCheckIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {spec.title ?? "Nota"}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                theme.chip,
              )}
            >
              {total} seksyen
            </span>
          </div>
          {spec.subject ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {spec.subject}
            </p>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto px-4 py-3">
          <div className="grid gap-4">
            {spec.sections.slice(0, 6).map((section) => (
              <div key={section.id}>
                <p className="text-sm font-semibold">{section.heading}</p>
                {section.body ? (
                  <Markdown className="text-muted-foreground mt-1">
                    {section.body}
                  </Markdown>
                ) : null}
                {section.bullets?.length ? (
                  <ul className="text-muted-foreground mt-1 list-disc pl-5 text-sm">
                    {section.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.checklist?.length ? (
                  <div className="mt-1.5 grid gap-1">
                    {section.checklist.map((item, index) => {
                      const checked = (done[section.id] ?? []).includes(index);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleItem(section.id, index)}
                          className="flex items-start gap-2 text-left text-sm"
                        >
                          {checked ? (
                            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                          ) : (
                            <CircleIcon className="text-muted-foreground/60 mt-0.5 size-4 shrink-0" />
                          )}
                          <span
                            className={cn(
                              checked && "text-muted-foreground line-through",
                            )}
                          >
                            {item.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
            {total > 6 && (
              <p className="text-muted-foreground text-xs">
                +{total - 6} seksyen lagi — buka di Spaces untuk baca penuh.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ full */

  return (
    <div className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <header className="border-border/60 shrink-0 border-b px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start gap-3">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              onClick={onClose}
              aria-label="Kembali ke nota"
            >
              <ArrowLeftIcon className="size-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl leading-snug font-semibold tracking-tight sm:text-2xl">
              {spec.title ?? "Nota"}
            </h1>
            {spec.subject && (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                {spec.subject}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2">
          <span className="border-border/60 inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium">
            <ListIcon className="text-muted-foreground size-3.5" />
            {total} seksyen
          </span>
          {totalItems > 0 && (
            <span
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium",
                theme.chip,
              )}
            >
              <CircleCheckIcon className="size-3.5" />
              {doneItems}/{totalItems} selesai
            </span>
          )}
          {totalItems > 0 && (
            <>
              <div className="bg-muted/70 mx-1 hidden h-1 min-w-24 flex-1 overflow-hidden rounded-full sm:block">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    theme.bar,
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-muted-foreground text-xs tabular-nums">
                {progress}%
              </span>
            </>
          )}
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-4 grid gap-1">
            <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
              <BookOpenIcon className="size-3.5" />
              Kandungan
            </p>
            {spec.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setFocused(section.id);
                  document
                    .getElementById(`notes-${section.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={cn(
                  "truncate rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                  focused === section.id
                    ? cn("font-medium", theme.pill)
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {section.heading}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-5 pb-24">
            {spec.sections.map((section, index) => (
              <section
                key={section.id}
                id={`notes-${section.id}`}
                onMouseEnter={() => setFocused(section.id)}
                className={cn(
                  "border-border/60 bg-card scroll-mt-4 rounded-2xl border p-4 sm:p-5",
                  focused === section.id && "ring-ring/20 ring-2",
                )}
              >
                <div className="flex items-start gap-2">
                  <h2 className="min-w-0 flex-1 text-base font-semibold">
                    {section.heading}
                  </h2>
                  <div className="flex shrink-0 items-center gap-1">
                    {onImproveSection && (
                      <button
                        type="button"
                        onClick={() => onImproveSection(index, section)}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-lg transition-colors"
                        aria-label={`Improve section ${index + 1} with AI`}
                        title="Improve with AI"
                      >
                        <SparklesIcon className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {section.body ? (
                  <Markdown className="mt-2">{section.body}</Markdown>
                ) : null}

                {section.bullets?.length ? (
                  <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed">
                    {section.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex} className="my-0.5">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {section.checklist?.length ? (
                  <div className="mt-3 grid gap-1.5">
                    {section.checklist.map((item, itemIndex) => {
                      const checked = (done[section.id] ?? []).includes(
                        itemIndex,
                      );
                      return (
                        <button
                          key={itemIndex}
                          type="button"
                          onClick={() => toggleItem(section.id, itemIndex)}
                          className="hover:bg-muted/50 flex items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
                        >
                          {checked ? (
                            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                          ) : (
                            <CircleIcon className="text-muted-foreground/60 mt-0.5 size-4 shrink-0" />
                          )}
                          <span
                            className={cn(
                              checked && "text-muted-foreground line-through",
                            )}
                          >
                            {item.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {notesId && (
                  <SectionAsk
                    key={`${section.id}-ask`}
                    notesId={notesId}
                    sectionId={section.id}
                  />
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------- section ask (AI) */

type AskMessage = { role: "user" | "assistant"; text: string };

const SectionAsk: FC<{ notesId: string; sectionId: string }> = ({
  notesId,
  sectionId,
}) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "assistant", text: "" },
    ]);
    const append = (delta: string) =>
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        return [...prev.slice(0, -1), { ...last, text: last.text + delta }];
      });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              parts: [{ type: "text", text }],
            },
          ],
          artifactAskTargetId: notesId,
          artifactAskNodeId: sectionId,
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
          try {
            const event = JSON.parse(line.slice(6)) as {
              type?: string;
              delta?: string;
            };
            if (
              event.type === "text-delta" &&
              typeof event.delta === "string"
            ) {
              append(event.delta);
            }
          } catch {
            // skip malformed frames
          }
        }
      }
      setMessages((prev) =>
        prev.filter(
          (message) => message.role !== "assistant" || message.text.trim(),
        ),
      );
    } catch {
      setMessages((prev) => [
        ...prev.filter(
          (message) => message.role !== "assistant" || message.text.trim(),
        ),
        { role: "assistant", text: "Maaf, ada masalah. Cuba lagi." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground mt-3 flex items-center gap-1.5 text-xs transition-colors"
      >
        <SendIcon className="size-3.5" />
        Tanya AI tentang seksyen ini
      </button>
    );
  }

  return (
    <div className="border-border/60 mt-3 grid gap-2 rounded-xl border p-3">
      {messages.map((message, index) => (
        <p
          key={index}
          className={cn(
            "text-sm leading-relaxed",
            message.role === "user"
              ? "bg-foreground text-background ml-6 self-end rounded-2xl rounded-br-md px-3 py-2"
              : "whitespace-pre-wrap",
          )}
        >
          {message.text || (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
              <Loader2Icon className="size-3.5 animate-spin" />
              Sedang berfikir...
            </span>
          )}
        </p>
      ))}
      <div className="border-border/60 focus-within:ring-ring/40 flex items-center gap-2 rounded-xl border px-3 py-1.5 focus-within:ring-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="Contoh: boleh terangkan lebih ringkas?"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          aria-label="Hantar"
          disabled={busy || !input.trim()}
          onClick={() => void send()}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
            busy || !input.trim()
              ? "bg-muted text-muted-foreground"
              : "bg-foreground text-background hover:opacity-90",
          )}
        >
          {busy ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <SendIcon className="size-3.5" />
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-xs transition-colors"
      >
        <RotateCcwIcon className="size-3" />
        Tutup
      </button>
    </div>
  );
};
