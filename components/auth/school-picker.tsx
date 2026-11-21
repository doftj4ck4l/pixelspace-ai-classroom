"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  Loader2Icon,
  MapPinIcon,
  SchoolIcon,
  SearchIcon,
} from "@/components/icons";
import { cn } from "cn";

export type SchoolOption = {
  id: string;
  name: string;
  type: string;
  state: string | null;
  district: string | null;
};

export const schoolTypeLabel = (type: string) =>
  type === "secondary" ? "Sekolah Menengah" : "Sekolah Kebangsaan";

export const schoolLocation = (school: SchoolOption) =>
  [school.district, school.state].filter(Boolean).join(", ");

type Tone = "clean" | "fun";

const TONE: Record<
  Tone,
  {
    field: string;
    icon: string;
    selected: string;
    selectedIcon: string;
    change: string;
    list: string;
    option: string;
    optionActive: string;
    action: string;
    chip: string;
  }
> = {
  clean: {
    field:
      "h-10 w-full rounded-lg border border-input bg-transparent pr-9 pl-10 text-sm outline-none focus:border-[#1b8a7f] dark:bg-input/30",
    icon: "text-muted-foreground",
    selected:
      "border-[#bfe9e2] bg-[#f4fbfa] dark:border-[#1d5b55] dark:bg-[#12312e]",
    selectedIcon:
      "bg-[#E7F6F4] text-[#177e89] dark:bg-[#12312e] dark:text-[#8fd9c8]",
    change: "text-[#177e89] hover:text-[#00574a] dark:text-[#8fd9c8]",
    list: "rounded-xl border-border bg-card shadow-lg",
    option: "rounded-lg",
    optionActive: "bg-[#f2fbf9] dark:bg-[#12312e]",
    action: "text-[#177e89] dark:text-[#8fd9c8]",
    chip: "bg-[#E7F6F4] text-[#00786a] dark:bg-[#12312e] dark:text-[#8fd9c8]",
  },
  fun: {
    field:
      "h-12 w-full rounded-2xl border-2 border-violet-200 bg-violet-50/60 pr-10 pl-11 text-base outline-none focus:border-violet-400 dark:border-violet-800 dark:bg-violet-950/40",
    icon: "text-violet-400",
    selected:
      "border-violet-200 bg-gradient-to-r from-violet-50 to-teal-50 dark:border-violet-800 dark:from-violet-950/40 dark:to-teal-950/40",
    selectedIcon:
      "bg-violet-100 text-violet-600 dark:bg-violet-900/60 dark:text-violet-200",
    change: "text-violet-600 hover:text-violet-800 dark:text-violet-300",
    list: "rounded-2xl border-violet-200 bg-white shadow-xl shadow-violet-200/50 dark:border-violet-800 dark:bg-slate-900 dark:shadow-none",
    option: "rounded-xl",
    optionActive: "bg-violet-50 dark:bg-violet-950/40",
    action: "text-violet-600 dark:text-violet-300",
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200",
  },
};

