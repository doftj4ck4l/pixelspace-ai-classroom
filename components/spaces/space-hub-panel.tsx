"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import { useRouter } from "next/navigation";
import { useAui } from "@assistant-ui/react";
import {
  AddIcon,
  ChartColumnIcon,
  ChevronDownIcon,
  CircleHelpIcon,
  FileTextIcon,
  LayersIcon,
  LayoutGridIcon,
  Loader2Icon,
  PresentationIcon,
  SearchIcon,
  StickyNoteIcon,
  WaypointsIcon,
} from "@/components/icons";
import { HubMark as HubIcon } from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidePreview } from "@/components/assistant-ui/slide-preview";
import { CREATE_CHAT_PROMPTS } from "@/components/assistant-ui/space-gallery";
import { chatSpace } from "@/lib/chat-space";
import { useI18n } from "@/lib/i18n";
import s from "./space-study.module.css";

type SpaceArtifact = {
  id: string;
  type: string;
  title: string;
  kind: string;
  url: string | null;
  createdAt: string;
};

type HubType =
  | "flashcards"
  | "quizzes"
  | "mindmaps"
  | "slides"
  | "reports"
  | "infographics"
  | "notes";

const HUB_TYPES = [
  {
    id: "flashcards",
    labelKey: "spaceHub.flashcards",
    Icon: LayersIcon,
    emoji: "🃏",
    css: "other",
  },
  {
    id: "quizzes",
    labelKey: "spaceHub.quizzes",
    Icon: CircleHelpIcon,
    emoji: "❓",
    css: "video",
  },
  {
    id: "mindmaps",
    labelKey: "spaceHub.mindmaps",
    Icon: WaypointsIcon,
    emoji: "🗺️",
    css: "other",
  },
  {
    id: "slides",
    labelKey: "spaceHub.slides",
    Icon: PresentationIcon,
    emoji: "📊",
    css: "slides",
  },
  {
    id: "reports",
    labelKey: "spaceHub.reports",
    Icon: FileTextIcon,
    emoji: "📄",
    css: "other",
  },
  {
    id: "infographics",
    labelKey: "spaceHub.infographics",
    Icon: ChartColumnIcon,
    emoji: "📈",
    css: "video",
  },
  {
    id: "notes",
    labelKey: "spaceHub.notes",
    Icon: StickyNoteIcon,
    emoji: "📝",
    css: "note",
  },
] as const;

const ALL_TAB = {
  id: "all",
  labelKey: "spaceHub.all",
  Icon: LayoutGridIcon,
  emoji: "✨",
  css: "other",
} as const;

const HUB_TABS = [ALL_TAB, ...HUB_TYPES];

/**
 * The space's Hub tab: everything generated in this space's chats — quizzes
 * to attempt, slides to check, flashcards to review — with the same chip row
 * the sources tab uses, plus a Create button that starts a space-grounded
 * chat so whatever it builds belongs to this space.
 */
