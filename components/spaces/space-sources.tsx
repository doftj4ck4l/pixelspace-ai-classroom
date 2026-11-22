"use client";

import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { BookOpenIcon, Loader2Icon, PlusIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { levelOrderFor } from "@/lib/textbooks/levels";

/**
 * The sources of one space: the auto-attached textbook (all its chapters) and
 * the teacher's own uploads. "Hasilkan bahan" opens a chat grounded in these.
 */

type SourceRow = {
  id: string;
  kind: "textbook" | "upload";
  refId: string;
  title: string;
  subject?: string | null;
  ext?: string | null;
};

type Textbook = {
  id: number;
  subject: string;
  levelOrder: number;
};

type Upload = { id: string; title: string; ext: string };

export const SpaceSources: FC<{ spaceId: string; level: string }> = ({
  spaceId,
  level,
}) => {
  const t = useT();
  const [rows, setRows] = useState<SourceRow[] | null>(null);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [picker, setPicker] = useState<"textbook" | "upload" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = (await fetch(`/api/spaces/${spaceId}/sources`).then((res) =>
        res.json(),
      )) as { sources?: SourceRow[] };
      setRows(data.sources ?? []);
    } catch {
      setRows([]);
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const levelOrder = levelOrderFor(level);

  const openTextbookPicker = async () => {
    setPicker("textbook");
    if (textbooks.length === 0) {
      const data = (await fetch("/api/textbooks")
        .then((res) => res.json())
        .catch(() => ({ textbooks: [] }))) as { textbooks?: Textbook[] };
      setTextbooks(data.textbooks ?? []);
    }
  };

  const openUploadPicker = async () => {
    setPicker("upload");
    if (uploads.length === 0) {
      const data = (await fetch("/api/sources")
        .then((res) => res.json())
        .catch(() => ({ sources: [] }))) as { sources?: Upload[] };
      setUploads(data.sources ?? []);
    }
  };

  const textbookGroups = useMemo(() => {
    const groups = new Map<string, { subject: string; refIds: string[] }>();
    for (const row of rows ?? []) {
      if (row.kind !== "textbook") continue;
      const subject = row.subject ?? row.title;
      const group = groups.get(subject) ?? { subject, refIds: [] };
      group.refIds.push(row.refId);
      groups.set(subject, group);
    }
    return [...groups.values()];
  }, [rows]);

  const uploadRows = useMemo(
    () => (rows ?? []).filter((row) => row.kind === "upload"),
    [rows],
  );

  const attachedSubjects = useMemo(
    () => new Set(textbookGroups.map((group) => group.subject)),
    [textbookGroups],
  );

  const pickableSubjects = useMemo(() => {
    if (levelOrder === null) return [];
    const seen = new Map<string, number>();
    for (const book of textbooks) {
      if (book.levelOrder !== levelOrder) continue;
      seen.set(book.subject, (seen.get(book.subject) ?? 0) + 1);
    }
    return [...seen.entries()]
      .filter(([subject]) => !attachedSubjects.has(subject))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([subject, count]) => ({ subject, count }));
  }, [textbooks, levelOrder, attachedSubjects]);

  const mutate = async (init: RequestInit) => {
    setBusy(true);
    await fetch(`/api/spaces/${spaceId}/sources`, init).catch(() => {});
    await load();
    setBusy(false);
  };

  const attachSubject = (subject: string) =>
    mutate({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "textbook", subject }),
    });

  const attachUpload = (refId: string) =>
    mutate({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "upload", refId }),
    });

  const removeRefIds = (refIds: string[]) =>
    mutate({
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refIds }),
    });

  return (
    <div className="border-border/60 bg-muted/20 grid gap-3 rounded-2xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t("spaceSources.title")}</span>
        <a
          href={`/chat?space=${spaceId}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium underline underline-offset-2"
        >
          {t("spaceSources.generate")}
        </a>
      </div>

      {rows === null ? (
        <span className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2Icon className="size-3.5 animate-spin" />
          {t("common.loading")}
        </span>
      ) : (
        <div className="grid gap-1.5">
          {textbookGroups.map((group) => (
            <span
              key={group.subject}
              className="bg-background border-border/60 flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
            >
              <BookOpenIcon className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {t("spaceSources.group", {
                  subject: group.subject,
                  count: group.refIds.length,
                })}
              </span>
              <button
                type="button"
                aria-label={`Buang ${group.subject}`}
                disabled={busy}
                onClick={() => void removeRefIds(group.refIds)}
                className="hover:text-foreground text-muted-foreground -me-1 rounded p-0.5 transition-colors"
              >
                <XIcon className="size-3.5" />
              </button>
            </span>
          ))}
          {uploadRows.map((row) => (
            <span
              key={row.id}
              className="bg-background border-border/60 flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">{row.title}</span>
              <button
                type="button"
                aria-label={`Buang ${row.title}`}
                disabled={busy}
                onClick={() => void removeRefIds([row.refId])}
                className="hover:text-foreground text-muted-foreground -me-1 rounded p-0.5 transition-colors"
              >
                <XIcon className="size-3.5" />
              </button>
            </span>
          ))}
          {!textbookGroups.length && !uploadRows.length ? (
            <span className="text-muted-foreground text-xs">
              {t("spaceSources.empty")}
            </span>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 rounded-full px-2.5 text-xs"
          onClick={() => void openTextbookPicker()}
          disabled={busy || levelOrder === null}
        >
          <PlusIcon className="size-3.5" />
          {t("spaceSources.addTextbook")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 rounded-full px-2.5 text-xs"
          onClick={() => void openUploadPicker()}
          disabled={busy}
        >
          <PlusIcon className="size-3.5" />
          {t("spaceSources.addOwn")}
        </Button>
      </div>

      {picker === "textbook" ? (
        <div className="border-border/60 bg-background max-h-44 overflow-y-auto rounded-xl border p-1.5">
          {pickableSubjects.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">
              {t("spaceSources.noSubjects")}
            </p>
          ) : (
            pickableSubjects.map(({ subject, count }) => (
              <button
                key={subject}
                type="button"
                disabled={busy}
                onClick={() => void attachSubject(subject)}
                className="hover:bg-muted/60 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors"
              >
                <span className="truncate">{subject}</span>
                <span className="text-muted-foreground shrink-0">
                  {t("spaceSources.chapters", { count })} ·{" "}
                  {t("spaceSources.add")}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      {picker === "upload" ? (
        <div className="border-border/60 bg-background max-h-44 overflow-y-auto rounded-xl border p-1.5">
          {uploads.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">
              {t("spaceSources.noUploads")}
            </p>
          ) : (
            uploads.map((upload) => (
              <button
                key={upload.id}
                type="button"
                disabled={busy}
                onClick={() => void attachUpload(upload.id)}
                className="hover:bg-muted/60 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors"
              >
                <span className="truncate">{upload.title}</span>
                <span className="text-muted-foreground shrink-0">
                  {t("spaceSources.add")}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};
