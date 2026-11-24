"use client";

import {
  ThreadList,
  ThreadListItems,
  ThreadListRoot,
} from "@/components/assistant-ui/elements/thread-list.aui";
import teacherStyles from "./teacher-sidebar.module.css";
import { SpaceArtwork } from "@/components/spaces/space-artwork";
import { SearchDialog } from "@/components/assistant-ui/search-dialog";
import { useSession } from "@/lib/auth-client";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { ProfileMenu } from "@/components/assistant-ui/profile-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAui, useAuiState } from "@assistant-ui/react";
import {
  AdminPanelSettings as AdminIcon,
  AdminPanelSettingsFill as AdminFillIcon,
  Checklist as DutiesIcon,
  ChecklistFill as DutiesFillIcon,
  DarkMode as MoonIcon,
  Group as SpacesIcon,
  GroupFill as SpacesFillIcon,
  MenuBook as TextbooksIcon,
  MenuBookFill as TextbooksFillIcon,
  LeftPanelClose as PanelLeftIcon,
  LightMode as SunIcon,
  Menu as MenuIcon,
  Monitoring as KpmIcon,
  MonitoringFill as KpmFillIcon,
  Schedule as ScheduleIcon,
  ScheduleFill as ScheduleFillIcon,
  Search as SearchIcon,
  SchoolFill as SchoolIcon,
  Settings as SettingsIcon,
} from "@material-symbols-svg/react/rounded/w600";
import { useT, type TranslationKey } from "@/lib/i18n";
import {
  HubMark as HubIcon,
  HubMarkFill as HubFillIcon,
  NewChatMark as NewChatIcon,
  PixiMark as BuddyIcon,
  PixiMarkFill as BuddyFillIcon,
} from "@/components/brand-icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type MouseEvent,
  type ReactNode,
  type ComponentType,
} from "react";

export type SidebarView = "home" | "space" | "scheduled";
export type SidebarNav = {
  view: SidebarView;
  section: string;
  setSection: (section: string) => void;
  setView: (view: SidebarView) => void;
};

export const SidebarNavContext = createContext<SidebarNav>({
  view: "home",
  section: "all",
  setSection: () => {},
  setView: () => {},
});

export const useSidebarNav = () => useContext(SidebarNavContext);

type CloneThreadShellProps = {
  children: ReactNode;
  role?: string;
  railClassName?: string | undefined;
  collapsed?: boolean | undefined;
  onCollapsedChange?: ((value: boolean) => void) | undefined;
  mobileSidebarOpen?: boolean | undefined;
  onMobileSidebarOpenChange?: ((value: boolean) => void) | undefined;
  headerContent?: ReactNode | undefined;
  sheetTitle?: ReactNode | undefined;
  showSearch?: boolean | undefined;
  wrapNewThreadTooltip?: boolean | undefined;
};

const ThemeToggle: FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <TooltipIconButton
      variant="ghost"
      size="icon"
      tooltip={isDark ? t("shell.lightMode") : t("shell.darkMode")}
      side="right"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="size-8"
    >
      {isDark ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
    </TooltipIconButton>
  );
};

