"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  GraduationCapIcon,
  LayersIcon,
  LayoutGridIcon,
  LightbulbIcon,
  MoreHorizontalIcon,
  RepeatIcon,
  RotateCcwIcon,
  ShuffleIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * The rich flashcard deck rendered from a `render_ui` flashcards spec.
 *
 * `inline` stays compact inside a chat message. `full` is the Spaces study
 * experience: stats strip, Belajar / Ulang Kaji / Semua Kad modes, a stacked
 * card stage with a directional flick animation, 3D flip, Faham/Ulang marks,
 * read-aloud through the browser voice, and per-account mastery persistence
 * when a `deckId` is given.
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
  cover: string;
  pill: string;
};

const ACCENTS: Record<string, AccentTheme> = {
  teal: {
    header: "from-teal-500/15 via-teal-500/5 to-transparent",
    bar: "bg-teal-500",
    chip: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
    badge: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    cover:
      "bg-gradient-to-br from-teal-300/50 via-teal-200/40 to-cyan-100/30 dark:from-teal-900/60 dark:via-teal-950/50 dark:to-cyan-950/40",
    pill: "bg-teal-500/15 text-teal-800 dark:text-teal-200",
  },
  blue: {
    header: "from-blue-500/15 via-blue-500/5 to-transparent",
    bar: "bg-blue-500",
    chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    cover:
      "bg-gradient-to-br from-blue-300/50 via-sky-200/40 to-indigo-100/30 dark:from-blue-900/60 dark:via-sky-950/50 dark:to-indigo-950/40",
    pill: "bg-blue-500/15 text-blue-800 dark:text-blue-200",
  },
  amber: {
    header: "from-amber-500/15 via-amber-500/5 to-transparent",
    bar: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    cover:
      "bg-gradient-to-br from-amber-300/50 via-orange-200/40 to-yellow-100/30 dark:from-amber-900/60 dark:via-orange-950/50 dark:to-yellow-950/40",
    pill: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  },
  violet: {
    header: "from-violet-500/15 via-violet-500/5 to-transparent",
    bar: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    cover:
      "bg-gradient-to-br from-violet-300/50 via-purple-200/40 to-fuchsia-100/30 dark:from-violet-900/60 dark:via-purple-950/50 dark:to-fuchsia-950/40",
    pill: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
  },
  rose: {
    header: "from-rose-500/15 via-rose-500/5 to-transparent",
    bar: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    cover:
      "bg-gradient-to-br from-rose-300/50 via-pink-200/40 to-red-100/30 dark:from-rose-900/60 dark:via-pink-950/50 dark:to-red-950/40",
    pill: "bg-rose-500/15 text-rose-800 dark:text-rose-200",
  },
  emerald: {
    header: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    bar: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    cover:
      "bg-gradient-to-br from-emerald-300/50 via-green-200/40 to-lime-100/30 dark:from-emerald-900/60 dark:via-green-950/50 dark:to-lime-950/40",
    pill: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  },
};

export const accentTheme = (accent?: string) =>
  ACCENTS[accent ?? "teal"] ?? ACCENTS.teal!;

const TYPE_LABEL: Record<NonNullable<FlashcardItem["type"]>, string> = {
  term: "Istilah",
  question: "Soalan",
  cloze: "Isi tempat kosong",
  formula: "Formula",
};

/** Themed emoji for deck covers, keyed off the title/subject. */
const COVER_EMOJI: [RegExp, string][] = [
  [/air|water|hujan|sungai|laut|hidrologi/i, "💧"],
  [/respirasi|pernafasan|paru/i, "🫁"],
  [/ekosistem|haiwan|hutan|rantaian|makanan/i, "🦌"],
  [/unsur|sebatian|atom|molekul|kimia/i, "⚛️"],
  [/daya|gerakan/i, "🚚"],
  [/tenaga|energi|elektrik|penukaran/i, "💡"],
  [/suria|angkasa|planet|bintang/i, "🪐"],
  [/fotosintesis|tumbuhan|tumbuh-tumbuhan|plant/i, "🌱"],
  [/sel\b|biologi|genetik|dna/i, "🧬"],
  [/matematik|nombor|algebra|pecahan/i, "➗"],
  [/sejarah|kemerdekaan|tokoh/i, "📜"],
  [/peta|geografi|benua/i, "🗺️"],
  [/bahasa|tatabahasa|karangan/i, "📖"],
  [/badan|kesihatan|nutrisi/i, "🫀"],
];

export const coverEmoji = (...texts: (string | undefined)[]) => {
  const haystack = texts.filter(Boolean).join(" ");
  return COVER_EMOJI.find(([pattern]) => pattern.test(haystack))?.[1] ?? "📚";
};

