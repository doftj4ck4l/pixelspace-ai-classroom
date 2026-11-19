"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { PaperclipIcon, SparklesIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type CreateDialogInput = {
  topic: string;
  language: "en" | "bm" | "both";
  files: string[];
};

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "bm", label: "Bahasa Malaysia" },
  { id: "both", label: "Both" },
] as const;

export const CreateDialog: FC<{
  open: boolean;
  /** Lower-case label, e.g. "flashcards", "mind maps". */
  label: string;
  /** Whether AI generation is available for this module yet. */
  supported: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (input: CreateDialogInput) => void;
  onCreateEmpty: () => void;
}> = ({ open, label, supported, onOpenChange, onGenerate, onCreateEmpty }) => {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<"en" | "bm" | "both">("both");
  const [files, setFiles] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTopic("");
      setLanguage("both");
      setFiles([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4" />
            New {label}
          </DialogTitle>
          <DialogDescription>
            {supported
              ? "Describe what it should be about. The AI researches the topic and decides the structure and length — refine it afterwards by chat."
              : `AI generation for ${label} is coming soon. You can still create an empty ${label} item and fill it in yourself.`}
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          autoFocus
          disabled={!supported}
          placeholder={`What's it about? e.g. "Fotosintesis, Form 3 Science"`}
          className="border-border/60 bg-background focus-visible:ring-ring/40 min-h-24 w-full resize-none rounded-lg border p-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
        />

        {supported && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {LANGUAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLanguage(item.id)}
                  className={cn(
                    "h-8 rounded-full px-3.5 text-sm transition-colors",
                    language === item.id
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <PaperclipIcon className="size-4" />
                  Attach files
                </Button>
                <span className="text-muted-foreground text-xs">
                  Optional — the AI uses them as context
                </span>
              </div>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {files.map((name) => (
                    <span
                      key={name}
                      className="bg-muted flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                    >
                      <span className="max-w-40 truncate">{name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${name}`}
                        onClick={() =>
                          setFiles((prev) => prev.filter((f) => f !== name))
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {supported ? (
            <Button
              disabled={!topic.trim()}
              onClick={() =>
                onGenerate({ topic: topic.trim(), language, files })
              }
            >
              <SparklesIcon className="size-4" />
              Generate
            </Button>
          ) : (
            <Button onClick={onCreateEmpty}>Create empty {label}</Button>
          )}
        </DialogFooter>

        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            const names = Array.from(event.target.files ?? []).map(
              (file) => file.name,
            );
            setFiles((prev) => [...new Set([...prev, ...names])]);
            event.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
