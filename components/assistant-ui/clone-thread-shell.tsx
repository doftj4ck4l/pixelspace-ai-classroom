"use client";

import {
  ThreadList,
  ThreadListItems,
  ThreadListRoot,
} from "@/components/assistant-ui/elements/thread-list.aui";
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
  Apps as HubIcon,
  AppsFill as HubFillIcon,
  Checklist as DutiesIcon,
  ChecklistFill as DutiesFillIcon,
  DarkMode as MoonIcon,
  EditSquare as NewChatIcon,
  Group as SpacesIcon,
  GroupFill as SpacesFillIcon,
  Home as HomeIcon,
  HomeFill as HomeFillIcon,
  LeftPanelClose as PanelLeftIcon,
  LightMode as SunIcon,
  Menu as MenuIcon,
  Monitoring as KpmIcon,
  MonitoringFill as KpmFillIcon,
  Schedule as ScheduleIcon,
  ScheduleFill as ScheduleFillIcon,
  Search as SearchIcon,
  SmartToy as BuddyIcon,
  SmartToyFill as BuddyFillIcon,
} from "@material-symbols-svg/react/rounded";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <TooltipIconButton
      variant="ghost"
      size="icon"
      tooltip={isDark ? "Light mode" : "Dark mode"}
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
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

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
        '[data-slot="aui_thread-list-item-trigger"], [data-slot="aui_thread-list-new"]',
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
      className="bg-muted hover:bg-muted/80 flex h-10 min-h-10 w-full items-center gap-2.5 rounded-full px-4 text-sm font-medium transition-colors"
    >
      <NewChatIcon className="size-4 shrink-0" />
      <span className="whitespace-nowrap">New chat</span>
    </button>
  );

  return (
    <SidebarNavContext.Provider value={nav}>
      <div className="relative flex h-full w-full overflow-hidden">
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
            tooltip="Home"
            side="right"
            onClick={() => {
              const wasCollapsed = sidebarCollapsed;
              if (wasCollapsed) setSidebarCollapsed(false);
              if (!pathname.startsWith("/chat")) {
                router.push("/chat");
                return;
              }
              if (!wasCollapsed) void aui.threads.switchToNewThread();
            }}
            className="size-8"
          >
            {view === "home" ? (
              <HomeFillIcon className="size-4" />
            ) : (
              <HomeIcon className="size-4" />
            )}
          </TooltipIconButton>
          <TooltipIconButton
            variant="ghost"
            size="icon"
            tooltip="Hub"
            side="right"
            onClick={() => {
              setSidebarCollapsed(false);
              router.push(view === "space" ? "/chat" : "/spaces/all");
            }}
            className={cn(
              "size-8",
              view === "space" && "bg-muted text-foreground",
            )}
          >
            {view === "space" ? (
              <HubFillIcon className="size-4" />
            ) : (
              <HubIcon className="size-4" />
            )}
          </TooltipIconButton>
          <TooltipIconButton
            variant="ghost"
            size="icon"
            tooltip="Scheduled"
            side="right"
            onClick={() => {
              setSidebarCollapsed(false);
              router.push(view === "scheduled" ? "/chat" : "/scheduled");
            }}
            className={cn(
              "size-8",
              view === "scheduled" && "bg-muted text-foreground",
            )}
          >
            {view === "scheduled" ? (
              <ScheduleFillIcon className="size-4" />
            ) : (
              <ScheduleIcon className="size-4" />
            )}
          </TooltipIconButton>
          {role === "superadmin" && (
            <TooltipIconButton
              variant="ghost"
              size="icon"
              tooltip="Admin"
              side="right"
              onClick={() => {
                setSidebarCollapsed(false);
                router.push("/admin");
              }}
              className={cn(
                "size-8",
                pathname.startsWith("/admin") && "bg-muted text-foreground",
              )}
            >
              {pathname.startsWith("/admin") ? (
                <AdminFillIcon className="size-4" />
              ) : (
                <AdminIcon className="size-4" />
              )}
            </TooltipIconButton>
          )}
          {showSearch && (
            <TooltipIconButton
              variant="ghost"
              size="icon"
              tooltip="Search chats"
              side="right"
              onClick={() => {
                setSidebarCollapsed(false);
                setSearchOpen(true);
              }}
              className="size-8"
            >
              <SearchIcon className="size-4" />
            </TooltipIconButton>
          )}
          <div className="mt-auto flex flex-col items-center gap-1">
            <ThemeToggle />
            <ProfileMenu />
          </div>
        </div>

        <aside
          inert={sidebarCollapsed}
          aria-hidden={sidebarCollapsed}
          className={cn(
            "bg-muted/30 hidden h-full shrink-0 flex-col overflow-hidden transition-[width] duration-200 md:flex",
            railClassName,
            sidebarCollapsed ? "w-0" : "w-65 border-r",
          )}
        >
          <div className="flex h-12 shrink-0 items-center gap-0.5 overflow-hidden px-2">
            {headerContent !== undefined ? (
              headerContent
            ) : (
              <span className="flex min-w-0 flex-1 items-center gap-2 ps-2 text-sm font-semibold">
                <span className="size-5 shrink-0 rounded-full bg-gradient-to-br from-[#177e89] to-[#8fd9c8]" />
                <span className="truncate">Pixelspace</span>
              </span>
            )}
            {showSearch && hasThreads && (
              <TooltipIconButton
                variant="ghost"
                size="icon"
                tooltip="Search"
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
                tooltip="Hide sidebar"
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
            )}
          >
            <div className="shrink-0">
              {wrapNewThreadTooltip && newThread ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={newThread} />
                    {sidebarCollapsed && (
                      <TooltipContent side="right">New chat</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ) : (
                newThread
              )}

              <nav className="mt-2 flex flex-col gap-0.5">
                {role === "student" && (
                  <Link
                    href="/student"
                    className={cn(
                      "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm transition-colors",
                      pathname.startsWith("/student")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {pathname.startsWith("/student") ? (
                      <HomeFillIcon className="size-4 shrink-0" />
                    ) : (
                      <HomeIcon className="size-4 shrink-0" />
                    )}
                    <span className="truncate">Rumah</span>
                  </Link>
                )}
                {role === "kpm" && (
                  <Link
                    href="/kpm"
                    className={cn(
                      "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm transition-colors",
                      pathname.startsWith("/kpm")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {pathname.startsWith("/kpm") ? (
                      <KpmFillIcon className="size-4 shrink-0" />
                    ) : (
                      <KpmIcon className="size-4 shrink-0" />
                    )}
                    <span className="truncate">KPM Dashboard</span>
                  </Link>
                )}
                {role === "superadmin" && (
                  <Link
                    href="/admin"
                    className={cn(
                      "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm transition-colors",
                      pathname.startsWith("/admin")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {pathname.startsWith("/admin") ? (
                      <AdminFillIcon className="size-4 shrink-0" />
                    ) : (
                      <AdminIcon className="size-4 shrink-0" />
                    )}
                    <span className="truncate">Admin</span>
                  </Link>
                )}
                <Link
                  href="/spaces/all"
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm transition-colors",
                    view === "space"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {view === "space" ? (
                    <HubFillIcon className="size-4 shrink-0" />
                  ) : (
                    <HubIcon className="size-4 shrink-0" />
                  )}
                  <span className="truncate">Hub</span>
                </Link>
                {(role === "teacher" || role === "student") && (
                  <Link
                    href="/community"
                    className={cn(
                      "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm transition-colors",
                      pathname.startsWith("/community")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {pathname.startsWith("/community") ? (
                      <SpacesFillIcon className="size-4 shrink-0" />
                    ) : (
                      <SpacesIcon className="size-4 shrink-0" />
                    )}
                    <span className="truncate">Spaces</span>
                  </Link>
                )}
                {role === "student" && (
                  <Link
                    href="/buddy"
                    className={cn(
                      "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm transition-colors",
                      pathname.startsWith("/buddy")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {pathname.startsWith("/buddy") ? (
                      <BuddyFillIcon className="size-4 shrink-0" />
                    ) : (
                      <BuddyIcon className="size-4 shrink-0" />
                    )}
                    <span className="truncate">Buddy</span>
                  </Link>
                )}
                {role === "teacher" && (
                  <Link
                    href="/duties"
                    className={cn(
                      "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm transition-colors",
                      pathname.startsWith("/duties")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {pathname.startsWith("/duties") ? (
                      <DutiesFillIcon className="size-4 shrink-0" />
                    ) : (
                      <DutiesIcon className="size-4 shrink-0" />
                    )}
                    <span className="truncate">Duties</span>
                  </Link>
                )}
                <Link
                  href="/scheduled"
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm transition-colors",
                    view === "scheduled"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {view === "scheduled" ? (
                    <ScheduleFillIcon className="size-4 shrink-0" />
                  ) : (
                    <ScheduleIcon className="size-4 shrink-0" />
                  )}
                  <span className="truncate">Scheduled</span>
                </Link>
              </nav>
            </div>

            <div className="scrollbar-subtle -mx-1 mt-1 min-h-0 flex-1 overflow-y-auto px-1">
              {hasThreads && (
                <span className="text-muted-foreground px-3 pt-4 pb-1 text-xs font-medium">
                  Recents
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

          <div className="border-border/60 mt-auto flex shrink-0 items-center gap-2 border-t px-3 py-2.5">
            <ProfileMenu />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {session?.user?.name ?? "Account"}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {session?.user?.email ?? ""}
              </p>
            </div>
            <ThemeToggle />
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
                    <span className="sr-only">Open chat history</span>
                  </Button>
                }
              />
            </div>
          )}
          <SheetContent side="left" className="flex flex-col p-0">
            <SheetTitle className="flex h-12 shrink-0 items-center px-4 text-sm font-medium">
              {sheetTitle ?? "Pixelspace AI Classroom"}
            </SheetTitle>
            <div
              className="relative flex-1 overflow-y-auto p-3"
              onClick={closeMobileSidebarAfterNavigation}
            >
              <ThreadList />
            </div>
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarNavContext.Provider>
  );
};