type Mark = "known" | "again";
type StudyView = "study" | "review" | "grid";

const shuffleIndices = (length: number) => {
  const indices = Array.from({ length }, (_, index) => index);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
};

const allIndices = (length: number) => Array.from({ length }, (_, i) => i);

export const FlashcardDeck: FC<{
  spec: FlashcardSpec;
  variant?: "inline" | "full";
  /** When given, mastery persists per account via /api/decks/<id>/progress. */
  deckId?: string;
  onClose?: () => void;
}> = ({ spec, variant = "inline", deckId, onClose }) => {
  const full = variant === "full";
  const theme = accentTheme(spec.accent);
  const reduceMotion = useReducedMotion();
  const total = spec.cards.length;

  const [order, setOrder] = useState<number[]>(() =>
    allIndices(spec.cards.length),
  );
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [phase, setPhase] = useState<"studying" | "done">("studying");
  const [reviewRound, setReviewRound] = useState(false);
  const [view, setView] = useState<StudyView>("study");
  const [presenting, setPresenting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const directionRef = useRef(1);

  const cardIndex = order[position];
  const card = spec.cards[cardIndex];

  const knownCount = useMemo(
    () => Object.values(marks).filter((mark) => mark === "known").length,
    [marks],
  );
  const againIndices = useMemo(
    () =>
      Object.entries(marks)
        .filter(([, mark]) => mark === "again")
        .map(([index]) => Number(index)),
    [marks],
  );
  const mastery = total > 0 ? Math.round((knownCount / total) * 100) : 0;

  /* ------------------------------------------------- progress persistence */

  const persistProgress = useCallback(
    (nextMarks: Record<number, Mark>) => {
      if (!deckId) return;
      const knownIndices = Object.entries(nextMarks)
        .filter(([, mark]) => mark === "known")
        .map(([index]) => Number(index));
      void fetch(`/api/decks/${deckId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knownIndices, total }),
      }).catch(() => {});
    },
    [deckId, total],
  );

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    fetch(`/api/decks/${deckId}/progress`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { knownIndices?: number[] } | null) => {
        if (cancelled || !data?.knownIndices?.length) return;
        setMarks((prev) => {
          const next = { ...prev };
          for (const index of data.knownIndices ?? []) next[index] = "known";
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  /* --------------------------------------------------------------- speech */

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

  /* ------------------------------------------------------------ navigation */

  const go = (delta: number) => {
    directionRef.current = delta;
    stopSpeaking();
    setFlipped(false);
    setHintOpen(false);
    setPosition((current) =>
      Math.min(Math.max(current + delta, 0), order.length - 1),
    );
  };

  const flip = () => {
    stopSpeaking();
    setFlipped((value) => !value);
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
    const next = { ...marks, [cardIndex]: value };
    setMarks(next);
    persistProgress(next);
    advance();
  };

  const restart = (indices?: number[], review = false) => {
    stopSpeaking();
    directionRef.current = 1;
    setOrder(indices ?? allIndices(total));
    setPosition(0);
    setFlipped(false);
    setHintOpen(false);
    setPhase("studying");
    setReviewRound(review);
    if (indices === undefined) {
      setMarks({});
      persistProgress({});
    }
    setView("study");
  };

  const toggleShuffle = () => {
    stopSpeaking();
    directionRef.current = 1;
    setShuffled((previous) => {
      const next = !previous;
      setOrder(next ? shuffleIndices(total) : allIndices(total));
      setPosition(0);
      setFlipped(false);
      setHintOpen(false);
      setPhase("studying");
      setReviewRound(false);
      setView("study");
      return next;
    });
  };

  const openReview = () => {
    if (againIndices.length === 0) {
      setView("review");
      return;
    }
    directionRef.current = 1;
    stopSpeaking();
    setOrder([...againIndices]);
    setPosition(0);
    setFlipped(false);
    setHintOpen(false);
    setPhase("studying");
    setReviewRound(true);
    setView("study");
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
      ) {
        return;
      }
      if (
        event.code === "Space" &&
        target?.closest('button, a, [role="button"]')
      ) {
        return;
      }
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
        <div className={cn("bg-gradient-to-r px-4 py-3", theme.header)}>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {spec.title ?? "Kad Imbas"}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                theme.chip,
              )}
            >
              {position + 1} / {total}
            </span>
          </div>
          {spec.subject ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {spec.subject}
            </p>
          ) : null}
        </div>
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
            onToggle={() => setHintOpen((value) => !value)}
          />
        </div>
        <div className="border-border/60 flex items-center justify-center gap-3 border-t px-4 py-2.5">
          <button
            type="button"
            aria-label="Kad sebelumnya"
            disabled={position === 0}
            onClick={() => go(-1)}
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
            onClick={() => go(1)}
            className="hover:bg-muted flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          >
            <ChevronRightIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={toggleShuffle}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground ml-2 flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition-colors",
              shuffled && "bg-muted text-foreground",
            )}
          >
            <ShuffleIcon className="size-3.5" />
            Acak
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ full */

  const finished = phase === "done";

  return (
    <div className="bg-background flex h-full min-h-0 flex-col overflow-y-auto">
      {/* Header */}
      <header className="border-border/60 shrink-0 border-b px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start gap-3">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              onClick={onClose}
              aria-label="Kembali ke kad imbas"
            >
              <ArrowLeftIcon className="size-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl leading-snug font-semibold tracking-tight sm:text-2xl">
              {spec.title ?? "Kad Imbas"}
            </h1>
            {spec.subject && (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                {spec.subject}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="bg-muted/60 hidden items-center gap-0.5 rounded-full p-0.5 sm:flex">
              <button
                type="button"
                onClick={() => setView("study")}
                aria-pressed={view === "study"}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors",
                  view === "study"
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <GraduationCapIcon className="size-4" />
                Belajar
              </button>
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors",
                  view === "grid"
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGridIcon className="size-4" />
                Kad
              </button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full"
              onClick={toggleSpeaking}
              aria-label={speaking ? "Berhenti baca" : "Baca kuat"}
            >
              {speaking ? (
                <VolumeXIcon className="size-5" />
              ) : (
                <Volume2Icon className="size-5" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-full"
                  />
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
                  onClick={() => {
                    stopSpeaking();
                    setPresenting(true);
                  }}
                  disabled={finished || view !== "study"}
                >
                  <GraduationCapIcon />
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
                <DropdownMenuItem
                  onClick={() => {
                    setShuffled(false);
                    restart();
                  }}
                >
                  <RotateCcwIcon />
                  Mula semula
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2">
          <span className="border-border/60 inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium">
            <LayersIcon className="text-muted-foreground size-3.5" />
            {total} kad
          </span>
          <span
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium",
              theme.chip,
            )}
          >
            <CircleCheckIcon className="size-3.5" />
            {knownCount} dikuasai
          </span>
          <div className="bg-muted/70 mx-1 hidden h-1 min-w-24 flex-1 overflow-hidden rounded-full sm:block">
            <div
              className={cn("h-full transition-all duration-300", theme.bar)}
              style={{ width: `${mastery}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {finished ? order.length : position + 1} daripada {order.length} ·{" "}
            {mastery}%
          </span>
          <div className="w-full sm:hidden">
            <div className="bg-muted/70 h-1 w-full overflow-hidden rounded-full">
              <div
                className={cn("h-full transition-all duration-300", theme.bar)}
                style={{ width: `${mastery}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mode tabs */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 lg:px-8">
        <div
          role="tablist"
          aria-label="Mod kad imbas"
          className="bg-muted/60 mx-auto flex w-full max-w-lg items-center gap-0.5 rounded-full p-1"
        >
          <ModeTab
            active={view === "study" && !reviewRound}
            icon={GraduationCapIcon}
            label="Belajar"
            onClick={() => setView("study")}
            theme={theme}
          />
          <ModeTab
            active={view === "review" || (view === "study" && reviewRound)}
            icon={RepeatIcon}
            label="Ulang Kaji"
            onClick={openReview}
            theme={theme}
          />
          <ModeTab
            active={view === "grid"}
            icon={LayoutGridIcon}
            label="Semua Kad"
            onClick={() => setView("grid")}
            theme={theme}
          />
        </div>
      </div>

      {/* Stage */}
      {view === "grid" ? (
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {order.map((index, at) => {
              const item = spec.cards[index];
              const mark = marks[index];
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => jumpTo(index)}
                  className={cn(
                    "border-border/60 bg-card hover:border-foreground/20 flex items-start gap-2 rounded-xl border p-3 text-left transition-colors",
                    at === position && "ring-ring/40 ring-2",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1 size-2 shrink-0 rounded-full",
                      mark === "known"
                        ? "bg-emerald-500"
                        : mark === "again"
                          ? "bg-amber-500"
                          : "bg-muted-foreground/30",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-medium">
                      {item.front}
                    </span>
                    {item.tags?.length ? (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                    {at + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : view === "review" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
          <RepeatIcon className="text-muted-foreground size-8" />
          <p className="text-sm font-medium">Tiada kad untuk ulang kaji</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Tandakan &ldquo;Masih Belajar&rdquo; pada kad yang sukar semasa
            belajar — kad itu akan muncul di sini.
          </p>
        </div>
      ) : finished ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
          <p className="text-lg font-semibold">
            {reviewRound ? "Pusingan ulangan selesai" : "Sesi selesai"}
          </p>
          <p className="text-muted-foreground text-sm">
            {knownCount} dikuasai · {againIndices.length} untuk ulang kaji
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {againIndices.length > 0 && (
              <button
                type="button"
                onClick={openReview}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-white transition-opacity hover:opacity-90",
                  theme.bar,
                )}
              >
                <RepeatIcon className="size-4" />
                Ulang {againIndices.length} kad
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShuffled(false);
                restart();
              }}
              className="border-border/60 hover:bg-muted flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors"
            >
              Mula semula
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-5 sm:px-6">
          <div className="flex w-full max-w-3xl items-center gap-2 sm:gap-4">
            <button
              type="button"
              aria-label="Kad sebelumnya"
              disabled={position === 0}
              onClick={() => go(-1)}
              className="border-border/60 bg-card hover:bg-muted hidden size-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors disabled:opacity-30 md:flex"
            >
              <ChevronLeftIcon className="size-5" />
            </button>

            <div className="relative min-w-0 flex-1">
              {/* stacked deck edges */}
              <div
                aria-hidden="true"
                className="border-border/60 bg-card absolute inset-x-6 -bottom-2 h-full rounded-3xl border opacity-60"
              />
              <div
                aria-hidden="true"
                className="border-border/60 bg-card absolute inset-x-3 -bottom-1 h-full rounded-3xl border opacity-80"
              />

              <AnimatePresence
                initial={false}
                mode="popLayout"
                custom={directionRef.current}
              >
                <motion.div
                  key={cardIndex}
                  custom={directionRef.current}
                  variants={
                    reduceMotion
                      ? {
                          enter: { opacity: 0 },
                          center: { opacity: 1 },
                          exit: { opacity: 0 },
                        }
                      : {
                          enter: (direction: number) => ({
                            x: direction > 0 ? 56 : -56,
                            y: direction > 0 ? 40 : -40,
                            rotate: direction > 0 ? 7 : -7,
                            scale: 0.92,
                            opacity: 0,
                          }),
                          center: {
                            x: 0,
                            y: 0,
                            rotate: 0,
                            scale: 1,
                            opacity: 1,
                          },
                          exit: (direction: number) => ({
                            x: direction > 0 ? -56 : 56,
                            y: direction > 0 ? 40 : -40,
                            rotate: direction > 0 ? -7 : 7,
                            scale: 0.92,
                            opacity: 0,
                          }),
                        }
                  }
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  className="relative"
                >
                  <div className="bg-card relative overflow-hidden rounded-3xl">
                    <FlipCard
                      card={card}
                      flipped={flipped}
                      theme={theme}
                      onFlip={flip}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              type="button"
              aria-label="Kad seterusnya"
              disabled={position === order.length - 1}
              onClick={() => go(1)}
              className="border-border/60 bg-card hover:bg-muted hidden size-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors disabled:opacity-30 md:flex"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </div>

          <div className="mt-5 flex w-full max-w-2xl flex-col items-center gap-4">
            <HintRow
              card={card}
              open={hintOpen}
              onToggle={() => setHintOpen((value) => !value)}
            />

            <div className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2 sm:grid-cols-[1fr_1.2fr_1fr] sm:gap-3">
              <Button
                variant="outline"
                className="h-11 gap-1 rounded-full sm:gap-2"
                disabled={position === 0}
                onClick={() => go(-1)}
                aria-label="Kad sebelumnya"
              >
                <ChevronLeftIcon className="size-4" />
                <span className="hidden sm:inline">Sebelum</span>
              </Button>
              <Button
                className={cn(
                  "h-11 gap-2 rounded-full text-white hover:opacity-90",
                  theme.bar,
                )}
                onClick={flip}
                aria-keyshortcuts="Space"
              >
                <RotateCcwIcon className="size-4" />
                {flipped ? "Lihat Soalan" : "Lihat Jawapan"}
              </Button>
              <Button
                variant="outline"
                className="h-11 gap-1 rounded-full sm:gap-2"
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
                    className="h-11 gap-2 rounded-full"
                    onClick={() => mark("again")}
                  >
                    <RotateCcwIcon className="size-4" />
                    Masih Belajar
                  </Button>
                  <Button
                    className={cn(
                      "h-11 gap-2 rounded-full text-white hover:opacity-90",
                      theme.bar,
                    )}
                    onClick={() => mark("known")}
                  >
                    <CheckIcon className="size-4" />
                    Faham
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground hidden items-center justify-center gap-3 text-xs sm:flex">
                  <Kbd>Space</Kbd>
                  <span>untuk flip</span>
                  <span className="mx-1" aria-hidden="true">
                    ·
                  </span>
                  <Kbd>←</Kbd>
                  <Kbd>→</Kbd>
                  <span>untuk navigasi</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Present mode */}
      {presenting && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="w-full max-w-3xl">
              <FlipCard
                card={card}
                flipped={flipped}
                theme={theme}
                onFlip={flip}
                presentation
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 pb-6 text-white">
            <button
              type="button"
              aria-label="Kad sebelumnya"
              onClick={() => go(-1)}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <span className="text-sm tabular-nums">
              {position + 1} / {order.length}
            </span>
            <button
              type="button"
              aria-label="Kad seterusnya"
              onClick={() => go(1)}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            >
              <ChevronRightIcon className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Keluar"
              onClick={() => setPresenting(false)}
              className="ml-4 flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            >
              <ArrowLeftIcon className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------- subcomponents */

const ModeTab: FC<{
  active: boolean;
  icon: typeof GraduationCapIcon;
  label: string;
  onClick: () => void;
  theme: AccentTheme;
}> = ({ active, icon: Icon, label, onClick, theme }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={cn(
      "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm transition-colors sm:gap-2 sm:px-4",
      active
        ? cn("font-medium", theme.pill)
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    <Icon className="size-4 shrink-0" />
    <span className="truncate">{label}</span>
  </button>
);

const Kbd: FC<{ children: ReactNode }> = ({ children }) => (
  <kbd className="border-border/60 bg-muted/60 inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 font-sans text-[11px] font-medium">
    {children}
  </kbd>
);

const ProgressBar: FC<{ theme: AccentTheme; value: number }> = ({
  theme,
  value,
}) => (
  <div className="bg-muted/60 h-1 w-full">
    <div
      className={cn("h-full transition-all duration-300", theme.bar)}
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
}> = ({ card, flipped, theme, compact, presentation, onFlip }) => (
  <button
    type="button"
    onClick={onFlip}
    className="block w-full text-left [perspective:1200px]"
    aria-label={flipped ? "Tunjuk soalan" : "Tunjuk jawapan"}
  >
    <div
      className={cn(
        "relative w-full transition-transform duration-300 [transform-style:preserve-3d]",
        flipped && "[transform:rotateY(180deg)]",
        compact ? "h-40" : presentation ? "h-80 md:h-96" : "h-72 md:h-80",
      )}
    >
      <CardFace
        theme={theme}
        side="front"
        card={card}
        compact={compact}
        presentation={presentation}
      />
      <CardFace
        theme={theme}
        side="back"
        card={card}
        compact={compact}
        presentation={presentation}
      />
    </div>
  </button>
);

const CardFace: FC<{
  card: FlashcardItem;
  side: "front" | "back";
  theme: AccentTheme;
  compact?: boolean;
  presentation?: boolean;
}> = ({ card, side, theme, compact, presentation }) => {
  const isBack = side === "back";
  const text = isBack ? card.back : card.front;
  return (
    <div
      className={cn(
        "border-border/60 absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border px-6 text-center [backface-visibility:hidden]",
        isBack && "[transform:rotateY(180deg)]",
        presentation ? "bg-white text-[#1f1f1f]" : "bg-card",
      )}
    >
      {!isBack && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {card.type ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                theme.pill,
              )}
            >
              {TYPE_LABEL[card.type] ?? card.type}
            </span>
          ) : null}
          {card.tags?.map((tag) => (
            <span
              key={tag}
              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <span className="text-muted-foreground text-[10px] font-medium tracking-[0.2em] uppercase">
        {isBack ? "Jawapan" : "Soalan"}
      </span>
      <span
        className={cn(
          isBack
            ? compact
              ? "text-sm leading-relaxed"
              : "text-base leading-relaxed md:text-lg"
            : compact
              ? "text-lg leading-snug font-semibold"
              : presentation
                ? "text-3xl leading-snug font-semibold md:text-4xl"
                : "text-2xl leading-snug font-semibold sm:text-3xl",
          card.type === "formula" && "font-mono",
        )}
      >
        {text}
      </span>
      {!isBack && (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <GraduationCapIcon className="size-3.5" />
          {compact ? "Klik untuk flip" : "Klik kad untuk lihat jawapan"}
        </span>
      )}
    </div>
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
