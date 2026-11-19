"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import { MessageCircleIcon, SearchIcon, XIcon } from "lucide-react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Chat search as a dialog (ChatGPT-style): a query box with the recent chats
 * underneath, filtered as you type. Picking one switches to that thread.
 */
export const SearchDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const aui = useAui();
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...threadItems]
      .filter((thread) => (thread.title ?? "New chat").toLowerCase().includes(q))
      .sort(
        (a, b) =>
          (b.lastMessageAt?.getTime() ?? 0) -
          (a.lastMessageAt?.getTime() ?? 0),
      )
      .slice(0, 20);
  }, [threadItems, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[16%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search chats</DialogTitle>

        <div className="flex items-center gap-2.5 border-b px-4">
          <SearchIcon className="text-muted-foreground size-4 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                void aui.threads.switchToThread(results[0].id);
                onOpenChange(false);
              }
            }}
            placeholder="Search..."
            aria-label="Search chats"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8f8f8f]"
          />
          <button
            type="button"
            aria-label="Close search"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="scrollbar-subtle max-h-96 overflow-y-auto p-2">
          <p className="text-muted-foreground px-2.5 pt-2 pb-1 text-xs font-medium">
            {query.trim() ? "Results" : "Recent chats"}
          </p>
          {results.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => {
                void aui.threads.switchToThread(thread.id);
                onOpenChange(false);
              }}
              className="hover:bg-muted/60 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors"
            >
              <MessageCircleIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {thread.title ?? "New chat"}
              </span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="text-muted-foreground px-2.5 py-3 text-sm">
              {query.trim() ? "No chats found" : "No chats yet"}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
