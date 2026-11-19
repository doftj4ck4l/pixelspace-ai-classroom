"use client";

import { useEffect, useMemo, useState, type FC, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutGridIcon,
  LightbulbIcon,
  MaximizeIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  ShuffleIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The rich flashcard deck: rendered from a `render_ui` flashcards spec.
 *
 * `inline` keeps it compact inside a chat message (flip, nav, shuffle, hint).
 * `full` is the Spaces study experience: 3D flip, grid overview, present mode,
 * Faham/Ulang review rounds, session summary, and read-aloud through the
 * browser's built-in speech synthesis (no TTS service attached).
 */

export type FlashcardItem = {
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  type?: "term" | "question" | "cloze" | "formula";
};

export type FlashcardSpec = {
  title?: string;
  subject?: string;
  language?: string;
  accent?: string;
  cards: FlashcardItem[];
};

type AccentTheme = {
  header: string;
  bar: string;
  chip: string;
  badge: string;
  cardRing: string;
  glow: string;
};

const ACCENTS: Record<string, AccentTheme> = {
  teal: {
    header: "from-teal-500/15 via-teal-500/5 to-transparent",
    bar: "bg-teal-500",
    chip: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
    badge: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    cardRing: "ring-teal-500/20",
    glow: "bg-teal-400/20 dark:bg-teal-500/10",
  },
  blue: {
    header: "from-blue-500/15 via-blue-500/5 to-transparent",
    bar: "bg-blue-500",
    chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    cardRing: "ring-blue-500/20",
    glow: "bg-blue-400/20 dark:bg-blue-500/10",
  },
  amber: {
    header: "from-amber-500/15 via-amber-500/5 to-transparent",
    bar: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    cardRing: "ring-amber-500/20",
    glow: "bg-amber-400/20 dark:bg-amber-500/10",
  },
  violet: {
    header: "from-violet-500/15 via-violet-500/5 to-transparent",
    bar: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    cardRing: "ring-violet-500/20",
    glow: "bg-violet-400/20 dark:bg-violet-500/10",
  },
  rose: {
    header: "from-rose-500/15 via-rose-500/5 to-transparent",
    bar: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    cardRing: "ring-rose-500/20",
    glow: "bg-rose-400/20 dark:bg-rose-500/10",
  },
  emerald: {
    header: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    bar: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    cardRing: "ring-emerald-500/20",
    glow: "bg-emerald-400/20 dark:bg-emerald-500/10",
  },
};

const TYPE_LABEL: Record<NonNullable<FlashcardItem["type"]>, string> = {
  term: "Istilah",
  question: "Soalan",
  cloze: "Isi tempat kosong",
  formula: "Formula",
};

type Mark = "known" | "again";

const shuffleIndices = (length: number) => {
  const indices = Array.from({ length }, (_, index) => index);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
};

export const FlashcardDeck: FC<{
  spec: FlashcardSpec;
  variant?: "inline" | "full";
  onClose?: () => void;
}> = ({ spec, variant = "inline", onClose }) => {
  const full = variant === "full";
  const theme = ACCENTS[spec.accent ?? "teal"] ?? ACCENTS.teal;
  const total = spec.cards.length;

  const [order, setOrder] = useState<number[]>(() =>
    spec.cards.map((_, index) => index),
  );
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [phase, setPhase] = useState<"studying" | "done">("studying");
  const [reviewRound, setReviewRound] = useState(false);
  const [view, setView] = useState<"study" | "grid">("study");
  const [presenting, setPresenting] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const cardIndex = order[position];
  const card = spec.cards[cardIndex];

  const knownCount = useMemo(
    () => Object.values(marks).filter((mark) => mark === "known").length,
    [marks],
  );
  const againCount = useMemo(
    () => Object.values(marks).filter((mark) => mark === "again").length,
    [marks],
  );

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  const toggleSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      stopSpeaking();
      return;
    }
    if (!card) return;
    const text = flipped ? card.back : card.front;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const go = (delta: number) => {
    stopSpeaking();
    setFlipped(false);
    setHintOpen(false);
    setPosition((current) =>
      Math.min(Math.max(current + delta, 0), order.length - 1),
    );
  };

  const flip = () => {
    stopSpeaking();
    setFlipped((f) => !f);
    setHintOpen(false);
  };

  const finishRound = () => {
    stopSpeaking();
    setPhase("done");
  };

  const advance = () => {
    if (position < order.length - 1) go(1);
    else finishRound();
  };

  const mark = (value: Mark) => {
    setMarks((prev) => ({ ...prev, [cardIndex]: value }));
    advance();
  };

  const restart = (indices?: number[]) => {
    stopSpeaking();
    const next = indices ?? spec.cards.map((_, index) => index);
    setOrder(next);
    setPosition(0);
    setFlipped(false);
    setHintOpen(false);
    setPhase("studying");
    setReviewRound(indices !== undefined);
    setMarks((prev) => {
      if (indices === undefined) return {};
      const kept = { ...prev };
      for (const index of indices) delete kept[index];
      return kept;
    });
    setView("study");
  };

  const reviewAgain = () => {
    const againIndices = Object.entries(marks)
      .filter(([, value]) => value === "again")
      .map(([index]) => Number(index));
    restart(againIndices.length > 0 ? againIndices : undefined);
  };

  const toggleShuffle = () => {
    stopSpeaking();
    setShuffled((previous) => {
      const next = !previous;
      setOrder(next ? shuffleIndices(total) : spec.cards.map((_, i) => i));
      setPosition(0);
      setFlipped(false);
      setHintOpen(false);
      setPhase("studying");
      setReviewRound(false);
      return next;
    });
  };

  const jumpTo = (index: number) => {
    stopSpeaking();
    const at = order.indexOf(index);
    setPosition(at >= 0 ? at : 0);
    setFlipped(false);
    setHintOpen(false);
    setPhase("studying");
    setView("study");
  };

  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target?.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="menu"], [role="menuitem"], [role="menuitemcheckbox"], [aria-haspopup]',
        ) ||
        (target?.closest('[role="dialog"]') && !presenting) ||
        phase !== "studying" ||
        (view !== "study" && !presenting)
      )
        return;
      if (
        event.code === "Space" &&
        target?.closest('button, a, [role="button"]')
      )
        return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
      if (event.code === "Space") {
        event.preventDefault();
        flip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => stopSpeaking, []);

  if (total === 0 || !card) {
    return (
      <div className="text-muted-foreground border-border/60 my-4 rounded-xl border border-dashed p-4 text-sm">
        This deck has no cards.
      </div>
    );
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") go(-1);
    else if (event.key === "ArrowRight") go(1);
    else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      flip();
    }
  };

  /* ---------------------------------------------------------------- inline */

  if (!full) {
    return (
      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="border-border/60 bg-card focus-visible:ring-ring/40 my-4 w-full max-w-xl overflow-hidden rounded-2xl border outline-none focus-visible:ring-2"
      >
        <DeckHeader
          theme={theme}
          title={spec.title ?? "Kad Imbas"}
          subject={spec.subject}
        >
          <Counter chip={theme.chip} position={position} total={order.length} />
        </DeckHeader>
        <ProgressBar theme={theme} value={(position + 1) / order.length} />
        <div className="px-4 py-4">
          <FlipCard
            card={card}
            flipped={flipped}
            theme={theme}
            compact
            onFlip={flip}
          />
          <HintRow
            card={card}
            open={hintOpen}
            onToggle={() => setHintOpen((o) => !o)}
          />
        </div>
        <DeckControls
          position={position}
          total={order.length}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          shuffled={shuffled}
          onShuffle={toggleShuffle}
        />
      </div>
    );
  }

  /* ------------------------------------------------------------------ full */

  const finished = phase === "done";

  const mastery = Math.round((knownCount / total) * 100);
  const reset = () => {
    setShuffled(false);
    restart();
  };

  const studyControls = (
    <div className="mx-auto mt-5 flex w-full max-w-lg flex-col items-center gap-4">
      <div className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2 sm:grid-cols-[1fr_1.2fr_1fr] sm:gap-3">
        <Button
          variant="outline"
          className="h-11 gap-1 sm:gap-2"
          disabled={position === 0}
          onClick={() => go(-1)}
          aria-label="Kad sebelumnya"
        >
          <ChevronLeftIcon className="size-4" />
          <span className="hidden sm:inline">Sebelum</span>
        </Button>
        <Button className="h-11 gap-2" onClick={flip} aria-keyshortcuts="Space">
          <RotateCcwIcon className="size-4" />
          <span>{flipped ? "Lihat Soalan" : "Lihat Jawapan"}</span>
        </Button>
        <Button
          variant="outline"
          className="h-11 gap-1 sm:gap-2"
          disabled={position === order.length - 1}
          onClick={() => go(1)}
          aria-label="Kad seterusnya"
        >
          <span className="hidden sm:inline">Seterusnya</span>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
      <div className="min-h-11 w-full">
        {flipped ? (
          <div
            className="grid grid-cols-2 gap-2 sm:gap-3"
            aria-label="Nilai kefahaman anda"
          >
            <Button
              variant="outline"
              className="h-11 gap-2"
              onClick={() => mark("again")}
            >
              <RotateCcwIcon className="size-4" />
              Masih Belajar
            </Button>
            <Button
              variant="secondary"
              className={cn("h-11 gap-2", theme.chip)}
              onClick={() => mark("known")}
            >
              <CheckIcon className="size-4" />
              Sudah Faham
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground py-3 text-center text-xs">
            Fikirkan jawapan anda sebelum membalikkan kad.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-background flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-border/60 shrink-0 border-b px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start gap-3">
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="mt-0.5 size-10"
                onClick={onClose}
                aria-label="Kembali ke kad imbas"
              >
                <ArrowLeftIcon className="size-5" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl leading-snug font-semibold tracking-tight sm:text-2xl">
                {spec.title ?? "Kad Imbas"}
              </h1>
              {spec.subject && (
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {spec.subject}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-10" />
                }
                aria-label="Pilihan kad imbas"
              >
                <MoreHorizontalIcon className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-48 motion-reduce:animate-none"
              >
                <DropdownMenuItem
                  onClick={toggleSpeaking}
                  disabled={finished || view !== "study"}
                >
                  {speaking ? <VolumeXIcon /> : <Volume2Icon />}
                  {speaking ? "Berhenti baca" : "Baca kuat"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    stopSpeaking();
                    setPresenting(true);
                  }}
                  disabled={finished || view !== "study"}
                >
                  <MaximizeIcon />
                  Skrin penuh
                </DropdownMenuItem>
                <DropdownMenuCheckboxItem
                  checked={shuffled}
                  onCheckedChange={toggleShuffle}
                >
                  <ShuffleIcon />
                  Acak kad
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={reset}>
                  <RotateCcwIcon />
                  Mula semula
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="text-muted-foreground inline-flex items-center gap-2">
              <LayoutGridIcon className="size-4" />
              {total} kad
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium",
                theme.chip,
              )}
            >
              <CircleCheckIcon className="size-4" />
              {knownCount} dikuasai
            </span>
            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
              {mastery}% dikuasai
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar
              theme={theme}
              value={knownCount / total}
              label="Penguasaan dek"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div
            className="bg-muted/60 inline-flex items-center gap-1 rounded-lg p-1"
            role="group"
            aria-label="Paparan kad imbas"
          >
            <Button
              variant={view === "study" ? "outline" : "ghost"}
              className="h-9 gap-2"
              aria-pressed={view === "study"}
              onClick={() => setView("study")}
            >
              <LightbulbIcon className="size-4" />
              Belajar
            </Button>
            <Button
              variant={view === "grid" ? "outline" : "ghost"}
              className="h-9 gap-2"
              aria-pressed={view === "grid"}
              onClick={() => {
                stopSpeaking();
                setView("grid");
              }}
            >
              <LayoutGridIcon className="size-4" />
              Semua Kad
            </Button>
          </div>
          {againCount > 0 && (
            <Button variant="ghost" className="h-9 gap-2" onClick={reviewAgain}>
              <RotateCcwIcon className="size-4" />
              Ulang Kaji ({againCount})
            </Button>
          )}
        </div>

        {view === "grid" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {order.map((index, at) => {
              const item = spec.cards[index];
              const status = marks[index];
              return (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => jumpTo(index)}
                  className={cn(
                    "h-auto min-h-32 items-start justify-start gap-3 p-4 text-left whitespace-normal",
                    at === position && "ring-ring/40 ring-2",
                  )}
                >
                  <span className="text-muted-foreground pt-0.5 text-xs tabular-nums">
                    {at + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-3 text-sm leading-relaxed font-medium">
                      {item.front}
                    </span>
                    {item.tags?.length ? (
                      <span className="mt-2 flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-xs font-normal"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "mt-3 block text-xs font-normal",
                        status === "known"
                          ? theme.chip
                          : "text-muted-foreground",
                      )}
                    >
                      {status === "known"
                        ? "Sudah Faham"
                        : status === "again"
                          ? "Masih Belajar"
                          : "Belum dinilai"}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        ) : finished ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center"
            role="status"
          >
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-full",
                theme.chip,
              )}
            >
              <CircleCheckIcon className="size-6" />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight">
              {reviewRound ? "Pusingan ulangan selesai" : "Sesi selesai"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {knownCount} dikuasai · {againCount} masih belajar
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {againCount > 0 && (
                <Button className="h-11 gap-2" onClick={reviewAgain}>
                  <RotateCcwIcon className="size-4" />
                  Ulang {againCount} kad
                </Button>
              )}
              <Button variant="outline" className="h-11" onClick={reset}>
                Mula semula
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-center pb-2">
            <div className="mx-auto w-full max-w-3xl">
              <div
                className="text-muted-foreground mb-3 flex items-center justify-between gap-3 text-xs tabular-nums"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <span>
                  {reviewRound ? "Ulang kaji" : "Belajar"} · Kad {position + 1}{" "}
                  daripada {order.length}
                </span>
                <span>
                  {marks[cardIndex] === "known"
                    ? "Sudah Faham"
                    : marks[cardIndex] === "again"
                      ? "Masih Belajar"
                      : "Belum dinilai"}
                </span>
              </div>
              <FlipCard
                key={cardIndex}
                card={card}
                flipped={flipped}
                theme={theme}
                onFlip={flip}
              />
              {studyControls}
              <div className="flex flex-col items-center gap-4">
                <HintRow
                  card={card}
                  open={hintOpen}
                  onToggle={() => setHintOpen((o) => !o)}
                />
                <p className="text-muted-foreground hidden items-center justify-center gap-2 text-xs sm:flex">
                  <kbd className="bg-muted/60 rounded border px-1.5 py-1 font-sans">
                    Space
                  </kbd>{" "}
                  untuk flip
                  <kbd className="bg-muted/60 ml-3 rounded border px-1.5 py-1">
                    ←
                  </kbd>
                  <kbd className="bg-muted/60 rounded border px-1.5 py-1">
                    →
                  </kbd>{" "}
                  untuk navigasi
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={presenting}
        onOpenChange={(open) => {
          stopSpeaking();
          setPresenting(open);
        }}
      >
        <DialogContent className="bg-background inset-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none border-0 p-4 ring-0 motion-reduce:animate-none sm:max-w-none sm:p-8">
          <DialogTitle className="pr-8 text-lg">
            {spec.title ?? "Kad Imbas"}
          </DialogTitle>
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-6">
            {finished ? (
              <div className="space-y-4 text-center">
                <h2 className="text-2xl font-semibold">Sesi selesai</h2>
                <p className="text-muted-foreground">
                  {knownCount} dikuasai · {againCount} masih belajar
                </p>
                <Button variant="outline" onClick={() => setPresenting(false)}>
                  Kembali ke dek
                </Button>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground mb-3 text-center text-sm tabular-nums">
                  Kad {position + 1} daripada {order.length} · {knownCount}{" "}
                  dikuasai
                </p>
                <FlipCard
                  key={cardIndex}
                  card={card}
                  flipped={flipped}
                  theme={theme}
                  onFlip={flip}
                  presentation
                />
                {studyControls}
                <div className="flex justify-center">
                  <HintRow
                    card={card}
                    open={hintOpen}
                    onToggle={() => setHintOpen((o) => !o)}
                  />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ------------------------------------------------------------- subcomponents */

const DeckHeader: FC<{
  theme: AccentTheme;
  title: string;
  subject?: string | undefined;
  children?: ReactNode;
}> = ({ theme, title, subject, children }) => (
  <div className={cn("bg-gradient-to-r px-4 py-3", theme.header)}>
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {title}
      </span>
      {children}
    </div>
    {subject ? (
      <p className="text-muted-foreground mt-0.5 truncate text-xs">{subject}</p>
    ) : null}
  </div>
);

const Counter: FC<{ chip: string; position: number; total: number }> = ({
  chip,
  position,
  total,
}) => (
  <span
    className={cn(
      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
      chip,
    )}
  >
    {position + 1} / {total}
  </span>
);

const ProgressBar: FC<{
  theme: AccentTheme;
  value: number;
  label?: string;
}> = ({ theme, value, label = "Kemajuan kad" }) => (
  <div
    className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(value * 100)}
  >
    <div
      className={cn(
        "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
        theme.bar,
      )}
      style={{ width: `${Math.min(value, 1) * 100}%` }}
    />
  </div>
);

const FlipCard: FC<{
  card: FlashcardItem;
  flipped: boolean;
  theme: AccentTheme;
  compact?: boolean;
  presentation?: boolean;
  onFlip: () => void;
}> = ({ card, flipped, theme, compact, presentation, onFlip }) => {
  const reducedMotion = useReducedMotion();
  return (
    <button
      type="button"
      onClick={onFlip}
      className="focus-visible:ring-ring/50 block w-full rounded-2xl text-left outline-none [perspective:1200px] focus-visible:ring-3"
      aria-label={flipped ? "Tunjuk soalan" : "Tunjuk jawapan"}
      aria-pressed={flipped}
    >
      <motion.span
        className="relative grid w-full [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{
          duration: reducedMotion ? 0 : 0.45,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <CardFace
          theme={theme}
          side="front"
          card={card}
          compact={compact}
          presentation={presentation}
          hidden={flipped}
          reducedMotion={!!reducedMotion}
        />
        <CardFace
          theme={theme}
          side="back"
          card={card}
          compact={compact}
          presentation={presentation}
          hidden={!flipped}
          reducedMotion={!!reducedMotion}
        />
      </motion.span>
    </button>
  );
};

const CardFace: FC<{
  card: FlashcardItem;
  side: "front" | "back";
  theme: AccentTheme;
  compact?: boolean;
  presentation?: boolean;
  hidden: boolean;
  reducedMotion: boolean;
}> = ({ card, side, theme, compact, presentation, hidden, reducedMotion }) => {
  const isBack = side === "back";
  const text = isBack ? card.back : card.front;
  return (
    <span
      aria-hidden={hidden}
      style={{ visibility: reducedMotion && hidden ? "hidden" : undefined }}
      className={cn(
        "bg-card text-card-foreground border-border col-start-1 row-start-1 flex min-w-0 flex-col items-center justify-center gap-5 rounded-2xl border text-center shadow-sm [-webkit-backface-visibility:hidden] [backface-visibility:hidden]",
        compact
          ? "min-h-40 gap-3 px-5 py-6"
          : presentation
            ? "min-h-80 px-6 py-10 sm:min-h-96 sm:px-12"
            : "min-h-72 px-5 py-8 sm:min-h-88 sm:px-10 sm:py-10",
        hidden && "pointer-events-none",
        isBack && "[transform:rotateY(180deg)]",
      )}
    >
      {!isBack && (
        <span className="flex flex-wrap items-center justify-center gap-1.5">
          {card.type ? (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                theme.badge,
              )}
            >
              {TYPE_LABEL[card.type] ?? card.type}
            </span>
          ) : null}
          {card.tags?.map((tag) => (
            <span
              key={tag}
              className="bg-muted/70 text-muted-foreground rounded-md px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
        </span>
      )}
      <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {isBack ? "Jawapan" : "Soalan"}
      </span>
      <span
        className={cn(
          isBack
            ? compact
              ? "text-sm leading-relaxed"
              : "max-w-2xl text-lg leading-relaxed sm:text-xl"
            : compact
              ? "text-lg leading-snug font-semibold"
              : presentation
                ? "text-3xl leading-snug font-semibold md:text-4xl"
                : "max-w-2xl text-2xl leading-snug font-semibold tracking-tight sm:text-3xl lg:text-4xl",
          "[overflow-wrap:anywhere] whitespace-pre-wrap",
          card.type === "formula" && "font-mono",
        )}
      >
        {text}
      </span>
      {!isBack && (
        <span className="text-muted-foreground text-xs">
          Klik kad untuk lihat jawapan
        </span>
      )}
    </span>
  );
};

const HintRow: FC<{
  card: FlashcardItem;
  open: boolean;
  onToggle: () => void;
}> = ({ card, open, onToggle }) =>
  card.hint ? (
    <div className="mt-2">
      <button
        type="button"
        onClick={onToggle}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
      >
        <LightbulbIcon className="size-3.5" />
        {open ? "Sembunyi petunjuk" : "Petunjuk"}
      </button>
      {open && (
        <p className="text-muted-foreground mt-1 text-xs italic">{card.hint}</p>
      )}
    </div>
  ) : null;

const DeckControls: FC<{
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  shuffled: boolean;
  onShuffle: () => void;
}> = ({ position, total, onPrev, onNext, shuffled, onShuffle }) => (
  <div className="border-border/60 flex items-center justify-center gap-3 border-t px-4 py-2.5">
    <button
      type="button"
      aria-label="Kad sebelumnya"
      disabled={position === 0}
      onClick={onPrev}
      className="hover:bg-muted flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
    >
      <ChevronLeftIcon className="size-4" />
    </button>
    <span className="text-muted-foreground w-14 text-center text-xs tabular-nums">
      {position + 1} / {total}
    </span>
    <button
      type="button"
      aria-label="Kad seterusnya"
      disabled={position === total - 1}
      onClick={onNext}
      className="hover:bg-muted flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
    >
      <ChevronRightIcon className="size-4" />
    </button>
    <button
      type="button"
      onClick={onShuffle}
      className={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground ml-2 flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition-colors",
        shuffled && "bg-muted text-foreground",
      )}
    >
      <ShuffleIcon className="size-3.5" />
      Acak
    </button>
  </div>
);
