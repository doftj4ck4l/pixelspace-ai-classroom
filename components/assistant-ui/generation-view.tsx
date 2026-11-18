"use client";

import { CheckIcon, Loader2Icon, RotateCcwIcon, SparklesIcon, XIcon } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";

export const GenerationView: FC<{
  kind: "slides" | "flashcards";
  topic: string;
  steps: string[];
  error: string | null;
  onCancel: () => void;
  onRetry: () => void;
}> = ({ kind, topic, steps, error, onCancel, onRetry }) => {
  const label = kind === "flashcards" ? "flashcards" : "slide deck";

  return (
    <div className="bg-background flex h-full flex-col items-center justify-center px-4">
      <div className="border-border/60 w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
            {error ? (
              <XIcon className="size-5 text-red-500" />
            ) : (
              <SparklesIcon className="size-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {error ? "Generation failed" : `Creating your ${label}`}
            </p>
            <p className="text-muted-foreground truncate text-xs">{topic}</p>
          </div>
        </div>

        {!error && (
          <div className="mt-5 flex flex-col gap-2.5">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1;
              return (
                <div key={step} className="flex items-center gap-2.5 text-sm">
                  {isLast ? (
                    <Loader2Icon className="text-muted-foreground size-4 shrink-0 animate-spin" />
                  ) : (
                    <CheckIcon className="size-4 shrink-0 text-emerald-500" />
                  )}
                  <span
                    className={
                      isLast ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="text-muted-foreground mt-4 text-sm">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {error && (
            <Button onClick={onRetry}>
              <RotateCcwIcon className="size-4" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