export const SpaceHubPanel: FC<{
  spaceId: string;
  /** Only the space owner may create new modules inside the space. */
  canCreate?: boolean;
}> = ({ spaceId, canCreate = false }) => {
  const { t } = useI18n();
  const router = useRouter();
  const aui = useAui();
  const [rows, setRows] = useState<SpaceArtifact[] | null>(null);
  const [category, setCategory] = useState<"all" | HubType>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<{ id: string; title: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/spaces/${spaceId}/artifacts`)
      .then((res) => (res.ok ? res.json() : { artifacts: [] }))
      .then((data: { artifacts?: SpaceArtifact[] }) => {
        if (!cancelled) setRows(data.artifacts ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const row of rows ?? []) out[row.type] = (out[row.type] ?? 0) + 1;
    return out;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((row) => category === "all" || row.type === category)
      .filter((row) => !needle || row.title.toLowerCase().includes(needle));
  }, [rows, category, query]);

  const open = (artifact: SpaceArtifact) => {
    if (artifact.type === "slides") {
      if ((artifact.url ?? "").split("?")[0]?.toLowerCase().endsWith(".pptx")) {
        setPreview({ id: artifact.id, title: artifact.title });
      }
      return;
    }
    if (
      artifact.type === "flashcards" ||
      artifact.type === "quizzes" ||
      artifact.type === "mindmaps" ||
      artifact.type === "notes" ||
      artifact.type === "reports" ||
      artifact.type === "infographics"
    ) {
      router.push(`/spaces/${artifact.type}/${artifact.id}`);
    }
  };

  const startCreate = async (type: HubType) => {
    try {
      // Tie the new thread — and everything it creates — to this space.
      chatSpace.id = spaceId;
      const { id } = (await fetch("/api/pi/threads", {
        method: "POST",
      }).then((res) => res.json())) as { id: string };
      await aui.threads.switchToThread(id);
      aui.composer.setText(
        CREATE_CHAT_PROMPTS[type] ??
          "Saya mahu bina sesuatu yang baharu. Tanya saya dahulu apa yang saya mahu.",
      );
      aui.composer.send();
      router.push(`/chat?space=${spaceId}`);
    } catch {
      // stay on the page; the user can retry
    }
  };

  return (
    <div className={s.sources}>
      <div className={s.sourceHeader}>
        <div className={s.sourceHeading}>
          <span className={s.sectionIcon}>
            <HubIcon />
          </span>
          <div>
            <h2>{t("hub.title")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("hub.subtitle")}
            </p>
          </div>
        </div>
        <div className={s.sourceActions}>
          {canCreate ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button className={s.addButton} />}>
                <AddIcon className="size-4" />
                {t("spaceHub.create")}
                <ChevronDownIcon className="size-3.5 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {HUB_TYPES.map((tab) => (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => void startCreate(tab.id)}
                    className="gap-2"
                  >
                    <tab.Icon className="size-4" />
                    {t(tab.labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.filters}>
          {HUB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              aria-pressed={category === tab.id}
              className={s.filter}
            >
              <tab.Icon className="size-3.5" />
              {t(tab.labelKey)}
              <span className={s.filterCount}>
                {tab.id === "all" ? (rows ?? []).length : (counts[tab.id] ?? 0)}
              </span>
            </button>
          ))}
        </div>
        <div className={s.viewTools}>
          <label className={s.search}>
            <SearchIcon className="text-muted-foreground size-4 shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t("spaceHub.search")}
              placeholder={t("spaceHub.search")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
        </div>
      </div>

      {rows === null ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          {t("common.loading")}
        </div>
      ) : visible.length === 0 ? (
        <div className={s.empty}>{t("spaceHub.empty")}</div>
      ) : (
        <div className={s.grid}>
          {visible.map((artifact) => {
            const tab = HUB_TABS.find((entry) => entry.id === artifact.type);
            const Icon = tab?.Icon ?? FileTextIcon;
            return (
              <article
                key={artifact.id}
                className={s.card}
                data-category={tab?.css ?? "other"}
              >
                <div className={s.cardCover}>
                  <button
                    type="button"
                    className={s.coverLink}
                    aria-label={artifact.title}
                    onClick={() => open(artifact)}
                  >
                    <span className="text-4xl leading-none">
                      {tab?.emoji ?? "📦"}
                    </span>
                  </button>
                  <div className={s.cardTop}>
                    <span className={s.categoryChip}>
                      <Icon />
                      {tab ? t(tab.labelKey) : artifact.type}
                    </span>
                  </div>
                </div>
                <div className={s.cardBody}>
                  <button
                    type="button"
                    className={s.cardTitle}
                    onClick={() => open(artifact)}
                  >
                    {artifact.title}
                  </button>
                  <span className={s.cardMeta}>
                    {new Date(artifact.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {preview ? (
        <SlidePreview
          artifactId={preview.id}
          title={preview.title}
          downloads={[]}
          editable={canCreate}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
};
