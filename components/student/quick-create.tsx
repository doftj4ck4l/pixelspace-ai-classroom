"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAui } from "@assistant-ui/react";
import { Loader2Icon, SparklesIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuickKind = "flashcards" | "quizzes" | "mindmaps" | "notes";

type QuickCard = {
  kind: QuickKind;
  label: string;
  blurb: string;
  emoji: string;
  cover: string;
  ring: string;
  prompt: (topic: string) => string;
};

const QUICK_CARDS: QuickCard[] = [
  {
    kind: "flashcards",
    label: "Kad Imbas",
    blurb: "Hafal fakta dengan kad pintar",
    emoji: "🃏",
    cover:
      "from-amber-200/80 via-orange-100/70 to-yellow-100/50 dark:from-amber-950/70 dark:via-orange-950/50 dark:to-yellow-950/40",
    ring: "ring-amber-300/50 dark:ring-amber-800/50",
    prompt: (topic) =>
      `Buat kad imbas tentang ${topic}. Gunakan render_ui flashcards supaya kad boleh terus dilihat dan diacak. Gunakan bahasa Malaysia, boleh campur istilah Inggeris.`,
  },
  {
    kind: "quizzes",
    label: "Kuiz",
    blurb: "Uji kefahaman dengan soalan",
    emoji: "❓",
    cover:
      "from-teal-200/80 via-emerald-100/70 to-cyan-100/50 dark:from-teal-950/70 dark:via-emerald-950/50 dark:to-cyan-950/40",
    ring: "ring-teal-300/50 dark:ring-teal-800/50",
    prompt: (topic) =>
      `Buat kuiz tentang ${topic}. Gunakan render_ui quizzes — campurkan jenis soalan (pilihan aneka, benar/palsu, isi tempat kosong, soalan terbuka) supaya kuiz ini menguji kefahaman. Gunakan bahasa Malaysia, boleh campur istilah Inggeris.`,
  },
  {
    kind: "mindmaps",
    label: "Peta Pembelajaran",
    blurb: "Terokai konsep langkah demi langkah",
    emoji: "🗺️",
    cover:
      "from-violet-200/80 via-purple-100/70 to-fuchsia-100/50 dark:from-violet-950/70 dark:via-purple-950/50 dark:to-fuchsia-950/40",
    ring: "ring-violet-300/50 dark:ring-violet-800/50",
    prompt: (topic) =>
      `Buat peta pembelajaran tentang ${topic}. Gunakan render_ui mindmaps — setiap nod ada ringkasan ringkas, tambah cabaran (challenges) pada nod konsep utama, dan tandakan nod yang melangkaui sumber dengan aiAdded. Gunakan bahasa Malaysia, boleh campur istilah Inggeris.`,
  },
  {
    kind: "notes",
    label: "Nota",
    blurb: "Nota kajian berstruktur dan kemas",
    emoji: "📝",
    cover:
      "from-green-200/80 via-lime-100/70 to-emerald-100/50 dark:from-green-950/70 dark:via-lime-950/50 dark:to-emerald-950/40",
    ring: "ring-green-300/50 dark:ring-green-800/50",
    prompt: (topic) =>
      `Buat nota kajian tentang ${topic}. Gunakan render_ui notes — bahagian yang jelas, isi ringkas, bulet poin utama, dan senarai semak untuk ulang kaji. Gunakan bahasa Malaysia, boleh campur istilah Inggeris.`,
  },
];

export const QuickCreate = ({
  onGeneratingChange,
}: {
  onGeneratingChange: (value: boolean) => void;
}) => {
  const aui = useAui();
  const router = useRouter();
  const [active, setActive] = useState<QuickCard | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const open = (card: QuickCard) => {
    setActive(card);
    setTopic("");
  };

  const start = async () => {
    if (!active || !topic.trim() || busy) return;
    setBusy(true);
    onGeneratingChange(true);
    try {
      const { id } = (await fetch("/api/pi/threads", {
        method: "POST",
      }).then((res) => res.json())) as { id: string };
      await aui.threads.switchToThread(id);
      aui.composer.setText(active.prompt(topic.trim()));
      aui.composer.send();
      setActive(null);
      setTopic("");
      router.push("/chat");
    } catch {
      // the dialog stays open so the student can retry
    } finally {
      setBusy(false);
      onGeneratingChange(false);
    }
  };

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <SparklesIcon className="size-4 text-amber-500" />
            Cipta pantas
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Pilih satu, taip topik anda, dan biar AI mula bekerja.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_CARDS.map((card) => (
          <button
            key={card.kind}
            type="button"
            onClick={() => open(card)}
            className={cn(
              "group border-border/60 bg-card relative overflow-hidden rounded-3xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              "focus-visible:ring-ring/50",
            )}
          >
            <div
              aria-hidden="true"
              className={cn(
                "bg-gradient-to-br",
                card.cover,
                "pointer-events-none absolute inset-0 opacity-70 transition-opacity group-hover:opacity-100",
              )}
            />
            <div className="relative flex flex-col gap-2">
              <span
                className={cn(
                  "ring-border/40 flex size-12 items-center justify-center rounded-2xl bg-white/70 text-2xl shadow-sm ring-1 dark:bg-black/30",
                  card.ring,
                )}
              >
                {card.emoji}
              </span>
              <span className="text-sm font-semibold sm:text-base">
                {card.label}
              </span>
              <span className="text-muted-foreground text-xs sm:text-[13px]">
                {card.blurb}
              </span>
            </div>
          </button>
        ))}
      </div>

      <Dialog
        open={active !== null}
        onOpenChange={(next) => {
          if (!next && !busy) setActive(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{active?.emoji}</span>
              Buat {active?.label}
            </DialogTitle>
            <DialogDescription>
              Apa topiknya? AI akan menyediakannya dalam ruang sembang.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void start();
            }}
            className="flex flex-col gap-3"
          >
            <Input
              autoFocus
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder='Contoh: "Fotosintesis, Tingkatan 3 Sains"'
              className="h-10 text-base"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setActive(null)}
                disabled={busy}
              >
                Batal
              </Button>
              <Button type="submit" size="lg" disabled={!topic.trim() || busy}>
                {busy ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
                Jana dengan AI
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};
