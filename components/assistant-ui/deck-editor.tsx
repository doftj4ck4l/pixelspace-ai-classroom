"use client";

import { useState, type FC } from "react";
import {
  ArrowLeftIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FLASHCARD_ACCENTS,
  FLASHCARD_TYPES,
  type FlashcardSpec,
} from "@/lib/flashcards/spec";

/**
 * Full-page manual deck editor: every card is editable in place — front, back,
 * hint, tags, type — plus deck meta (title, subject, accent). Saving PATCHes
 * the artifact spec; the server remaps mastery for unchanged cards.
 */

type EditorCard = {
  uid: string;
  front: string;
  back: string;
  hint: string;
  tags: string;
  type: string;
};

const toEditorCards = (spec: FlashcardSpec): EditorCard[] =>
  spec.cards.map((card) => ({
    uid: crypto.randomUUID(),
    front: card.front,
    back: card.back,
    hint: card.hint ?? "",
    tags: (card.tags ?? []).join(", "),
    type: card.type ?? "",
  }));

const blankCard = (): EditorCard => ({
  uid: crypto.randomUUID(),
  front: "",
  back: "",
  hint: "",
  tags: "",
  type: "",
});

const ACCENT_DOT: Record<string, string> = {
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
};

export const DeckEditor: FC<{
  artifactId: string;
  initialSpec: FlashcardSpec;
  onClose: () => void;
  onSaved: (spec: FlashcardSpec) => void;
}> = ({ artifactId, initialSpec, onClose, onSaved }) => {
  const [title, setTitle] = useState(initialSpec.title ?? "");
  const [subject, setSubject] = useState(initialSpec.subject ?? "");
  const [accent, setAccent] = useState(initialSpec.accent ?? "teal");
  const [cards, setCards] = useState<EditorCard[]>(() =>
    toEditorCards(initialSpec),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (uid: string, patch: Partial<EditorCard>) =>
    setCards((prev) =>
      prev.map((card) => (card.uid === uid ? { ...card, ...patch } : card)),
    );

  const move = (index: number, delta: number) =>
    setCards((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  const duplicate = (index: number) =>
    setCards((prev) => {
      const source = prev[index]!;
      const copy = { ...source, uid: crypto.randomUUID() };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });

  const remove = (index: number) =>
    setCards((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, at) => at !== index),
    );

  const buildSpec = (): FlashcardSpec | { error: string } => {
    const built = cards.map((card) => {
      const tags = card.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      return {
        front: card.front.trim(),
        back: card.back.trim(),
        hint: card.hint.trim(),
        tags,
        type: card.type,
      };
    });
    for (const [index, card] of built.entries()) {
      if (!card.front) return { error: `Card ${index + 1} needs a front.` };
      if (card.front.length > 140)
        return { error: `Card ${index + 1} front is over 140 characters.` };
      if (!card.back) return { error: `Card ${index + 1} needs a back.` };
      if (card.back.length > 400)
        return { error: `Card ${index + 1} back is over 400 characters.` };
      if (card.hint.length > 200)
        return { error: `Card ${index + 1} hint is over 200 characters.` };
      if (card.tags.length > 3)
        return { error: `Card ${index + 1} supports up to 3 tags.` };
    }
    return {
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(subject.trim() ? { subject: subject.trim() } : {}),
      accent,
      cards: built.map((card) => ({
        front: card.front,
        back: card.back,
        ...(card.hint ? { hint: card.hint } : {}),
        ...(card.tags.length ? { tags: card.tags } : {}),
        ...(card.type
          ? { type: card.type as FlashcardSpec["cards"][number]["type"] }
          : {}),
      })),
    };
  };

  const save = async () => {
    const spec = buildSpec();
    if ("error" in spec) {
      setError(spec.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pi/artifacts/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Could not save the deck. Try again.");
        return;
      }
      onSaved(spec);
    } catch {
      setError("Could not save the deck. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <header className="border-border/60 bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            onClick={onClose}
            aria-label="Keluar editor"
          >
            <ArrowLeftIcon className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Edit deck</p>
            <p className="text-muted-foreground truncate text-xs">
              {cards.length} kad · sunting terus setiap kad
            </p>
          </div>
          <Button
            className="h-9 shrink-0 gap-1.5 rounded-full px-4"
            onClick={() => void save()}
            disabled={saving}
          >
            <CheckIcon className="size-4" />
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        {error && (
          <p className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-xl border px-3 py-2 text-sm">
            {error}
          </p>
        )}

        {/* Deck meta */}
        <div className="border-border/60 bg-card mb-6 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Tajuk
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Kad Imbas"
              className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Subjek
            </span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Sains Tingkatan 2 · Bab 5"
              className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
            />
          </label>
          <div className="grid gap-1.5 sm:col-span-2">
            <span className="text-muted-foreground text-xs font-medium">
              Warna
            </span>
            <div className="flex items-center gap-2">
              {FLASHCARD_ACCENTS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={() => setAccent(color)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-transform",
                    accent === color && "ring-ring ring-2 ring-offset-2",
                  )}
                >
                  <span
                    className={cn("size-5 rounded-full", ACCENT_DOT[color])}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-3">
          {cards.map((card, index) => (
            <div
              key={card.uid}
              className="border-border/60 bg-card rounded-2xl border p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="bg-muted flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
                  {index + 1}
                </span>
                <div className="ml-auto flex items-center gap-0.5">
                  <IconButton
                    label="Naik"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUpIcon className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Turun"
                    disabled={index === cards.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDownIcon className="size-4" />
                  </IconButton>
                  <IconButton label="Salin" onClick={() => duplicate(index)}>
                    <CopyIcon className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Padam"
                    disabled={cards.length <= 1}
                    onClick={() => remove(index)}
                    danger
                  >
                    <Trash2Icon className="size-4" />
                  </IconButton>
                </div>
              </div>

              <div className="grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-muted-foreground flex items-center justify-between text-xs font-medium">
                    Hadapan (soalan)
                    <span
                      className={cn(
                        "tabular-nums",
                        card.front.length > 140 && "text-destructive",
                      )}
                    >
                      {card.front.length}/140
                    </span>
                  </span>
                  <Textarea
                    value={card.front}
                    onChange={(event) =>
                      update(card.uid, { front: event.target.value })
                    }
                    rows={2}
                    className="min-h-16 resize-y text-sm"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-muted-foreground flex items-center justify-between text-xs font-medium">
                    Belakang (jawapan)
                    <span
                      className={cn(
                        "tabular-nums",
                        card.back.length > 400 && "text-destructive",
                      )}
                    >
                      {card.back.length}/400
                    </span>
                  </span>
                  <Textarea
                    value={card.back}
                    onChange={(event) =>
                      update(card.uid, { back: event.target.value })
                    }
                    rows={3}
                    className="min-h-20 resize-y text-sm"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1.5">
                    <span className="text-muted-foreground text-xs font-medium">
                      Petunjuk (pilihan)
                    </span>
                    <input
                      value={card.hint}
                      onChange={(event) =>
                        update(card.uid, { hint: event.target.value })
                      }
                      className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-muted-foreground text-xs font-medium">
                      Tag (pisah dengan koma, maks 3)
                    </span>
                    <input
                      value={card.tags}
                      onChange={(event) =>
                        update(card.uid, { tags: event.target.value })
                      }
                      className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-muted-foreground text-xs font-medium">
                      Jenis
                    </span>
                    <select
                      value={card.type}
                      onChange={(event) =>
                        update(card.uid, { type: event.target.value })
                      }
                      className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
                    >
                      <option value="">—</option>
                      {FLASHCARD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="h-10 gap-1.5 rounded-full px-4"
            onClick={() => setCards((prev) => [...prev, blankCard()])}
          >
            <PlusIcon className="size-4" />
            Tambah kad
          </Button>
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <SparklesIcon className="size-3.5" />
            Kad yang tidak diubah kekalkan status dikuasai
          </p>
        </div>
      </div>
    </div>
  );
};

const IconButton: FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, disabled, danger, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "flex size-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30",
      danger
        ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    {children}
  </button>
);
