"use client";

import { useState, type FC } from "react";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { makeAssistantDataUI, useAui } from "@assistant-ui/react";
import { Button } from "@/components/ui/button";

export type AskUserData = {
  questionId: string;
  question: string;
  options: string[];
  kind: "question" | "approval";
};

/**
 * The pi `ask_user` prompt: the agent has paused the run and is waiting for an
 * answer (elicitation, or an approval). Mirrors pixelspacev3's AskUserPrompt —
 * option buttons plus a free-text field — and delivers the answer through our
 * relay to the harness's /answer endpoint.
 */
export const AskUserPrompt: FC<{ data: AskUserData }> = ({ data }) => {
  const aui = useAui();
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || pending || sent) return;
    setPending(true);
    setError(null);
    try {
      const threadId = aui.threadListItem.getState().remoteId;
      const res = await fetch("/api/pi/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          questionId: data.questionId,
          answer: trimmed,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSent(trimmed);
    } catch {
      setError("Could not send the answer — try again.");
    }
    setPending(false);
  };

  if (sent) {
    return (
      <div className="text-muted-foreground my-3 flex items-center gap-2 text-sm">
        <CheckIcon className="size-4 shrink-0 text-emerald-500" />
        Answered:
        <span className="text-foreground font-medium">{sent}</span>
      </div>
    );
  }

  return (
    <div className="border-border/60 bg-card my-3 rounded-xl border p-4">
      <p className="text-sm font-medium">{data.question}</p>

      {data.options.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.options.map((option) => (
            <Button
              key={option}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void submit(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      )}

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(answer);
        }}
      >
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          disabled={pending}
          placeholder="Type your answer…"
          className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 min-w-0 flex-1 rounded-full border px-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
        />
        <Button type="submit" size="sm" disabled={pending || !answer.trim()}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : "Send"}
        </Button>
      </form>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
};

/** Registered under the `ask-user` data part name the chat relay emits. */
export const AskUserDataUI = makeAssistantDataUI<AskUserData>({
  name: "ask-user",
  render: (props) => <AskUserPrompt data={props.data} />,
});
