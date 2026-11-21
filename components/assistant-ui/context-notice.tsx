"use client";

import { makeAssistantDataUI } from "@assistant-ui/react";
import { CompressIcon } from "@/components/icons";

/**
 * Divider shown when the harness compacted older turns to fit the model's
 * context window. The relay forwards the harness's `context.compacted` event
 * as a `context-compacted` data part; this renders it inline in the thread.
 */

type ContextCompactedData = {
  fromTokens: number;
  toTokens: number;
};

const formatTokens = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`
    : String(value);

const ContextCompactedDivider = ({ data }: { data: ContextCompactedData }) => (
  <div
    data-slot="aui-context-compacted"
    className="text-muted-foreground/70 my-2 flex items-center gap-2 px-2 text-xs"
  >
    <span className="bg-border h-px flex-1" />
    <span className="flex shrink-0 items-center gap-1.5">
      <CompressIcon className="size-3.5" />
      Konteks dipadatkan · {formatTokens(data.fromTokens)} →{" "}
      {formatTokens(data.toTokens)} token
    </span>
    <span className="bg-border h-px flex-1" />
  </div>
);

export const ContextCompactedDataUI = makeAssistantDataUI<ContextCompactedData>(
  {
    name: "context-compacted",
    render: (props) => <ContextCompactedDivider data={props.data} />,
  },
);
