"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot as BotIcon,
  ClipboardList as DutiesIcon,
  Loader2 as Loader2Icon,
  Settings as SettingsIcon,
  X as XIcon,
} from "lucide-react";
import {
  SpaceGallery,
  type ModuleKind,
} from "@/components/assistant-ui/space-gallery";
import { TextbooksPage } from "@/components/textbooks/textbooks-page";
import { SpacesPage } from "@/components/spaces/spaces-page";
import { SpaceDetail } from "@/components/spaces/space-detail";
import { BuddyMascot } from "@/components/student/buddy-mascot";
import { AppPageHeader } from "@/components/app-page-header";
import { useT } from "@/lib/i18n";

const MODULES = new Set<string>([
  "flashcards",
  "quizzes",
  "mindmaps",
  "slides",
  "reports",
  "infographics",
  "podcasts",
  "notes",
  "transformations",
]);

type SpaceRow = {
  id: string;
  name: string;
  level: string;
  description?: string;
  accent: string;
  code?: string;
  teacher?: string;
};

/** The space page, loaded client-side so it can render inside the menu screen. */
const MenuSpaceDetail: FC<{ spaceId: string; role: string }> = ({
  spaceId,
  role,
}) => {
  const [row, setRow] = useState<SpaceRow | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setRow(undefined);
    fetch("/api/spaces")
      .then((res) => res.json())
      .then((data: { spaces?: SpaceRow[] }) => {
        if (cancelled) return;
        setRow((data.spaces ?? []).find((space) => space.id === spaceId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setRow(null);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  if (row === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }
  if (row === null) {
    return role === "teacher" || role === "student" ? (
      <SpacesPage role={role} />
    ) : (
      <SpaceGallery mode="all" />
    );
  }
  return (
    <SpaceDetail
      space={{
        id: row.id,
        name: row.name,
        level: row.level,
        description: row.description ?? "",
        accent: row.accent,
        code: row.code ?? "",
        teacher: row.teacher ?? "",
      }}
      isOwner={role === "teacher" && Boolean(row.code)}
    />
  );
};

const DutiesContent: FC = () => {
  const t = useT();
  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 sm:px-8 sm:py-8">
        <AppPageHeader
          icon={DutiesIcon}
          iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-300"
          title={t("duties.title")}
          subtitle={t("duties.subtitle")}
        />
        <div className="border-border/60 mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
            <DutiesIcon className="text-muted-foreground size-5" />
          </span>
          <p className="text-sm font-medium">{t("duties.empty")}</p>
          <p className="text-muted-foreground max-w-md text-sm">
            {t("duties.emptyBody")}
          </p>
        </div>
      </div>
    </div>
  );
};

const BuddyContent: FC = () => {
  const t = useT();
  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <BotIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {t("buddy.title")}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("buddy.subtitle")}
              </p>
            </div>
          </div>
        </div>
        <div className="border-border/60 mt-8 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-14 text-center">
          <BuddyMascot />
          <p className="text-sm font-medium">{t("buddy.preparing")}</p>
          <p className="text-muted-foreground max-w-md text-sm">
            {t("buddy.preparingBody")}
          </p>
        </div>
      </div>
    </div>
  );
};

const ScheduledContent: FC = () => (
  <div className="flex h-full items-center justify-center">
    <p className="text-muted-foreground text-sm">No scheduled tasks</p>
  </div>
);

const SettingsContent: FC = () => {
  const t = useT();
  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 size-11 rounded-full bg-gradient-to-br from-[#177e89] to-[#8fd9c8]" />
        <h1 className="text-lg font-medium">{t("profile.settings")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Preferences for your account and classroom will appear here.
        </p>
      </div>
    </div>
  );
};

const MenuScreenContent: FC<{ role: string }> = ({ role }) => {
  const pathname = usePathname();
  const content = useMemo(() => {
    if (pathname.startsWith("/textbooks")) return <TextbooksPage />;
    if (pathname.startsWith("/community/")) {
      const spaceId = pathname.split("/")[2] ?? "";
      return <MenuSpaceDetail spaceId={spaceId} role={role} />;
    }
    if (pathname.startsWith("/community")) {
      return role === "teacher" || role === "student" ? (
        <SpacesPage role={role} />
      ) : (
        <SpaceGallery mode="all" />
      );
    }
    if (pathname.startsWith("/duties")) return <DutiesContent />;
    if (pathname.startsWith("/scheduled")) return <ScheduledContent />;
    if (pathname.startsWith("/buddy")) return <BuddyContent />;
    if (pathname.startsWith("/settings")) return <SettingsContent />;
    const section = pathname.startsWith("/spaces/")
      ? (pathname.split("/")[2] ?? "all")
      : "all";
    if (section !== "all" && !MODULES.has(section)) {
      return <SpaceGallery mode="all" />;
    }
    return <SpaceGallery mode={section as "all" | ModuleKind} />;
  }, [pathname, role]);

  return <div className="h-full min-w-0">{content}</div>;
};

/**
 * The menu screen: a floating window that renders the current page inside it,
 * with the navigation sidebar on the left (like a screen popping up).
 */
export const MenuScreen: FC<{
  open: boolean;
  onClose: () => void;
  navigation: ReactNode;
  footer: ReactNode;
  role: string;
  userName: string;
}> = ({ open, onClose, navigation, footer, role, userName }) => {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="bg-card fixed inset-3 z-50 flex overflow-hidden rounded-3xl border shadow-2xl md:inset-[30px]"
      >
        <aside className="flex w-64 shrink-0 flex-col border-r">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="size-9 shrink-0 rounded-full bg-gradient-to-br from-[#177e89] to-[#8fd9c8]" />
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {userName}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-t p-2">
            <p className="text-muted-foreground px-3 pt-2 pb-1 text-xs font-medium">
              Menu
            </p>
            {navigation}
            <Link
              href="/settings"
              className="text-muted-foreground hover:bg-muted/60 hover:text-foreground mt-4 flex h-9 items-center gap-2.5 rounded-full px-4 text-sm transition-colors"
            >
              <SettingsIcon className="size-4 shrink-0" />
              {t("profile.settings")}
            </Link>
          </div>
          <div className="border-t">{footer}</div>
        </aside>
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted/60 hover:text-foreground absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full transition-colors"
          >
            <XIcon className="size-4" />
          </button>
          <div className="h-full pt-12">
            <MenuScreenContent role={role} />
          </div>
        </div>
      </div>
    </>
  );
};
