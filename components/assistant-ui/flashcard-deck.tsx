"use client";

import { useEffect, useMemo, useState, type FC, type ReactNode } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutGridIcon,
  LightbulbIcon,
  MaximizeIcon,
  RotateCcwIcon,
  ShuffleIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
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
    setPosition((current) => Math.min(Math.max(current + delta, 0), order.length - 1));
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
    const at = order.indexOf(index);
    setPosition(at >= 0 ? at : 0);
    setFlipped(false);
    setHintOpen(false);
    setPhase("studying");
    setView("study");
  };

  useEffect(() => {
    if (!presenting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPresenting(false);
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === " ") {
        event.preventDefault();
        flip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenting, position, order.length]);

  useEffect(() => stopSpeaking, []);

  if (total === 0 || !card) {
    return (
      <div className="text-muted-foreground border-border/60 my-4 rounded-xl border border-dashed p-4 text-sm">
        This deck has no cards.
      </div>
    );
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
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
        className="border-border/60 bg-card my-4 w-full max-w-xl overflow-hidden rounded-2xl border outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <DeckHeader theme={theme} title={spec.title ?? "Kad Imbas"} subject={spec.subject}>
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
          <HintRow card={card} open={hintOpen} onToggle={() => setHintOpen((o) => !o)} />
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className={cn("bg-gradient-to-r px-4 py-3", theme.header)}>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {spec.title ?? "Kad Imbas"}
          </span>
          {full && (
            <span className="text-muted-foreground hidden shrink-0 items-center gap-2 text-xs sm:flex">
              <span className="text-emerald-600 dark:text-emerald-400">
                ✓ {knownCount}
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                ↻ {againCount}
              </span>
            </span>
          )}
          <Counter chip={theme.chip} position={position} total={order.length} />
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {spec.subject ? (
            <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
              {spec.subject}
            </p>
          ) : (
            <span className="flex-1" />
          )}
          <div className="bg-muted/70 flex shrink-0 items-center gap-0.5 rounded-full p-0.5">
            <ViewToggle
              active={view === "study"}
              icon={LightbulbIcon}
              label="Belajar"
              onClick={() => setView("study")}
            />
            <ViewToggle
              active={view === "grid"}
              icon={LayoutGridIcon}
              label="Kad"
              onClick={() => setView("grid")}
            />
          </div>
          <HeaderAction
            icon={speaking ? VolumeXIcon : Volume2Icon}
            label={speaking ? "Berhenti baca" : "Baca kuat"}
            onClick={toggleSpeaking}
          />
          <HeaderAction
            icon={MaximizeIcon}
            label="Skrin penuh"
            onClick={() => setPresenting(true)}
          />
          <HeaderAction
            icon={RotateCcwIcon}
            label="Mula semula"
            onClick={() => {
              setShuffled(false);
              restart();
            }}
          />
          <HeaderAction
            icon={ShuffleIcon}
            label="Acak"
            active={shuffled}
            onClick={toggleShuffle}
          />
          {onClose && (
            <HeaderAction icon={XIcon} label="Tutup" onClick={onClose} />
          )}
        </div>
      </div>

      <ProgressBar theme={theme} value={finished ? 1 : (position + 1) / order.length} />

      {view === "grid" ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
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
                    at === position && "ring-2 ring-ring/40",
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
      ) : finished ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
          <p className="text-lg font-semibold">
            {reviewRound ? "Pusingan ulangan selesai" : "Sesi selesai"}
          </p>
          <p className="text-muted-foreground text-sm">
            {knownCount} faham · {againCount} untuk ulang kaji
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {againCount > 0 && (
              <button
                type="button"
                onClick={reviewAgain}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-white transition-opacity hover:opacity-90",
                  theme.bar,
                )}
              >
                <RotateCcwIcon className="size-4" />
                Ulang {againCount} kad
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
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6">
          <div className="relative w-full max-w-2xl">
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-1/2 left-1/2 h-[70%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-[60px] blur-3xl",
                theme.glow,
              )}
            />
            <FlipCard
              card={card}
              flipped={flipped}
              theme={theme}
              onFlip={flip}
            />
          </div>

          <div className="mt-4 flex w-full max-w-2xl flex-col items-center gap-3">
            <HintRow card={card} open={hintOpen} onToggle={() => setHintOpen((o) => !o)} />

            {flipped ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => mark("again")}
                  className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300 flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors"
                >
                  ↻ Ulang kaji
                </button>
                <button
                  type="button"
                  onClick={() => mark("known")}
                  className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300 flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors"
                >
                  ✓ Faham
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Klik kad untuk flip · ← → navigasi · space flip
              </p>
            )}

            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Kad sebelumnya"
                disabled={position === 0}
                onClick={() => go(-1)}
                className="hover:bg-muted flex size-9 items-center justify-center rounded-full transition-colors disabled:opacity-30"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
              <span className="text-muted-foreground w-16 text-center text-sm tabular-nums">
                {position + 1} / {order.length}
              </span>
              <button
                type="button"
                aria-label="Kad seterusnya"
                disabled={position === order.length - 1}
                onClick={() => go(1)}
                className="hover:bg-muted flex size-9 items-center justify-center rounded-full transition-colors disabled:opacity-30"
              >
                <ChevronRightIcon className="size-5" />
              </button>
            </div>
          </div>
        </div>
      )}

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
              className="hover:bg-white/10 flex size-9 items-center justify-center rounded-full transition-colors"
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
              className="hover:bg-white/10 flex size-9 items-center justify-center rounded-full transition-colors"
            >
              <ChevronRightIcon className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Keluar"
              onClick={() => setPresenting(false)}
              className="hover:bg-white/10 ml-4 flex size-9 items-center justify-center rounded-full transition-colors"
            >
              <XIcon className="size-5" />
            </button>
          </div>
        </div>
      )}
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

const ProgressBar: FC<{ theme: AccentTheme; value: number }> = ({
  theme,
  value,
}) => (
  <div className="h-1 w-full bg-muted/60">
    <div
      className={cn("h-full transition-all duration-300", theme.bar)}
      style={{ width: `${Math.min(value, 1) * 100}%` }}
    />
  </div>
);

const ViewToggle: FC<{
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}> = ({ active, icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex h-7 items-center gap-1 rounded-full px-2.5 text-xs transition-colors",
      active
        ? "bg-background text-foreground font-medium shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    <Icon className="size-3.5" />
    {label}
  </button>
);

const HeaderAction: FC<{
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
}> = ({ icon: Icon, label, onClick, active }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={cn(
      "text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
      active && "bg-muted text-foreground",
    )}
  >
    <Icon className="size-3.5" />
  </button>
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
        compact ? "h-40" : presentation ? "h-80 md:h-96" : "h-64 md:h-72",
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
        "border-border/60 absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border px-6 text-center ring-1 ring-inset [backface-visibility:hidden]",
        theme.cardRing,
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
                theme.badge,
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
      <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {isBack ? "Jawapan" : "Soalan"}
      </span>
      <span
        className={cn(
          isBack
            ? compact
              ? "text-sm leading-relaxed"
              : "text-base leading-relaxed md:text-lg"
            : compact
              ? "text-lg font-semibold leading-snug"
              : presentation
                ? "text-3xl font-semibold leading-snug md:text-4xl"
                : "text-2xl font-semibold leading-snug",
          card.type === "formula" && "font-mono",
        )}
      >
        {text}
      </span>
      {!isBack && (
        <span className="text-muted-foreground text-xs">Klik untuk flip</span>
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
