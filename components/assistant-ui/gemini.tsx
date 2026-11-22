"use client";

import {
  ActionBarPrimitive,
  AttachmentPrimitive,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  QueueItemPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  EllipsisVertical,
  ImageIcon,
  Lightbulb,
  Mic,
  Paperclip,
  PencilIcon,
  PencilRuler,
  PlusIcon,
  RefreshCwIcon,
  ScheduleIcon,
  Telescope,
  ThumbsDown,
  ThumbsUp,
  XIcon,
} from "@/components/icons";
import { HubMark as HubIcon } from "@/components/brand-icons";
import {
  type FC,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAttachmentSrc } from "@/hooks/use-attachment-src";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { AskUserDataUI } from "@/components/assistant-ui/ask-user";
import { ContextCompactedDataUI } from "@/components/assistant-ui/context-notice";
import { RenderUiBlock } from "@/components/assistant-ui/render-ui";
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/elements/tool-group.aui";
import { useSidebarNav } from "@/components/assistant-ui/clone-thread-shell";
import { useT } from "@/lib/i18n";
import { WelcomeGreeting } from "@/components/assistant-ui/welcome-greeting";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const messageGroupBy = groupPartByType({
  reasoning: ["group-chainOfThought", "group-reasoning"],
  "tool-call": ["group-chainOfThought", "group-tool"],
  // The generative-UI tool draws inline in the answer, never inside the
  // "N tool calls" group — its arguments are the component (like pixelspacev3).
  "tool-call:render_ui": [],
  "standalone-tool-call": [],
});

type GroupPart = MessagePrimitive.GroupedParts.GroupPart;

const ToolCallGroup: FC<PropsWithChildren<{ group: GroupPart }>> = ({
  group,
  children,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <ToolGroupRoot
      variant="ghost"
      open={open || group.counts.requiresAction > 0}
      onOpenChange={setOpen}
    >
      <ToolGroupTrigger
        count={group.indices.length}
        active={group.status.type === "running"}
      />
      <ToolGroupContent>{children}</ToolGroupContent>
    </ToolGroupRoot>
  );
};

/**
 * The chat surface, rendered by /chat and /chat/<threadId>. The runtime and
 * shell live in AppShell; this is only the thread itself.
 */
export const ThreadView: FC = () => {
  return (
    <>
      <AskUserDataUI />
      <ContextCompactedDataUI />
      <ThreadContent />
    </>
  );
};

const ThreadContent: FC = () => {
  const t = useT();
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col overflow-hidden bg-[#fdfcfc] text-[#1f1f1f] dark:bg-[#0c0c0c] dark:text-[#e3e3e3]">
      <AuiIf condition={(s) => s.thread.messages.length === 0}>
        <div className="relative flex grow flex-col">
          <div className="flex grow flex-col items-center justify-center px-4">
            <div className="flex w-full max-w-3xl flex-col">
              <WelcomeGreeting />
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="fade-in zoom-in-40 blur-in-[90px] motion-safe:animate-in fill-mode-both pointer-events-none absolute top-1/2 left-1/2 h-[260px] w-[680px] max-w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-[140px] bg-[#8fd9c8]/60 blur-[90px] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-[#0f4f4a]/50"
                />
                <div className="relative z-10">
                  <Composer />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.messages.length > 0}>
        <ThreadPrimitive.Viewport className="flex grow flex-col overflow-y-scroll pt-12">
          <ThreadPrimitive.Messages components={{ Message: ChatMessage }} />
          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto flex w-full flex-col items-center gap-1.5 bg-[#fdfcfc] px-4 pb-3 dark:bg-[#0c0c0c]">
            <Composer />
            <p className="text-center text-xs text-[#5e6063] dark:text-[#9aa0a6]">
              {t("chat.disclaimer")}
            </p>
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </AuiIf>
    </ThreadPrimitive.Root>
  );
};

