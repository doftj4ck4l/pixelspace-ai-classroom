"use client";

import { Suspense, lazy, useState, type FC, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangleIcon,
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import {
  FlashcardDeck,
  type FlashcardSpec,
} from "@/components/assistant-ui/flashcard-deck";
import {
  QuizRunner,
  type QuizSpec,
} from "@/components/assistant-ui/quiz-runner";
import {
  LearningMap,
  type MindMapSpec,
} from "@/components/assistant-ui/learning-map";
import { cn } from "@/lib/utils";

/**
 * Inline renderer for the pi harness's `render_ui` generative-UI tool,
 * mirroring pixelspacev3: the tool call's arguments ARE the component, so the
 * block renders from the args as soon as they arrive; the tool result only
 * confirms that the harness validated the spec.
 */

const Chart = lazy(() =>
  import("./render-ui-chart").then((m) => ({ default: m.Chart })),
);

type ChartProps = {
  type: "bar" | "line" | "area" | "pie" | "scatter";
  data: Record<string, unknown>[];
  x: string;
  y: string | string[];
  title?: string;
  color?: string;
  colors?: string[];
};

type TableProps = {
  columns: {
    key: string;
    label?: string;
    align?: "left" | "right" | "center";
  }[];
  rows: Record<string, unknown>[];
  caption?: string;
};

type StatProps = {
  label: string;
  value: string | number;
  delta?: string | number;
  trend?: "up" | "down" | "flat";
  help?: string;
};

type CardProps = {
  title?: string;
  body?: string;
  fields?: { label: string; value: string }[];
  accent?: "default" | "primary" | "success" | "warning" | "destructive";
};

export const RenderUiBlock: FC<{
  args: unknown;
  status: "running" | "complete" | "requires-action" | "incomplete";
  error?: unknown;
}> = ({ args, status, error }) => {
  if (status === "incomplete") {
    return (
      <ErrorNote
        reason={
          typeof error === "string" && error.trim()
            ? error.trim()
            : "the harness rejected this block"
        }
      />
    );
  }

  const spec = parseSpec(args);
  if (!spec) {
    return status === "running" ? (
      <Skeleton />
    ) : (
      <ErrorNote reason="invalid block spec" />
    );
  }

  switch (spec.component) {
    case "card":
      return <Card {...(spec.props as CardProps)} />;
    case "stat":
      return <Stat {...(spec.props as StatProps)} />;
    case "table":
      return <DataTable {...(spec.props as TableProps)} />;
    case "chart":
      return (
        <Suspense fallback={<Skeleton />}>
          <Chart {...(spec.props as ChartProps)} />
        </Suspense>
      );
    case "flashcards":
      return (
        <FlashcardDeck spec={spec.props as FlashcardSpec} variant="inline" />
      );
    case "quizzes":
      return <QuizRunner spec={spec.props as QuizSpec} variant="inline" />;
    case "mindmaps":
      return <LearningMap spec={spec.props as MindMapSpec} variant="inline" />;
    default:
      return <ErrorNote reason={`unknown component "${spec.component}"`} />;
  }
};

/** The model occasionally stringifies `props`; coerce defensively. */
function parseSpec(
  args: unknown,
): { component: string; props: Record<string, unknown> } | null {
  if (!args || typeof args !== "object") return null;
  const raw = args as { component?: unknown; props?: unknown };
  if (typeof raw.component !== "string") return null;

  let props = raw.props;
  if (typeof props === "string") {
    try {
      props = JSON.parse(props);
    } catch {
      return null;
    }
  }
  if (!props || typeof props !== "object" || Array.isArray(props)) return null;

  return { component: raw.component, props: props as Record<string, unknown> };
}

const Skeleton: FC = () => (
  <div
    className="bg-muted/30 my-4 h-[120px] animate-pulse rounded-lg border"
    aria-label="Preparing…"
  />
);

const ErrorNote: FC<{ reason: string }> = ({ reason }) => (
  <div className="border-border/60 bg-muted/20 text-muted-foreground my-4 flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs">
    <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
    <span>Could not render a UI block ({reason}).</span>
  </div>
);

const ACCENT: Record<NonNullable<CardProps["accent"]>, string> = {
  default: "border-l-border",
  primary: "border-l-primary",
  success: "border-l-emerald-500",
  warning: "border-l-amber-500",
  destructive: "border-l-destructive",
};

const Markdown: FC<{ children: string }> = ({ children }) => (
  <div className="[&_code]:bg-muted [&_a]:underline [&_code]:rounded [&_code]:px-1 [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:ps-4 [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:ps-4">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);

function Card({ title, body, fields, accent = "default" }: CardProps) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card text-card-foreground my-4 rounded-lg border border-l-2 p-4",
        ACCENT[accent] ?? ACCENT.default,
      )}
    >
      {title ? (
        <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      ) : null}
      {body ? (
        <div className={cn("text-sm", title && "mt-1.5")}>
          <Markdown>{body}</Markdown>
        </div>
      ) : null}
      {fields?.length ? (
        <dl
          className={cn(
            "grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm",
            (title || body) && "mt-3",
          )}
        >
          {fields.map((field, index) => (
            <div key={index} className="col-span-2 grid grid-cols-subgrid">
              <dt className="text-muted-foreground">{field.label}</dt>
              <dd className="text-foreground font-medium">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function Stat({ label, value, delta, trend, help }: StatProps) {
  const dir = trend ?? inferTrend(delta);
  const Icon =
    dir === "up"
      ? ArrowUpRightIcon
      : dir === "down"
        ? ArrowDownRightIcon
        : ArrowRightIcon;

  return (
    <div className="border-border/60 bg-card text-card-foreground my-4 inline-flex min-w-[10rem] flex-col rounded-lg border px-4 py-3">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
        {value}
      </span>
      {delta !== undefined ? (
        <span
          className={cn(
            "mt-1 inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
            dir === "up" && "text-emerald-600 dark:text-emerald-400",
            dir === "down" && "text-red-600 dark:text-red-400",
            dir === "flat" && "text-muted-foreground",
          )}
        >
          <Icon className="size-3" />
          {delta}
        </span>
      ) : null}
      {help ? (
        <span className="text-muted-foreground mt-1 text-xs">{help}</span>
      ) : null}
    </div>
  );
}

function inferTrend(delta: StatProps["delta"]): "up" | "down" | "flat" {
  if (delta === undefined) return "flat";
  const n =
    typeof delta === "number"
      ? delta
      : Number(String(delta).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n) || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}

function DataTable({ columns, rows, caption }: TableProps) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = sort
    ? [...rows].sort((a, b) => compare(a[sort.key], b[sort.key]) * sort.dir)
    : rows;

  const toggle = (key: string) =>
    setSort((s) =>
      s?.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 },
    );

  return (
    <div className="border-border/60 bg-card text-card-foreground my-4 overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border/60 border-b">
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => toggle(column.key)}
                  className={cn(
                    "text-muted-foreground hover:text-foreground cursor-pointer px-3 py-2 text-left text-xs font-medium select-none",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {column.label ?? column.key}
                    {sort?.key === column.key ? (
                      sort.dir === 1 ? (
                        <ChevronUpIcon className="size-3" />
                      ) : (
                        <ChevronDownIcon className="size-3" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr
                key={index}
                className="border-border/40 border-b last:border-0"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-3 py-2 text-[0.8125rem]",
                      column.align === "right" && "text-right tabular-nums",
                      column.align === "center" && "text-center",
                    )}
                  >
                    {cell(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <p className="border-border/60 text-muted-foreground border-t px-3 py-2 text-xs">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

function cell(value: unknown): ReactNode {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function compare(a: unknown, b: unknown): number {
  const na = typeof a === "number" ? a : Number(a);
  const nb = typeof b === "number" ? b : Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a ?? "").localeCompare(String(b ?? ""));
}
