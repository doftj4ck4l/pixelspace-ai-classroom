"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenIcon, Loader2Icon, SearchIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { levelLabel } from "@/lib/textbooks/levels";

type Textbook = {
  id: number;
  title: string;
  subject: string;
  level: string;
  levelOrder: number;
  pages: number | null;
  embedded: boolean;
  spaces: number;
  coverUrl: string;
  fileUrl: string;
};

const LEVEL_TABS: { value: number; label: string }[] = [
  { value: 0, label: "Semua" },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `Tahun ${n}` })),
  ...[7, 8, 9, 10, 11].map((n) => ({ value: n, label: `Tingkatan ${n - 6}` })),
];

/** Admin view of the textbook library: browse, usage and AI-readiness. */
export const TextbooksTab = () => {
  const [rows, setRows] = useState<Textbook[] | null>(null);
  const [level, setLevel] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/textbooks")
      .then((res) => res.json())
      .then((data: { textbooks?: Textbook[] }) => setRows(data.textbooks ?? []))
      .catch(() => {
        setRows([]);
        setError("Gagal memuatkan senarai buku teks.");
      });
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((row) => level === 0 || row.levelOrder === level)
      .filter(
        (row) =>
          !needle ||
          row.title.toLowerCase().includes(needle) ||
          row.subject.toLowerCase().includes(needle),
      );
  }, [rows, level, query]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Buku teks</h2>
          <p className="text-muted-foreground text-sm">
            Koleksi buku teks yang dipasang pada platform — ruang guru boleh
            menggunakan buku ini sebagai sumber.
          </p>
        </div>
        <span className="text-muted-foreground text-xs">
          {rows === null ? "…" : `${visible.length} buku`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="scrollbar-subtle -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          {LEVEL_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setLevel(tab.value)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                level === tab.value
                  ? "bg-foreground text-background border-transparent"
                  : "text-muted-foreground hover:text-foreground border-border",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="border-border/60 bg-background focus-within:ring-ring/40 flex h-8 min-w-48 flex-1 items-center gap-2 rounded-lg border px-2.5 focus-within:ring-2">
          <SearchIcon className="text-muted-foreground size-3.5 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="bg-card overflow-hidden rounded-xl border">
        {rows === null ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Memuatkan…
          </div>
        ) : visible.length === 0 ? (
          <div className="text-muted-foreground px-4 py-10 text-center text-sm">
            Tiada buku dijumpai.
          </div>
        ) : (
          <div className="divide-y">
            {visible.map((book) => (
              <div
                key={book.id}
                className="hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5"
              >
                <span className="bg-muted flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={book.coverUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <BookOpenIcon className="text-muted-foreground size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{book.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {book.subject} · {levelLabel(book.levelOrder)}
                    {book.pages ? ` · ${book.pages} ms` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "hidden shrink-0 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium sm:inline",
                    book.embedded
                      ? "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                  )}
                >
                  {book.embedded ? "AI sedia" : "Belum diproses"}
                </span>
                <span className="text-muted-foreground hidden shrink-0 text-xs md:inline">
                  {book.spaces} ruang
                </span>
                <a
                  href={book.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground hover:bg-muted shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors"
                >
                  Buka
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
