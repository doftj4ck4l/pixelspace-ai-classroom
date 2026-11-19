"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  HelpCircleIcon,
  LayoutGridIcon,
  LightbulbIcon,
  ListChecksIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  ShuffleIcon,
  SparklesIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
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
import { accentTheme } from "@/components/assistant-ui/flashcard-deck";
import { type QuizQuestion, type QuizSpec } from "@/lib/quizzes/spec";

export type { QuizQuestion, QuizSpec } from "@/lib/quizzes/spec";

/**
 * The interactive quiz rendered from a `render_ui` quizzes spec.
 *
 * `inline` stays compact inside a chat message. `full` is the Spaces quiz
 * experience: stats strip, Ambil Kuiz / Ulang Salah / Semua Soalan modes, one
 * question at a time with per-type answering (options, true-false, fill-blank,
 * open-ended self-check), instant feedback + explanations, read-aloud, score
 * persistence per account, and AI editing hooks.
 */

type Result = "correct" | "wrong";
type QuizView = "quiz" | "review" | "grid";

const TYPE_LABEL: Record<QuizQuestion["type"], string> = {
  "multiple-choice": "Pilihan",
  "open-ended": "Terbuka",
  "true-false": "Benar/Palsu",
  "fill-blank": "Isi Tempat Kosong",
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const shuffleIndices = (length: number) => {
  const indices = Array.from({ length }, (_, index) => index);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  return indices;
};

const allIndices = (length: number) => Array.from({ length }, (_, i) => i);

/** Fill-blank: exact match, case-insensitive; `/` separates alternatives. */
const matchesFillBlank = (input: string, answer: string) => {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return false;
  return answer
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .some((accepted) => accepted === normalized);
};

const keywordHits = (input: string, keywords: string[]) => {
  const haystack = input.toLowerCase();
  return keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
};

export const QuizRunner: FC<{
  spec: QuizSpec;
  variant?: "inline" | "full";
  /** When given, results persist per account via /api/quizzes/<id>/progress. */
  quizId?: string;
  onClose?: () => void;
  /** Full variant only: reports which question is on screen. */
  onQuestionChange?: (index: number) => void;
  /** Full variant only: send a question to the AI edit panel. */
  onImproveQuestion?: (index: number, question: QuizQuestion) => void;
  /** Full variant only: start on this question (used across live edits). */
  initialIndex?: number;
}> = ({
  spec,
  variant = "inline",
  quizId,
  onClose,
  onQuestionChange,
  onImproveQuestion,
  initialIndex,
}) => {
  const full = variant === "full";
  const theme = accentTheme(spec.accent);
  const reduceMotion = useReducedMotion();
  const total = spec.questions.length;

  const [order, setOrder] = useState<number[]>(() =>
    allIndices(spec.questions.length),
  );
  const [position, setPosition] = useState(() =>
    Math.min(
      Math.max(initialIndex ?? 0, 0),
      Math.max(spec.questions.length - 1, 0),
    ),
  );
  const [results, setResults] = useState<Record<number, Result>>({});
  const [view, setView] = useState<QuizView>("quiz");
  const [phase, setPhase] = useState<"studying" | "done">("studying");
  const [reviewRound, setReviewRound] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const directionRef = useRef(1);

  // Per-question interaction state (reset when the question changes)
  const [choice, setChoice] = useState<number | null>(null);
  const [tfChoice, setTfChoice] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const questionIndex = order[position];
  const question = spec.questions[questionIndex];

  const correctCount = useMemo(
    () => Object.values(results).filter((value) => value === "correct").length,
    [results],
  );
  const answeredCount = Object.keys(results).length;
  const wrongIndices = useMemo(
    () =>
      Object.entries(results)
        .filter(([, value]) => value === "wrong")
        .map(([index]) => Number(index)),
    [results],
  );
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  /* ------------------------------------------------- progress persistence */

  const persistResults = useCallback(
    (next: Record<number, Result>) => {
      if (!quizId) return;
      const payload: Record<string, Result> = {};
      for (const [index, value] of Object.entries(next)) {
        payload[index] = value;
      }
      void fetch(`/api/quizzes/${quizId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: payload, total }),
      }).catch(() => {});
    },
    [quizId, total],
  );

  useEffect(() => {
    if (!quizId) return;
    let cancelled = false;
    fetch(`/api/quizzes/${quizId}/progress`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { results?: Record<string, string> } | null) => {
        if (cancelled || !data?.results) return;
        const seeded: Record<number, Result> = {};
        for (const [key, value] of Object.entries(data.results)) {
          if (value === "correct" || value === "wrong") {
            seeded[Number(key)] = value;
          }
        }
        if (Object.keys(seeded).length > 0) setResults(seeded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  useEffect(() => {
    if (full) onQuestionChange?.(questionIndex);
  }, [full, questionIndex, onQuestionChange]);

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
    if (!question) return;
    const parts = [question.question];
    if (question.type === "multiple-choice") {
      parts.push(...question.options);
    }
    const utterance = new SpeechSynthesisUtterance(parts.join(". "));
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  useEffect(() => stopSpeaking, []);

  /* ------------------------------------------------------------ interaction */

  const resetInteraction = () => {
    setChoice(null);
    setTfChoice(null);
    setText("");
    setChecked(false);
    setRevealed(false);
  };

  const record = (value: Result) => {
    setResults((prev) => {
      if (prev[questionIndex] !== undefined) return prev;
      const next = { ...prev, [questionIndex]: value };
      persistResults(next);
      return next;
    });
  };

  const go = (delta: number) => {
    directionRef.current = delta;
    stopSpeaking();
    resetInteraction();
    setPosition((current) =>
      Math.min(Math.max(current + delta, 0), order.length - 1),
    );
  };

  const advance = () => {
    if (position < order.length - 1) go(1);
    else {
      stopSpeaking();
      setPhase("done");
    }
  };

  const chooseOption = (index: number) => {
    if (checked || !question || question.type !== "multiple-choice") return;
    setChoice(index);
    setChecked(true);
    record(index === question.answerIndex ? "correct" : "wrong");
  };

  const chooseTrueFalse = (value: boolean) => {
    if (checked || !question || question.type !== "true-false") return;
    setTfChoice(value);
    setChecked(true);
    record(value === question.answer ? "correct" : "wrong");
  };

  const checkText = () => {
    if (checked || !question || question.type !== "fill-blank") return;
    setChecked(true);
    record(matchesFillBlank(text, question.answer) ? "correct" : "wrong");
  };

  const revealOpenEnded = () => {
    if (!question || question.type !== "open-ended") return;
    setRevealed(true);
  };

  const selfCheck = (value: Result) => {
    if (checked) return;
    setChecked(true);
    record(value);
  };

  const restart = (indices?: number[], review = false) => {
    stopSpeaking();
    directionRef.current = 1;
    setOrder(indices ?? allIndices(total));
    setPosition(0);
    setPhase("studying");
    setReviewRound(review);
    resetInteraction();
    if (indices === undefined) {
      setResults({});
      persistResults({});
    }
    setView("quiz");
  };

  const toggleShuffle = () => {
    stopSpeaking();
    directionRef.current = 1;
    setShuffled((previous) => {
      const next = !previous;
      setOrder(next ? shuffleIndices(total) : allIndices(total));
      setPosition(0);
      setPhase("studying");
      setReviewRound(false);
      resetInteraction();
      setView("quiz");
      return next;
    });
  };

  const openReview = () => {
    if (wrongIndices.length === 0) {
      setView("review");
      return;
    }
    restart([...wrongIndices], true);
  };

  const jumpTo = (index: number) => {
    stopSpeaking();
    const at = order.indexOf(index);
    setPosition(at >= 0 ? at : 0);
    setPhase("studying");
    resetInteraction();
    setView("quiz");
  };

  if (total === 0 || !question) {
    return (
      <div className="text-muted-foreground border-border/60 my-4 rounded-xl border border-dashed p-4 text-sm">
        This quiz has no questions.
      </div>
    );
  }

  const answered = results[questionIndex];
  const isCorrect = answered === "correct";

  /* ---------------------------------------------------------------- inline */

  if (!full) {
    return (
      <div className="border-border/60 bg-card my-4 w-full max-w-xl overflow-hidden rounded-2xl border">
        <div className={cn("bg-gradient-to-r px-4 py-3", theme.header)}>
          <div className="flex items-center gap-2">
            <ListChecksIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {spec.title ?? "Kuiz"}
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
        <div className="px-4 py-4">
          <QuestionBody
            question={question}
            theme={theme}
            compact
            choice={choice}
            tfChoice={tfChoice}
            text={text}
            checked={checked}
            revealed={revealed}
            onChooseOption={chooseOption}
            onChooseTrueFalse={chooseTrueFalse}
            onText={setText}
            onCheckText={checkText}
            onRevealOpenEnded={revealOpenEnded}
            onSelfCheck={selfCheck}
          />
        </div>
        <div className="border-border/60 flex items-center justify-center gap-3 border-t px-4 py-2.5">
          <button
            type="button"
            aria-label="Soalan sebelumnya"
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
            aria-label="Soalan seterusnya"
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
  const canAdvance =
    checked ||
    question.type === "open-ended" ||
    (question.type === "fill-blank" && text.trim().length > 0) ||
    answered !== undefined;

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
              aria-label="Kembali ke kuiz"
            >
              <ArrowLeftIcon className="size-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl leading-snug font-semibold tracking-tight sm:text-2xl">
              {spec.title ?? "Kuiz"}
            </h1>
            {spec.subject && (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                {spec.subject}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
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
                aria-label="Pilihan kuiz"
              >
                <MoreHorizontalIcon className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-48 motion-reduce:animate-none"
              >
                <DropdownMenuCheckboxItem
                  checked={shuffled}
                  onCheckedChange={toggleShuffle}
                >
                  <ShuffleIcon />
                  Acak soalan
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
            <ListChecksIcon className="text-muted-foreground size-3.5" />
            {total} soalan
          </span>
          <span
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium",
              theme.chip,
            )}
          >
            <CircleCheckIcon className="size-3.5" />
            {correctCount} betul
          </span>
          <div className="bg-muted/70 mx-1 hidden h-1 min-w-24 flex-1 overflow-hidden rounded-full sm:block">
            <div
              className={cn("h-full transition-all duration-300", theme.bar)}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {answeredCount} dijawab daripada {total} · {score}%
          </span>
          <div className="w-full sm:hidden">
            <div className="bg-muted/70 h-1 w-full overflow-hidden rounded-full">
              <div
                className={cn("h-full transition-all duration-300", theme.bar)}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mode tabs */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 lg:px-8">
        <div
          role="tablist"
          aria-label="Mod kuiz"
          className="bg-muted/60 mx-auto flex w-full max-w-lg items-center gap-0.5 rounded-full p-1"
        >
          <QuizTab
            active={view === "quiz" && !reviewRound}
            icon={HelpCircleIcon}
            label="Ambil Kuiz"
            onClick={() => setView("quiz")}
            theme={theme}
          />
          <QuizTab
            active={view === "review" || (view === "quiz" && reviewRound)}
            icon={RotateCcwIcon}
            label="Ulang Salah"
            onClick={openReview}
            theme={theme}
          />
          <QuizTab
            active={view === "grid"}
            icon={LayoutGridIcon}
            label="Semua Soalan"
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
              const item = spec.questions[index];
              const result = results[index];
              return (
                <div
                  key={index}
                  className={cn(
                    "group border-border/60 bg-card hover:border-foreground/20 relative flex items-start rounded-xl border transition-colors",
                    at === position && "ring-ring/40 ring-2",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => jumpTo(index)}
                    className="flex min-w-0 flex-1 items-start gap-2 p-3 text-left"
                  >
                    <span
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        result === "correct"
                          ? "bg-emerald-500"
                          : result === "wrong"
                            ? "bg-amber-500"
                            : "bg-muted-foreground/30",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium">
                        {item.question}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
                          {TYPE_LABEL[item.type]}
                        </span>
                        {item.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                  <span className="flex shrink-0 flex-col items-center gap-1 p-3 pl-0">
                    <span className="text-muted-foreground text-[10px] tabular-nums">
                      {at + 1}
                    </span>
                    {onImproveQuestion ? (
                      <button
                        type="button"
                        aria-label={`Improve question ${at + 1} with AI`}
                        title="Improve with AI"
                        onClick={() => onImproveQuestion(index, item)}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-6 items-center justify-center rounded-md transition-colors sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      >
                        <SparklesIcon className="size-3.5" />
                      </button>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "review" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
          <RotateCcwIcon className="text-muted-foreground size-8" />
          <p className="text-sm font-medium">Tiada soalan untuk diulang</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Jawab kuiz dahulu — soalan yang salah akan muncul di sini untuk
            ulang kaji.
          </p>
        </div>
      ) : finished ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
          <p className="text-lg font-semibold">
            {reviewRound ? "Pusingan ulangan selesai" : "Kuiz selesai"}
          </p>
          <p className="text-muted-foreground text-sm">
            {correctCount} betul · {wrongIndices.length} salah · {score}%
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {wrongIndices.length > 0 && (
              <button
                type="button"
                onClick={openReview}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-white transition-opacity hover:opacity-90",
                  theme.bar,
                )}
              >
                <RotateCcwIcon className="size-4" />
                Ulang {wrongIndices.length} soalan
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
              aria-label="Soalan sebelumnya"
              disabled={position === 0}
              onClick={() => go(-1)}
              className="border-border/60 bg-card hover:bg-muted hidden size-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors disabled:opacity-30 md:flex"
            >
              <ChevronLeftIcon className="size-5" />
            </button>

            <div className="relative min-w-0 flex-1">
              <AnimatePresence
                initial={false}
                mode="popLayout"
                custom={directionRef.current}
              >
                <motion.div
                  key={questionIndex}
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
                  <div className="border-border/60 bg-card relative overflow-hidden rounded-3xl border px-5 py-6 sm:px-8">
                    <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                          theme.pill,
                        )}
                      >
                        {TYPE_LABEL[question.type]}
                      </span>
                      {question.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-center text-lg leading-snug font-semibold sm:text-2xl">
                      {question.question}
                    </p>
                    <div className="mt-5">
                      <QuestionBody
                        question={question}
                        theme={theme}
                        choice={choice}
                        tfChoice={tfChoice}
                        text={text}
                        checked={checked}
                        revealed={revealed}
                        onChooseOption={chooseOption}
                        onChooseTrueFalse={chooseTrueFalse}
                        onText={setText}
                        onCheckText={checkText}
                        onRevealOpenEnded={revealOpenEnded}
                        onSelfCheck={selfCheck}
                      />
                    </div>
                    {checked && question.explanation ? (
                      <p className="border-border/60 bg-muted/40 text-muted-foreground mt-4 rounded-xl border px-3 py-2 text-sm">
                        <LightbulbIcon className="mr-1.5 inline size-3.5" />
                        {question.explanation}
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              type="button"
              aria-label="Soalan seterusnya"
              disabled={position === order.length - 1}
              onClick={() => go(1)}
              className="border-border/60 bg-card hover:bg-muted hidden size-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors disabled:opacity-30 md:flex"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </div>

          <div className="mt-5 flex w-full max-w-2xl flex-col items-center gap-4">
            {onImproveQuestion ? (
              <button
                type="button"
                onClick={() => onImproveQuestion(questionIndex, question)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              >
                <SparklesIcon className="size-3.5" />
                Improve with AI
              </button>
            ) : null}

            <div className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2 sm:grid-cols-[1fr_1.2fr_1fr] sm:gap-3">
              <Button
                variant="outline"
                className="h-11 gap-1 rounded-full sm:gap-2"
                disabled={position === 0}
                onClick={() => go(-1)}
                aria-label="Soalan sebelumnya"
              >
                <ChevronLeftIcon className="size-4" />
                <span className="hidden sm:inline">Sebelum</span>
              </Button>
              <Button
                className={cn(
                  "h-11 gap-2 rounded-full text-white hover:opacity-90",
                  theme.bar,
                )}
                disabled={!canAdvance && answered === undefined}
                onClick={advance}
              >
                <ChevronRightIcon className="size-4" />
                {position === order.length - 1 ? "Selesai" : "Seterusnya"}
              </Button>
              <Button
                variant="outline"
                className="h-11 gap-1 rounded-full sm:gap-2"
                disabled={position === order.length - 1}
                onClick={() => go(1)}
                aria-label="Langkau soalan"
              >
                <span className="hidden sm:inline">Langkau</span>
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------- subcomponents */

const QuizTab: FC<{
  active: boolean;
  icon: typeof HelpCircleIcon;
  label: string;
  onClick: () => void;
  theme: ReturnType<typeof accentTheme>;
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

const QuestionBody: FC<{
  question: QuizQuestion;
  theme: ReturnType<typeof accentTheme>;
  compact?: boolean;
  choice: number | null;
  tfChoice: boolean | null;
  text: string;
  checked: boolean;
  revealed: boolean;
  onChooseOption: (index: number) => void;
  onChooseTrueFalse: (value: boolean) => void;
  onText: (value: string) => void;
  onCheckText: () => void;
  onRevealOpenEnded: () => void;
  onSelfCheck: (value: Result) => void;
}> = ({
  question,
  theme,
  compact,
  choice,
  tfChoice,
  text,
  checked,
  revealed,
  onChooseOption,
  onChooseTrueFalse,
  onText,
  onCheckText,
  onRevealOpenEnded,
  onSelfCheck,
}) => {
  if (question.type === "multiple-choice") {
    return (
      <div className="grid gap-2">
        {question.options.map((option, index) => {
          const isAnswer = index === question.answerIndex;
          const isChosen = choice === index;
          return (
            <button
              key={index}
              type="button"
              disabled={checked}
              onClick={() => onChooseOption(index)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                checked && isAnswer
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : checked && isChosen
                    ? "border-rose-500/60 bg-rose-500/10"
                    : "border-border/60 hover:bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  checked && isAnswer
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : checked && isChosen
                      ? "border-rose-500 bg-rose-500 text-white"
                      : "border-border/60",
                )}
              >
                {checked && isAnswer ? (
                  <CheckIcon className="size-4" />
                ) : checked && isChosen ? (
                  <XIcon className="size-4" />
                ) : (
                  LETTERS[index]
                )}
              </span>
              <span className="min-w-0 flex-1">{option}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "true-false") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[true, false].map((value) => {
          const isAnswer = value === question.answer;
          const isChosen = tfChoice === value;
          return (
            <button
              key={String(value)}
              type="button"
              disabled={checked}
              onClick={() => onChooseTrueFalse(value)}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
                checked && isAnswer
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : checked && isChosen
                    ? "border-rose-500/60 bg-rose-500/10"
                    : "border-border/60 hover:bg-muted/60",
              )}
            >
              {value ? "Benar" : "Palsu"}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "fill-blank") {
    const correct = matchesFillBlank(text, question.answer);
    return (
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(event) => onText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCheckText();
              }
            }}
            disabled={checked}
            placeholder="Taip jawapan anda..."
            className="border-border/60 bg-background focus-visible:ring-ring/40 h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
          />
          {!checked && (
            <Button
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-white hover:opacity-90",
                theme.bar,
              )}
              disabled={!text.trim()}
              onClick={onCheckText}
            >
              Semak
            </Button>
          )}
        </div>
        {checked && (
          <p
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              correct
                ? "border-emerald-500/60 bg-emerald-500/10"
                : "border-rose-500/60 bg-rose-500/10",
            )}
          >
            {correct ? (
              <>
                <CheckIcon className="mr-1.5 inline size-4 text-emerald-600" />
                Betul!
              </>
            ) : (
              <>
                <XIcon className="mr-1.5 inline size-4 text-rose-600" />
                Jawapan:{" "}
                <strong>{question.answer.split("/")[0]?.trim()}</strong>
              </>
            )}
          </p>
        )}
      </div>
    );
  }

  // open-ended — self-check
  const hits = question.keywords?.length
    ? keywordHits(text, question.keywords)
    : [];
  return (
    <div className="grid gap-2">
      <textarea
        value={text}
        onChange={(event) => onText(event.target.value)}
        disabled={revealed}
        rows={compact ? 2 : 3}
        placeholder="Taip jawapan anda..."
        className="border-border/60 bg-background focus-visible:ring-ring/40 w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2"
      />
      {!revealed ? (
        <Button
          className={cn(
            "h-10 justify-self-start rounded-full px-4 text-white hover:opacity-90",
            theme.bar,
          )}
          disabled={!text.trim()}
          onClick={onRevealOpenEnded}
        >
          Semak jawapan model
        </Button>
      ) : (
        <div className="grid gap-2">
          <div className="border-border/60 bg-muted/40 rounded-xl border px-3 py-2 text-sm">
            <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wide uppercase">
              Jawapan model
            </p>
            <p>{question.modelAnswer}</p>
            {question.keywords?.length ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Kata kunci:{" "}
                {question.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className={cn(
                      "mr-1 inline-block rounded-full px-1.5 py-0.5",
                      hits.includes(keyword)
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted",
                    )}
                  >
                    {keyword}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          {!checked ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-full"
                onClick={() => onSelfCheck("wrong")}
              >
                <RotateCcwIcon className="size-4" />
                Masih Belajar
              </Button>
              <Button
                className={cn(
                  "h-10 gap-2 rounded-full text-white hover:opacity-90",
                  theme.bar,
                )}
                onClick={() => onSelfCheck("correct")}
              >
                <CheckIcon className="size-4" />
                Faham
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
