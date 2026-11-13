"use client";

import {
  ThreadList,
  ThreadListItems,
  ThreadListNew,
  ThreadListRoot,
  ThreadListSearch,
} from "@/components/assistant-ui/elements/thread-list.aui";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
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
  AudioLinesIcon,
  ClockIcon,
  Columns3Icon,
  FileTextIcon,
  HomeIcon,
  LayersIcon,
  LayoutGridIcon,
  MenuIcon,
  MoonIcon,
  PanelLeftIcon,
  PlusIcon,
  PresentationIcon,
  SearchIcon,
  SquarePenIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";
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
export type SidebarNav = { view: SidebarView; section: string };

export const SidebarNavContext = createContext<SidebarNav>({
  view: "home",
  section: "all",
});

export const useSidebarNav = () => useContext(SidebarNavContext);

type CloneThreadShellProps = {
  children: ReactNode;
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

type NavItem = {
  id: string;
  label: string;
  Icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { id: "all", label: "All", Icon: Columns3Icon },
  { id: "slides", label: "Slides", Icon: PresentationIcon },
  { id: "reports", label: "Reports", Icon: FileTextIcon },
  { id: "flashcards", label: "Flashcards", Icon: LayersIcon },
  { id: "audio", label: "Audio", Icon: AudioLinesIcon },
];

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
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("all");
  const [view, setView] = useState<SidebarView>("home");
  const nav = useMemo(() => ({ view, section }), [view, section]);
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
  const aui = useAui();

  const selectSection = (item: NavItem) => {
    setSection(item.id);
  };

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

  const createRow = (
    <ThreadListNew className="h-9 w-full gap-2 px-3 text-sm has-[>svg]:px-3">
      <PlusIcon className="size-4 shrink-0" />
      <span className="whitespace-nowrap">Create</span>
    </ThreadListNew>
  );

  const newChatRow = (
    <ThreadListNew className="h-9 w-full gap-2 px-3 has-[>svg]:px-3">
      <SquarePenIcon className="size-4 shrink-0" />
      <span className="whitespace-nowrap">New chat</span>
    </ThreadListNew>
  );

  const newThread =
    view === "space" ? createRow : view === "home" ? newChatRow : null;

  return (
    <SidebarNavContext.Provider value={nav}>
      <div className="relative flex h-full w-full overflow-hidden">
      <div
        data-slot="aui-app-rail"
        className="bg-muted/30 hidden h-full w-12 shrink-0 flex-col items-center gap-1 py-2 md:flex"
      >
        <TooltipIconButton
          variant="ghost"
          size="icon"
          tooltip="Home"
          side="right"
          onClick={() => {
            const wasCollapsed = sidebarCollapsed;
            if (wasCollapsed) setSidebarCollapsed(false);
            if (view !== "home") {
              setView("home");
              return;
            }
            if (!wasCollapsed) void aui.threads.switchToNewThread();
          }}
          className="size-8"
        >
          <HomeIcon className="size-4" />
        </TooltipIconButton>
        <TooltipIconButton
          variant="ghost"
          size="icon"
          tooltip="Spaces"
          side="right"
          onClick={() => {
            setSidebarCollapsed(false);
            setView(view === "space" ? "home" : "space");
          }}
          className={cn("size-8", view === "space" && "bg-muted text-foreground")}
        >
          <LayoutGridIcon className="size-4" />
        </TooltipIconButton>
        <TooltipIconButton
          variant="ghost"
          size="icon"
          tooltip="Scheduled"
          side="right"
          onClick={() => {
            setSidebarCollapsed(false);
            setView(view === "scheduled" ? "home" : "scheduled");
          }}
          className={cn(
            "size-8",
            view === "scheduled" && "bg-muted text-foreground",
          )}
        >
          <ClockIcon className="size-4" />
        </TooltipIconButton>
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
          <div
            aria-hidden="true"
            className="from-[#177e89] to-[#8fd9c8] size-8 rounded-full bg-gradient-to-br opacity-80"
          />
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
            <span className="flex-1 truncate ps-2 text-sm font-medium">
              {view === "space"
                ? "Space"
                : view === "scheduled"
                  ? "Scheduled"
                  : "Pixelspace AI Classroom"}
            </span>
          )}
          {showSearch && hasThreads && (
            <TooltipIconButton
              variant="ghost"
              size="icon"
              tooltip="Search"
              side="bottom"
              onClick={() => setSearchOpen((open) => !open)}
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
            "relative flex-1 transition-[padding,width] duration-200",
            sidebarCollapsed ? "w-12 overflow-hidden px-2 pt-1" : "w-65 overflow-y-auto p-2",
          )}
        >
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

          {view === "space" ? (
            <nav className="mt-2 flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSection(item)}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                    section === item.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <item.Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </nav>
          ) : view === "scheduled" ? (
            <div className="mt-4 flex flex-col">
              <span className="text-muted-foreground/70 px-3 py-1 text-sm">
                No scheduled tasks
              </span>
            </div>
          ) : (
            <div className="mt-4 flex flex-col">
              <span className="text-muted-foreground px-3 py-1 text-xs font-medium">
                Projects
              </span>
              <span className="text-muted-foreground/70 px-3 py-1 text-sm">
                No projects
              </span>
            </div>
          )}

          {searchOpen && !sidebarCollapsed && hasThreads && (
            <div className="pt-1 pb-1">
              <ThreadListSearch value={search} onValueChange={setSearch} />
            </div>
          )}

          {hasThreads && (
            <span className="text-muted-foreground px-3 pt-4 pb-1 text-xs font-medium">
              Recents
            </span>
          )}

          <ThreadListItems
            searchQuery={searchOpen && hasThreads ? search : ""}
            aria-hidden={sidebarCollapsed}
            inert={sidebarCollapsed}
            className={cn(
              "transition-[opacity,transform] duration-150",
              sidebarCollapsed
                ? "pointer-events-none opacity-0"
                : "translate-x-0 opacity-100",
            )}
          />
        </ThreadListRoot>
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
    </SidebarNavContext.Provider>
  );
};