const ghostBtnClass =
  "flex shrink-0 items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#444746]/8 hover:text-[#1f1f1f] dark:text-[#c4c7c5] dark:hover:bg-[#c4c7c5]/10 dark:hover:text-[#e3e3e3]";

const SECTION_PLACEHOLDER_KEYS: Record<
  string,
  | "chat.ask"
  | "chat.placeholder.flashcards"
  | "chat.placeholder.quizzes"
  | "chat.placeholder.mindmaps"
  | "chat.placeholder.slides"
  | "chat.placeholder.reports"
  | "chat.placeholder.infographics"
  | "chat.placeholder.notes"
> = {
  all: "chat.ask",
  flashcards: "chat.placeholder.flashcards",
  quizzes: "chat.placeholder.quizzes",
  mindmaps: "chat.placeholder.mindmaps",
  slides: "chat.placeholder.slides",
  reports: "chat.placeholder.reports",
  infographics: "chat.placeholder.infographics",
  notes: "chat.placeholder.notes",
};

const MentionInput: FC<{ placeholder: string }> = ({ placeholder }) => {
  const t = useT();
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const skipRef = useRef(false);
  const [spaces, setSpaces] = useState<
    { id: string; name: string; level: string }[] | null
  >(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      setOpen(false);
      return;
    }
    const el = inputRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at === -1) {
      setOpen(false);
      return;
    }
    const charBefore = at > 0 ? before[at - 1] : " ";
    if (charBefore && !/\s/.test(charBefore)) {
      setOpen(false);
      return;
    }
    const raw = before.slice(at + 1);
    if (raw.length > 40 || raw.includes("\n")) {
      setOpen(false);
      return;
    }
    setQuery(raw);
    setOpen(true);
  }, [text]);

  useEffect(() => {
    if (!open || spaces !== null) return;
    fetch("/api/spaces")
      .then((res) => (res.ok ? res.json() : { spaces: [] }))
      .then(
        (data: { spaces?: { id: string; name: string; level: string }[] }) =>
          setSpaces(data.spaces ?? []),
      )
      .catch(() => setSpaces([]));
  }, [open, spaces]);

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (spaces ?? [])
      .filter((space) => !needle || space.name.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [spaces, query]);

  const insert = (name: string) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at === -1) return;
    const after = text.slice(caret);
    skipRef.current = true;
    aui.composer.setText(`${text.slice(0, at)}@${name} ${after}`);
    setOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = at + name.length + 2;
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative min-w-0 flex-1">
      {open && suggestions.length > 0 ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-[#1e1f20]">
          <p className="text-muted-foreground px-3 pt-2.5 pb-1 text-xs font-medium">
            {t("chat.mentionSpaces")}
          </p>
          {suggestions.map((space) => (
            <button
              key={space.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert(space.name)}
              className="hover:bg-muted/60 flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm"
            >
              <HubIcon className="size-4 shrink-0 text-[#177e89]" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {space.name}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {space.level}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <ComposerPrimitive.Input
        ref={inputRef}
        rows={1}
        placeholder={placeholder}
        className="max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-[17px] leading-6 text-[#1f1f1f] outline-none placeholder:text-[#575b5f] dark:text-[#e3e3e3] dark:placeholder:text-[#9aa0a6]"
      />
    </div>
  );
};

const Composer: FC = () => {
  const { section } = useSidebarNav();
  const t = useT();
  const placeholder = t(SECTION_PLACEHOLDER_KEYS[section] ?? "chat.ask");

  return (
    <ComposerPrimitive.Root className="mx-auto flex w-full max-w-2xl flex-col rounded-4xl bg-white p-3 dark:bg-[#1e1f20]">
      <ComposerPrimitive.Queue>
        {() => (
          <div
            data-slot="aui-composer-queue-item"
            className="text-muted-foreground mx-1 mb-2 flex items-center gap-2 rounded-2xl bg-[#f0f4f9] px-3 py-1.5 text-xs dark:bg-[#2b2c2e]"
          >
            <ScheduleIcon className="size-3.5 shrink-0" />
            <QueueItemPrimitive.Text className="min-w-0 flex-1 truncate" />
            <span className="shrink-0 opacity-70">
              {t("chat.queueWaiting")}
            </span>
            <QueueItemPrimitive.Remove
              render={
                <button
                  type="button"
                  aria-label={t("chat.queueRemove")}
                  className="hover:text-foreground -me-0.5 shrink-0 rounded p-0.5 transition-colors"
                />
              }
            >
              <XIcon className="size-3.5" />
            </QueueItemPrimitive.Remove>
          </div>
        )}
      </ComposerPrimitive.Queue>
      <AuiIf condition={(s) => s.composer.attachments.length > 0}>
        <div className="flex flex-row gap-2.5 overflow-x-auto px-1 pt-1 pb-2.5">
          <ComposerPrimitive.Attachments
            components={{ Attachment: GeminiAttachment }}
          />
        </div>
      </AuiIf>

      <div className="flex items-end gap-1">
        <GeminiPlusMenu />
        <MentionInput placeholder={placeholder} />
        <GeminiModelPicker />
        <button
          type="button"
          aria-label={t("chat.voiceMode")}
          className={`${ghostBtnClass} size-9`}
        >
          <Mic width={20} height={20} />
        </button>
        <GeminiSendButton />
      </div>
    </ComposerPrimitive.Root>
  );
};

const GEMINI_TOOLS = [
  { id: "research", label: "Deep Research", Icon: Telescope },
  { id: "canvas", label: "Canvas", Icon: PencilRuler },
  { id: "image", label: "Create image", Icon: ImageIcon },
  { id: "learn", label: "Guided Learning", Icon: Lightbulb },
];

const GeminiPlusMenu: FC = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Add files and tools"
        className={`${ghostBtnClass} size-9`}
      >
        <PlusIcon width={20} height={20} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" className="min-w-56">
        <DropdownMenuItem render={<ComposerPrimitive.AddAttachment />}>
          <span className="flex size-4 items-center justify-center">
            <Paperclip className="size-4" />
          </span>
          Add photos &amp; files
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {GEMINI_TOOLS.map(({ id, label, Icon }) => (
          <DropdownMenuItem key={id}>
            <Icon className="size-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const GEMINI_MODELS = [
  { id: "flash", name: "Flash", description: "Fast all-around help" },
  {
    id: "thinking",
    name: "Thinking",
    description: "Reasoning, math & code",
  },
];

const GeminiModelPicker: FC = () => {
  const [model, setModel] = useState(GEMINI_MODELS[0]!.id);
  const current = GEMINI_MODELS.find((m) => m.id === model);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 shrink-0 items-center gap-0.5 rounded-full pr-1.5 pl-3 text-sm whitespace-nowrap text-[#444746] transition-colors hover:bg-[#444746]/8 hover:text-[#1f1f1f] dark:text-[#c4c7c5] dark:hover:bg-[#c4c7c5]/10 dark:hover:text-[#e3e3e3]">
        <span>{current?.name}</span>
        <ChevronDownIcon
          width={16}
          height={16}
          className="shrink-0 opacity-70"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="min-w-64">
        {GEMINI_MODELS.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => setModel(m.id)}
            className="items-start gap-3"
          >
            <span className="mt-0.5 flex size-4 items-center justify-center text-[#1b8a7f] dark:text-[#8fd9c8]">
              {m.id === model ? <CheckIcon /> : null}
            </span>
            <span className="flex flex-col">
              <span className="text-foreground text-sm">{m.name}</span>
              <span className="text-muted-foreground text-xs">
                {m.description}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const sendBtnClass =
  "flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1b8a7f] text-white transition-colors hover:bg-[#23a093]";

const GeminiSendButton: FC = () => {
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const t = useT();

  // Stopping must reach the server: aborting the fetch only stops this
  // browser reading, while the run keeps executing in the harness. Best-effort
  // — a run that already finished returns stopped: false, not an error here.
  const requestStop = () => {
    if (!remoteId) return;
    void fetch("/api/pi/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: remoteId }),
    }).catch(() => {});
  };

  return (
    <>
      <AuiIf condition={(s) => !s.thread.isRunning && !s.composer.isEmpty}>
        <ComposerPrimitive.Send
          aria-label={t("chat.send")}
          className={`${sendBtnClass} disabled:bg-[#e8eaed] disabled:text-[#1f1f1f]/40 dark:disabled:bg-[#2b2c2e] dark:disabled:text-white/30`}
        >
          <ArrowUpIcon width={20} height={20} />
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel
          onClick={requestStop}
          aria-label={t("chat.stop")}
          className={sendBtnClass}
        >
          <span className="size-3 rounded-[3px] bg-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </>
  );
};

const actionBtnClass =
  "flex size-8 items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#444746]/8 hover:text-[#1f1f1f] dark:text-[#c4c7c5] dark:hover:bg-[#c4c7c5]/10 dark:hover:text-[#e3e3e3]";

const ChatMessage: FC = () => {
  // Retries (or repeated calls) of the same generative-UI component would
  // otherwise render every draft inline. Only the last render_ui per
  // component in a message is shown; earlier drafts collapse to a note.
  // The selector must return a stable primitive — a fresh Set each call
  // would loop the store forever.
  const supersededIds = useAuiState((state) => {
    const parts = state.message.parts as unknown as {
      type?: string;
      toolName?: string;
      toolCallId?: string;
      args?: { component?: unknown };
    }[];
    const lastByComponent = new Map<string, string>();
    for (const part of parts) {
      if (part.type !== "tool-call" || part.toolName !== "render_ui") continue;
      const component =
        typeof part.args?.component === "string" ? part.args.component : "?";
      if (part.toolCallId) lastByComponent.set(component, part.toolCallId);
    }
    const ids: string[] = [];
    for (const part of parts) {
      if (part.type !== "tool-call" || part.toolName !== "render_ui") continue;
      const component =
        typeof part.args?.component === "string" ? part.args.component : "?";
      if (
        part.toolCallId &&
        lastByComponent.get(component) !== part.toolCallId
      ) {
        ids.push(part.toolCallId);
      }
    }
    return ids.join(",");
  });
  const superseded = useMemo(
    () => new Set(supersededIds ? supersededIds.split(",") : []),
    [supersededIds],
  );

  return (
    <MessagePrimitive.Root className="group/message mx-auto mb-7 flex w-full max-w-3xl flex-col px-4">
      <AuiIf condition={(s) => s.message.role === "user"}>
        <div className="flex items-center justify-end gap-1">
          <ActionBarPrimitive.Root className="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.Copy className={actionBtnClass}>
              <CopyIcon width={16} height={16} />
            </ActionBarPrimitive.Copy>
            <ActionBarPrimitive.Edit className={actionBtnClass}>
              <PencilIcon width={16} height={16} />
            </ActionBarPrimitive.Edit>
          </ActionBarPrimitive.Root>
          <div className="max-w-[75%] rounded-3xl bg-[#f2f0f0] px-5 py-3 wrap-break-word text-[#1f1f1f] dark:bg-[#333537] dark:text-[#e3e3e3]">
            <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
          </div>
        </div>
      </AuiIf>

      <AuiIf condition={(s) => s.message.role === "assistant"}>
        <div className="flex flex-col">
          <div className="wrap-break-word text-[#1f1f1f] dark:text-[#e3e3e3]">
            <MessagePrimitive.GroupedParts groupBy={messageGroupBy}>
              {({ part, children }) => {
                switch (part.type) {
                  case "group-chainOfThought":
                    return <div>{children}</div>;
                  case "group-tool":
                    return (
                      <ToolCallGroup group={part}>{children}</ToolCallGroup>
                    );
                  case "group-reasoning":
                  case "reasoning":
                    // The harness stores thinking but never displays it —
                    // same as pixelspacev3's transcript.
                    return null;
                  case "text":
                    return <MarkdownText />;
                  case "tool-call":
                    if (part.toolName === "render_ui") {
                      if (part.toolCallId && superseded.has(part.toolCallId)) {
                        return (
                          <p className="text-muted-foreground my-2 text-xs">
                            Draf terdahulu digantikan dengan versi terkini.
                          </p>
                        );
                      }
                      return (
                        <RenderUiBlock
                          args={part.args}
                          status={part.status.type}
                          error={
                            part.status.type === "incomplete"
                              ? part.status.error
                              : undefined
                          }
                        />
                      );
                    }
                    return part.toolUI ?? <ToolFallback {...part} />;
                  case "data":
                    return part.dataRendererUI;
                  case "indicator":
                    return (
                      <span
                        className="animate-pulse font-sans"
                        aria-label="Assistant is working"
                      >
                        {"\u25cf"}
                      </span>
                    );
                  default:
                    return null;
                }
              }}
            </MessagePrimitive.GroupedParts>
          </div>
          <MessagePrimitive.Error>
            <ErrorPrimitive.Root className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              <ErrorPrimitive.Message className="line-clamp-3" />
            </ErrorPrimitive.Root>
          </MessagePrimitive.Error>
          <ActionBarPrimitive.Root className="mt-1.5 -ml-2 flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
            <ActionBarPrimitive.FeedbackPositive className={actionBtnClass}>
              <ThumbsUp width={16} height={16} />
            </ActionBarPrimitive.FeedbackPositive>
            <ActionBarPrimitive.FeedbackNegative className={actionBtnClass}>
              <ThumbsDown width={16} height={16} />
            </ActionBarPrimitive.FeedbackNegative>
            <ActionBarPrimitive.Copy className={actionBtnClass}>
              <AuiIf condition={(s) => s.message.isCopied}>
                <CheckIcon width={16} height={16} />
              </AuiIf>
              <AuiIf condition={(s) => !s.message.isCopied}>
                <CopyIcon width={16} height={16} />
              </AuiIf>
            </ActionBarPrimitive.Copy>
            <ActionBarPrimitive.Reload className={actionBtnClass}>
              <RefreshCwIcon width={16} height={16} />
            </ActionBarPrimitive.Reload>
            <button type="button" aria-label="More" className={actionBtnClass}>
              <EllipsisVertical width={16} height={16} />
            </button>
          </ActionBarPrimitive.Root>
        </div>
      </AuiIf>
    </MessagePrimitive.Root>
  );
};

const GeminiAttachment: FC = () => {
  const isImage = useAuiState(({ attachment }) => attachment.type === "image");
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root className="group/thumbnail relative">
      <div className="size-[72px] overflow-hidden rounded-xl border border-[#dadce0] bg-[#f1f3f4] dark:border-[#3c4043] dark:bg-[#282a2c]">
        {isImage && src ? (
          <img className="size-full object-cover" alt="Attachment" src={src} />
        ) : (
          <div className="flex size-full items-center justify-center text-[#5e6063] dark:text-[#9aa0a6]">
            <AttachmentPrimitive.unstable_Thumb className="text-xs" />
          </div>
        )}
      </div>
      <AttachmentPrimitive.Remove
        className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border border-[#dadce0] bg-white text-[#5e6063] opacity-0 transition-all group-focus-within/thumbnail:opacity-100 group-hover/thumbnail:opacity-100 hover:bg-[#f1f3f4] hover:text-[#1f1f1f] dark:border-[#3c4043] dark:bg-[#1e1f20] dark:text-[#9aa0a6] dark:hover:bg-[#2b2c2f] dark:hover:text-[#e3e3e3]"
        aria-label="Remove attachment"
      >
        <XIcon width={14} height={14} />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
};