export const SchoolPicker = ({
  selected,
  onSelect,
  disabled,
  tone = "clean",
}: {
  selected: SchoolOption | null;
  onSelect: (school: SchoolOption | null) => void;
  disabled?: boolean;
  tone?: Tone;
}) => {
  const styles = TONE[tone];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SchoolOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestState, setRequestState] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [requestStatus, setRequestStatus] = useState<
    "idle" | "sending" | "sent"
  >("idle");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/schools?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as { schools?: SchoolOption[] };
        setResults(data.schools ?? []);
        setActive(0);
      } catch {
        // aborted or offline — keep the previous results
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const choose = (school: SchoolOption) => {
    onSelect(school);
    setOpen(false);
    setQuery("");
    setRequestOpen(false);
    setRequestStatus("idle");
  };

  const openRequest = () => {
    setRequestName(query.trim());
    setRequestOpen(true);
  };

  const submitRequest = async () => {
    if (requestName.trim().length < 3) return;
    setRequestStatus("sending");
    await fetch("/api/school-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolName: requestName.trim(),
        state: requestState.trim() || undefined,
        note: requestNote.trim() || undefined,
      }),
    }).catch(() => null);
    setRequestStatus("sent");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (event.key === "ArrowDown") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) =>
        Math.min(index + 1, Math.max(results.length - 1, 0)),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results[active]) choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  if (selected) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3",
          styles.selected,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              styles.selectedIcon,
            )}
          >
            <SchoolIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{selected.name}</p>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
              {schoolTypeLabel(selected.type)}
              <span aria-hidden="true">·</span>
              <MapPinIcon className="size-3" aria-hidden="true" />
              {schoolLocation(selected) || "Malaysia"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          disabled={disabled}
          className={cn(
            "shrink-0 text-xs font-semibold underline underline-offset-2",
            styles.change,
          )}
        >
          Tukar
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <SearchIcon
          className={cn(
            "pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2",
            styles.icon,
          )}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setRequestOpen(false);
            setRequestStatus("idle");
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls="school-listbox"
          aria-autocomplete="list"
          aria-label="Cari sekolah anda"
          autoComplete="off"
          placeholder="Taip nama sekolah anda…"
          className={styles.field}
        />
        {loading ? (
          <Loader2Icon
            className={cn(
              "absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin",
              styles.icon,
            )}
            aria-hidden="true"
          />
        ) : (
          <ChevronDownIcon
            className={cn(
              "pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2",
              styles.icon,
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {open && (
        <div
          className={cn(
            "absolute z-20 mt-1.5 w-full overflow-hidden border",
            styles.list,
          )}
        >
          <ul
            id="school-listbox"
            role="listbox"
            aria-label="Hasil carian sekolah"
            className="max-h-64 overflow-y-auto p-1.5"
          >
            {results.map((school, index) => (
              <li
                key={school.id}
                role="option"
                aria-selected={index === active}
              >
                <button
                  type="button"
                  onClick={() => choose(school)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    styles.option,
                    index === active && styles.optionActive,
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg",
                      styles.selectedIcon,
                    )}
                  >
                    <SchoolIcon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {school.name}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {schoolTypeLabel(school.type)}
                      {schoolLocation(school)
                        ? ` · ${schoolLocation(school)}`
                        : ""}
                    </span>
                  </span>
                  {index === active && (
                    <CheckIcon
                      className="size-4 shrink-0 text-teal-600"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            ))}
            {!loading && results.length === 0 && (
              <li className="px-3 py-3">
                <p className="text-sm font-semibold">Tiada sekolah sepadan</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Semak ejaan, atau minta sekolah anda ditambah.
                </p>
              </li>
            )}
          </ul>

          <div className="border-t border-dashed p-1.5">
            {requestStatus === "sent" ? (
              <p
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold",
                  styles.chip,
                )}
              >
                Permintaan diterima ✓ Sekolah akan ditambah tidak lama lagi.
              </p>
            ) : requestOpen ? (
              <div className="flex flex-col gap-2 p-1.5">
                <p className="text-xs font-semibold">
                  Sekolah saya tiada dalam senarai
                </p>
                <input
                  value={requestName}
                  onChange={(event) => setRequestName(event.target.value)}
                  placeholder="Nama sekolah (cth. SK Taman Desa)"
                  className="border-input bg-background focus:border-primary h-9 w-full rounded-lg border px-3 text-xs outline-none"
                />
                <input
                  value={requestState}
                  onChange={(event) => setRequestState(event.target.value)}
                  placeholder="Negeri (cth. Johor)"
                  className="border-input bg-background focus:border-primary h-9 w-full rounded-lg border px-3 text-xs outline-none"
                />
                <textarea
                  value={requestNote}
                  onChange={(event) => setRequestNote(event.target.value)}
                  placeholder="Catatan tambahan (pilihan)"
                  rows={2}
                  className="border-input bg-background focus:border-primary w-full resize-none rounded-lg border px-3 py-2 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={submitRequest}
                  disabled={
                    requestStatus === "sending" || requestName.trim().length < 3
                  }
                  className="bg-foreground text-background inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
                >
                  {requestStatus === "sending" && (
                    <Loader2Icon
                      className="size-3 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  Hantar permintaan
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openRequest}
                className={cn(
                  "w-full px-3 py-2 text-left text-xs font-semibold underline underline-offset-2",
                  styles.action,
                )}
              >
                Sekolah saya tiada dalam senarai
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
