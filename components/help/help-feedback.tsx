"use client";

import { useCallback, useEffect, useRef, useState, type FC } from "react";
import {
  CheckCircle2Icon,
  HelpCircleIcon,
  Loader2Icon,
  PaperclipIcon,
  PictureAsPdfIcon,
  SendIcon,
  XIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FeedbackAttachment = {
  name: string;
  mime: string;
  size: number;
  url: string;
};

type FeedbackRow = {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  attachments: FeedbackAttachment[];
};

const ACCEPT =
  "image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,application/pdf";
const ALLOWED_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf"];
const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

const STATUS_THEME: Record<string, { label: string; className: string }> = {
  baru: {
    label: "Baru",
    className:
      "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  dibaca: {
    label: "Dibaca",
    className: "border-sky-600/20 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  selesai: {
    label: "Selesai",
    className:
      "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
};

const ROLE_LABELS: Record<string, string> = {
  teacher: "Guru",
  kpm: "KPM",
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const StatusChip = ({ status }: { status: string }) => {
  const theme = STATUS_THEME[status] ?? STATUS_THEME.baru!;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        theme.className,
      )}
    >
      {theme.label}
    </span>
  );
};

const AttachmentChip: FC<{ attachment: FeedbackAttachment }> = ({
  attachment,
}) => (
  <a
    href={attachment.url}
    target="_blank"
    rel="noreferrer"
    className="border-border/60 hover:bg-muted/50 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
  >
    {attachment.mime === "application/pdf" ? (
      <PictureAsPdfIcon className="size-3.5 text-red-500" />
    ) : (
      <span className="size-3.5 shrink-0 overflow-hidden rounded-[4px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="size-full object-cover"
        />
      </span>
    )}
    <span className="max-w-40 truncate">{attachment.name}</span>
    <span className="text-muted-foreground">{formatSize(attachment.size)}</span>
  </a>
);

/**
 * Help & support for teachers and KPM: a feedback form to the admins.
 * Identity and school are captured from the session — the user only writes
 * the subject, the message and (optionally) attaches images or a PDF.
 */
export const HelpFeedback: FC<{
  name: string;
  role: string;
  schoolName: string | null;
}> = ({ name, role, schoolName }) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/feedback");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { feedback?: FeedbackRow[] };
      setRows(data.feedback ?? []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addFiles = (picked: FileList | null) => {
    if (!picked) return;
    setError(null);
    const next = [...files];
    for (const file of Array.from(picked)) {
      const ext = (file.name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        setError(`Format .${ext} tidak disokong — imej atau PDF sahaja.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} melebihi 10 MB.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setError(`Maksimum ${MAX_FILES} lampiran sahaja.`);
        break;
      }
      if (
        next.some(
          (existing) =>
            existing.name === file.name && existing.size === file.size,
        )
      ) {
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage || sending) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const form = new FormData();
      form.set("subject", trimmedSubject);
      form.set("message", trimmedMessage);
      for (const file of files) form.append("files", file);
      const res = await fetch("/api/feedback", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Gagal menghantar maklum balas.");
      }
      setSubject("");
      setMessage("");
      setFiles([]);
      setSent(true);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ralat berlaku. Cuba lagi.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="scrollbar-subtle h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        <header className="mb-6 flex items-start gap-3">
          <span className="bg-muted/60 text-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
            <HelpCircleIcon className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Help & support
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Hantar maklum balas atau masalah anda kepada pentadbir — kami akan
              semak dan maklumkan semula melalui status di bawah.
            </p>
          </div>
        </header>

        <section className="border-border/60 bg-muted/20 rounded-2xl border p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Dihantar sebagai:</span>
            <span className="font-medium">{name}</span>
            <span className="text-muted-foreground">
              · {ROLE_LABELS[role] ?? role}
              {schoolName ? ` · ${schoolName}` : ""}
            </span>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Subjek</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={120}
                placeholder="cth. Masalah memuat naik sumber"
                className="border-border/60 bg-background focus-visible:ring-ring/40 h-10 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Mesej</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={4000}
                rows={5}
                placeholder="Terangkan maklum balas atau masalah anda…"
                className="border-border/60 bg-background focus-visible:ring-ring/40 min-h-28 resize-y rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              />
            </label>

            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {files.map((file) => (
                  <span
                    key={`${file.name}-${file.size}`}
                    className="border-border/60 bg-background flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                  >
                    {file.type === "application/pdf" ? (
                      <PictureAsPdfIcon className="size-3.5 text-red-500" />
                    ) : (
                      <PaperclipIcon className="size-3.5" />
                    )}
                    <span className="max-w-40 truncate">{file.name}</span>
                    <span className="text-muted-foreground">
                      {formatSize(file.size)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Buang ${file.name}`}
                      onClick={() =>
                        setFiles((prev) => prev.filter((f) => f !== file))
                      }
                      className="hover:text-foreground text-muted-foreground -me-0.5 rounded p-0.5 transition-colors"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </span>
                ))}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(event) => addFiles(event.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={files.length >= MAX_FILES}
                >
                  <PaperclipIcon className="size-4" />
                  Lampirkan fail
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Imej (PNG, JPG, JPEG, GIF, WebP, SVG) atau PDF · maksimum 10 MB
                setiap fail · sehingga {MAX_FILES} fail.
              </p>
            </div>

            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            {sent ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-4" />
                Maklum balas anda telah dihantar kepada pentadbir.
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                className="gap-2"
                disabled={sending || !subject.trim() || !message.trim()}
                onClick={() => void submit()}
              >
                {sending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
                Hantar maklum balas
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold">Penghantaran anda</h2>
          <div className="mt-3 grid gap-2.5">
            {rows === null ? (
              <div className="border-border/60 flex items-center gap-2 rounded-2xl border px-4 py-6 text-sm">
                <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
                <span className="text-muted-foreground">Memuatkan…</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="border-border/60 text-muted-foreground rounded-2xl border border-dashed px-4 py-6 text-center text-sm">
                Belum ada penghantaran. Maklum balas anda akan muncul di sini.
              </div>
            ) : (
              rows.map((row) => (
                <article
                  key={row.id}
                  className="border-border/60 bg-card rounded-2xl border px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {row.subject}
                    </span>
                    <StatusChip status={row.status} />
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatDate(row.createdAt)}
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
                    {row.message}
                  </p>
                  {row.attachments.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {row.attachments.map((attachment) => (
                        <AttachmentChip
                          key={`${row.id}-${attachment.url}`}
                          attachment={attachment}
                        />
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
};