export const CloneThreadShell: FC<CloneThreadShellProps> = ({
  children,
  role,
  railClassName,
  collapsed,
  onCollapsedChange,
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
  headerContent,
  sheetTitle,
  showSearch = true,
  wrapNewThreadTooltip = false,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  /** Second panel next to the collapsed rail (currently only the chat history). */
  const [railPanel, setRailPanel] = useState<"chat" | null>("chat");
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const t = useT();
  const isTeacher = role === "teacher";

  // Navigation is the URL now: /chat*, /spaces/<section>, /scheduled.
  const inSpace = pathname.startsWith("/spaces");
  const view: SidebarView = pathname.startsWith("/scheduled")
    ? "scheduled"
    : inSpace
      ? "space"
      : "home";
  const section = inSpace ? (pathname.split("/")[2] ?? "all") : "all";
  const nav = useMemo(
    () => ({
      view,
      section,
      setSection: (next: string) => router.push(`/spaces/${next}`),
      setView: (next: SidebarView) =>
        router.push(
          next === "home"
            ? "/chat"
            : next === "space"
              ? "/spaces/all"
              : "/scheduled",
        ),
    }),
    [view, section, router],
  );
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
  const aui = useAui();

  // A controlled value means the caller renders the chrome that drives it, so
  // the shell omits its own toggle / trigger and forwards changes instead.
  const collapsedControlled = collapsed !== undefined;
  const mobileControlled = mobileSidebarOpen !== undefined;

  const sidebarCollapsed = collapsed ?? internalCollapsed;
  const mobileOpen = mobileSidebarOpen ?? internalMobileOpen;

  const setSidebarCollapsed = (value: boolean) => {
    if (!collapsedControlled) setInternalCollapsed(value);
    onCollapsedChange?.(value);
  };
  const setMobileOpen = (open: boolean) => {
    if (!mobileControlled) setInternalMobileOpen(open);
    onMobileSidebarOpenChange?.(open);
  };

  const closeMobileSidebarAfterNavigation = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    if (!(event.target instanceof Element)) return;
    if (
      event.target.closest(
        '[data-slot="aui_thread-list-item-trigger"], [data-slot="aui_thread-list-new"], a[href]',
      )
    ) {
      setMobileOpen(false);
    }
  };

  // One consistent front door: "New chat" always starts a fresh thread and
  // lands on /chat, whatever page you are on.
  const newThread = (
    <button
      type="button"
      onClick={() => {
        void aui.threads.switchToNewThread();
        router.push("/chat");
        setMobileOpen(false);
      }}
      className={cn(
        "bg-muted hover:bg-muted/80 flex h-10 min-h-10 w-full items-center gap-2.5 rounded-full px-4 text-sm font-medium transition-colors",
        teacherStyles.newChat,
      )}
    >
      <NewChatIcon className="size-4 shrink-0" />
      <span className="whitespace-nowrap">{t("shell.newChat")}</span>
    </button>
  );

  type ShellNavItem = {
    href: string;
    labelKey: TranslationKey;
    Icon: ComponentType<{ className?: string }>;
    FillIcon: ComponentType<{ className?: string }>;
    active: boolean;
  };

  const navItems: ShellNavItem[] = [
    ...(role === "kpm"
      ? ([
          {
            href: "/kpm",
            labelKey: "shell.kpm",
            Icon: KpmIcon,
            FillIcon: KpmFillIcon,
            active: pathname.startsWith("/kpm"),
          },
        ] as ShellNavItem[])
      : []),
    ...(role === "superadmin"
      ? ([
          {
            href: "/admin",
            labelKey: "shell.admin",
            Icon: AdminIcon,
            FillIcon: AdminFillIcon,
            active: pathname.startsWith("/admin"),
          },
        ] as ShellNavItem[])
      : []),
    {
      href: "/spaces/all",
      labelKey: "shell.hub",
      Icon: HubIcon,
      FillIcon: HubFillIcon,
      active: view === "space",
    },
    ...(role === "teacher" || role === "student" || role === "superadmin"
      ? ([
          {
            href: "/textbooks",
            labelKey: "shell.textbooks",
            Icon: TextbooksIcon,
            FillIcon: TextbooksFillIcon,
            active: pathname.startsWith("/textbooks"),
          },
        ] as ShellNavItem[])
      : []),
    ...(role === "teacher" || role === "student"
      ? ([
          {
            href: "/community",
            labelKey: "shell.spaces",
            Icon: SpacesIcon,
            FillIcon: SpacesFillIcon,
            active: pathname.startsWith("/community"),
          },
        ] as ShellNavItem[])
      : []),
    ...(role === "student"
      ? ([
          {
            href: "/buddy",
            labelKey: "shell.buddy",
            Icon: BuddyIcon,
            FillIcon: BuddyFillIcon,
            active: pathname.startsWith("/buddy"),
          },
        ] as ShellNavItem[])
      : []),
    ...(role === "teacher"
      ? ([
          {
            href: "/duties",
            labelKey: "shell.duties",
            Icon: DutiesIcon,
            FillIcon: DutiesFillIcon,
            active: pathname.startsWith("/duties"),
          },
        ] as ShellNavItem[])
      : []),
    {
      href: "/scheduled",
      labelKey: "shell.scheduled",
      Icon: ScheduleIcon,
      FillIcon: ScheduleFillIcon,
      active: view === "scheduled",
    },
  ];

  const navigation = (
    <nav className={cn("mt-2 flex flex-col gap-0.5", teacherStyles.navigation)}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm transition-colors",
            item.active
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {item.active ? (
            <item.FillIcon className="size-4 shrink-0" />
          ) : (
            <item.Icon className="size-4 shrink-0" />
          )}
          <span className="truncate">{t(item.labelKey)}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <SidebarNavContext.Provider value={nav}>
      <div
        className={cn(
          "relative flex h-full w-full overflow-hidden",
          teacherStyles.shell,
        )}
      >
        <div
          data-slot="aui-app-rail"
          className={cn(
            "bg-muted/30 hidden h-full w-12 shrink-0 flex-col items-center gap-1 py-2 md:flex",
            !sidebarCollapsed && "md:hidden",
          )}
        >
          <TooltipIconButton
            variant="ghost"
            size="icon"
            tooltip="Pixelspace"
            side="right"
            onClick={() => setSidebarCollapsed(false)}
            className="size-8"
          >
            <span className="size-5 rounded-full bg-gradient-to-br from-[#177e89] to-[#8fd9c8]" />
          </TooltipIconButton>
          <TooltipIconButton
            variant="ghost"
            size="icon"
            tooltip={t("shell.newChat")}
            side="right"
            onClick={() =>
              setRailPanel((open) => (open === "chat" ? null : "chat"))
            }
            className={cn(
              "size-8",
              railPanel === "chat" && "bg-muted text-foreground",
            )}
          >
            <NewChatIcon className="size-5" />
          </TooltipIconButton>
          {navItems.map((item) => (
            <TooltipIconButton
              key={item.href}
              variant="ghost"
              size="icon"
              tooltip={t(item.labelKey)}
              side="right"
              onClick={() => router.push(item.href)}
              className={cn(
                "size-8",
                item.active && "bg-muted text-foreground",
              )}
            >
              {item.active ? (
                <item.FillIcon className="size-5" />
              ) : (
                <item.Icon className="size-5" />
              )}
            </TooltipIconButton>
          ))}
          {showSearch && (
            <TooltipIconButton
              variant="ghost"
              size="icon"
              tooltip={t("shell.searchChats")}
              side="right"
              onClick={() => setSearchOpen(true)}
              className="size-8"
            >
              <SearchIcon className="size-5" />
            </TooltipIconButton>
          )}
          <div className="mt-auto flex flex-col items-center gap-1">
            <ThemeToggle />
            <ProfileMenu showAppearance />
          </div>
        </div>

        {sidebarCollapsed && railPanel === "chat" ? (
          <aside
            data-slot="aui-rail-panel"
            className={cn(
              "bg-muted/30 hidden h-full w-72 shrink-0 flex-col overflow-hidden border-r md:flex",
              teacherStyles.sidebar,
            )}
          >
            <div
              className={cn(
                "flex h-12 shrink-0 items-center gap-0.5 overflow-hidden px-2",
                teacherStyles.brandHeader,
              )}
            >
              <span className={cn(teacherStyles.brand, "flex-1")}>
                <SchoolIcon />
                <span className={teacherStyles.brandWords}>
                  <strong>Pixelspace</strong>
                  <small>AI CLASSROOM</small>
                </span>
              </span>
              <TooltipIconButton
                variant="ghost"
                size="icon"
                tooltip={t("shell.hideSidebar")}
                side="bottom"
                onClick={() => setRailPanel(null)}
                className="size-8"
              >
                <PanelLeftIcon className="size-4" />
              </TooltipIconButton>
            </div>

            <ThreadListRoot
              className={cn(
                "relative flex min-h-0 flex-1 flex-col p-2",
                teacherStyles.threadRoot,
              )}
            >
              <div className="shrink-0">
                {newThread}
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="text-muted-foreground hover:bg-muted/60 hover:text-foreground mt-1 flex h-9 w-full items-center gap-2.5 rounded-full px-4 text-sm transition-colors"
                >
                  <SearchIcon className="size-4 shrink-0" />
                  {t("shell.searchChats")}
                </button>
              </div>

              <div
                className={cn(
                  "scrollbar-subtle -mx-1 mt-1 min-h-0 flex-1 overflow-y-auto px-1",
                  teacherStyles.recents,
                )}
              >
                {hasThreads && (
                  <span className="text-muted-foreground px-3 pt-4 pb-1 text-xs font-medium">
                    {t("shell.recents")}
                  </span>
                )}
                <ThreadListItems searchQuery="" />
              </div>
            </ThreadListRoot>
          </aside>
        ) : null}

        <aside
          inert={sidebarCollapsed}
          aria-hidden={sidebarCollapsed}
          className={cn(
            "bg-muted/30 hidden h-full shrink-0 flex-col overflow-hidden transition-[width] duration-200 md:flex",
            railClassName,
            sidebarCollapsed ? "w-0" : "w-[272px] border-r",
            teacherStyles.sidebar,
          )}
        >
          <div
            className={cn(
              "flex h-12 shrink-0 items-center gap-0.5 overflow-hidden px-2",
              teacherStyles.brandHeader,
            )}
          >
            {headerContent !== undefined ? (
              headerContent
            ) : (
              <Link
                href={
                  role === "kpm"
                    ? "/kpm"
                    : role === "superadmin"
                      ? "/admin"
                      : "/community"
                }
                className={teacherStyles.brand}
              >
                <SchoolIcon />
                <span className={teacherStyles.brandWords}>
                  <strong>Pixelspace</strong>
                  <small>AI CLASSROOM</small>
                </span>
              </Link>
            )}
            {showSearch && (hasThreads || isTeacher) && (
              <TooltipIconButton
                variant="ghost"
                size="icon"
                tooltip={t("shell.search")}
                side="bottom"
                onClick={() => setSearchOpen(true)}
                className="size-8"
              >
                <SearchIcon className="size-4" />
              </TooltipIconButton>
            )}
            {!collapsedControlled && (
              <TooltipIconButton
                variant="ghost"
                size="icon"
                tooltip={t("shell.hideSidebar")}
                side="bottom"
                onClick={() => setSidebarCollapsed(true)}
                className="size-8"
              >
                <PanelLeftIcon className="size-4" />
              </TooltipIconButton>
            )}
          </div>

          <ThreadListRoot
            className={cn(
              "relative flex min-h-0 flex-1 flex-col transition-[padding,width] duration-200",
              sidebarCollapsed ? "w-12 overflow-hidden px-2 pt-1" : "w-65 p-2",
              teacherStyles.threadRoot,
            )}
          >
            <div className="shrink-0">
              {wrapNewThreadTooltip && newThread ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={newThread} />
                    {sidebarCollapsed && (
                      <TooltipContent side="right">
                        {t("shell.newChat")}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ) : (
                newThread
              )}

              {navigation}
            </div>

            <div
              className={cn(
                "scrollbar-subtle -mx-1 mt-1 min-h-0 flex-1 overflow-y-auto px-1",
                teacherStyles.recents,
              )}
            >
              {hasThreads && (
                <span className="text-muted-foreground px-3 pt-4 pb-1 text-xs font-medium">
                  {t("shell.recents")}
                </span>
              )}

              <ThreadListItems
                searchQuery=""
                aria-hidden={sidebarCollapsed}
                inert={sidebarCollapsed}
                className={cn(
                  "transition-[opacity,transform] duration-150",
                  sidebarCollapsed
                    ? "pointer-events-none opacity-0"
                    : "translate-x-0 opacity-100",
                )}
              />
            </div>
          </ThreadListRoot>

          <SpaceArtwork className={teacherStyles.sidebarArt} />
          <div
            className={cn(
              "border-border/60 mt-auto flex shrink-0 items-center gap-2 border-t px-3 py-2.5",
              teacherStyles.account,
            )}
          >
            <ProfileMenu showAppearance />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {session?.user?.name ?? "Account"}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {session?.user?.email ?? ""}
              </p>
            </div>
            <Link
              href="/settings"
              aria-label={t("profile.settings")}
              className={teacherStyles.settings}
            >
              <SettingsIcon />
            </Link>
          </div>
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          {!mobileControlled && (
            <div className="absolute top-2 left-2 z-20 md:hidden">
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/70 size-8"
                  >
                    <MenuIcon className="size-4" />
                    <span className="sr-only">{t("shell.openHistory")}</span>
                  </Button>
                }
              />
            </div>
          )}
          <SheetContent
            side="left"
            className={cn("flex flex-col p-0", teacherStyles.mobileSheet)}
          >
            <SheetTitle className="flex h-12 shrink-0 items-center px-4 text-sm font-medium">
              {sheetTitle ?? (
                <span className={teacherStyles.brand}>
                  <SchoolIcon />
                  <span className={teacherStyles.brandWords}>
                    <strong>Pixelspace</strong>
                    <small>AI CLASSROOM</small>
                  </span>
                </span>
              )}
            </SheetTitle>
            <div
              className="relative flex-1 overflow-y-auto p-3"
              onClick={closeMobileSidebarAfterNavigation}
            >
              <ThreadListRoot>
                {newThread}
                {navigation}
                <ThreadListItems searchQuery="" />
              </ThreadListRoot>
            </div>
            <div
              className={cn(
                "flex shrink-0 items-center gap-3 border-t px-5 py-4",
                teacherStyles.account,
              )}
            >
              <ProfileMenu showAppearance />
              <div className="min-w-0 flex-1">
                <p className="truncate">{session?.user?.name ?? "Account"}</p>
                <p className="truncate">{session?.user?.email ?? ""}</p>
              </div>
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                aria-label={t("profile.settings")}
                className={teacherStyles.settings}
              >
                <SettingsIcon />
              </Link>
            </div>
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarNavContext.Provider>
  );
};
