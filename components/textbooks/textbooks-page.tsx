"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import { BookOpenIcon, Loader2Icon, SearchIcon } from "@/components/icons";
import { FilterSelect } from "@/components/ui/filter-select";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type Textbook = {
  id: number;
  title: string;
  subject: string;
  level: string;
  levelOrder: number;
  school: string | null;
  pages: number | null;
  embedded: boolean;
  spaces: number;
  coverUrl: string;
  fileUrl: string;
};

const LEVEL_TABS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const Cover: FC<{ book: Textbook; className?: string }> = ({
  book,
  className,
}) => {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-[#8fd9c8]/50 via-teal-100/40 to-emerald-50/30 dark:from-[#0f4f4a]/50 dark:via-teal-950/40 dark:to-emerald-950/30",
          className,
        )}
      >
        <BookOpenIcon className="text-foreground/40 size-8" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={book.coverUrl}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={cn("bg-muted object-cover", className)}
    />
  );
};

/** The textbook library — browse by level and subject, open any book. */
export const TextbooksPage: FC = () => {
  const t = useT();
  const [rows, setRows] = useState<Textbook[] | null>(null);
  const [level, setLevel] = useState(0);
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");

  const levelText = (order: number) =>
    order <= 6
      ? t("books.level.tahun", { n: order })
      : t("books.level.tingkatan", { n: order - 6 });

  useEffect(() => {
    fetch("/api/textbooks")
      .then((res) => res.json())
      .then((data: { textbooks?: Textbook[] }) => setRows(data.textbooks ?? []))
      .catch(() => setRows([]));
  }, []);

  const byLevel = useMemo(
    () => (rows ?? []).filter((row) => level === 0 || row.levelOrder === level),
    [rows, level],
  );

  const subjects = useMemo(() => {
    const seen = new Map<string, number>();
    for (const row of byLevel) {
      seen.set(row.subject, (seen.get(row.subject) ?? 0) + 1);
    }
    return [...seen.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: `${value} (${count})` }));
  }, [byLevel]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return byLevel
      .filter((row) => subject === "all" || row.subject === subject)
      .filter(
        (row) =>
          !needle ||
          row.title.toLowerCase().includes(needle) ||
          row.subject.toLowerCase().includes(needle),
      );
  }, [byLevel, subject, query]);

  return (
    <main className="scrollbar-subtle h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <header className="mb-5 flex items-start gap-3">
          <span className="bg-muted/60 text-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
            <BookOpenIcon className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {t("books.title")}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("books.subtitle")}
            </p>
          </div>
        </header>

        <div className="scrollbar-subtle -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          {LEVEL_TABS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setLevel(value);
                setSubject("all");
              }}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                level === value
                  ? "bg-foreground text-background border-transparent"
                  : "text-muted-foreground hover:text-foreground border-border",
              )}
            >
              {value === 0 ? t("books.all") : levelText(value)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FilterSelect
            value={subject}
            onValueChange={setSubject}
            ariaLabel="Subjek"
            options={[
              { value: "all", label: t("books.allSubjects") },
              ...subjects,
            ]}
            className="h-9 rounded-lg"
          />
          <label className="border-border/60 bg-background focus-within:ring-ring/40 flex h-9 min-w-56 flex-1 items-center gap-2 rounded-lg border px-3 focus-within:ring-2">
            <SearchIcon className="text-muted-foreground size-4 shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("books.search")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <span className="text-muted-foreground text-xs">
            {t("books.count", { n: visible.length })}
          </span>
        </div>

        {rows === null ? (
          <div className="text-muted-foreground mt-10 flex items-center justify-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            {t("books.loading")}
          </div>
        ) : visible.length === 0 ? (
          <div className="border-border/60 text-muted-foreground mt-6 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
            {t("books.empty")}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => window.open(book.fileUrl, "_blank")}
                className="border-border/60 bg-card hover:border-foreground/20 group flex flex-col overflow-hidden rounded-2xl border text-left transition-colors"
              >
                <Cover book={book} className="aspect-[3/4] w-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2.5">
                  <span className="line-clamp-2 text-sm font-medium">
                    {book.title}
                  </span>
                  <span className="text-muted-foreground mt-auto truncate text-xs">
                    {book.subject} · {levelText(book.levelOrder)}
                    {book.pages
                      ? ` · ${t("books.pages", { n: book.pages })}`
                      : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
