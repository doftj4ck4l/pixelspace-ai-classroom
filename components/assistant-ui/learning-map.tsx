"use client";

import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CompassIcon,
  Loader2Icon,
  LockIcon,
  RotateCcwIcon,
  SendIcon,
  SparklesIcon,
  WaypointsIcon,
  XIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { accentTheme } from "@/components/assistant-ui/flashcard-deck";
import {
  applyChallengeResult,
  applySeen,
  isDue,
  type NodeState,
} from "@/lib/mindmaps/progress";
import {
  type MindMapChallenge,
  type MindMapNode,
  type MindMapSpec,
} from "@/lib/mindmaps/spec";

export type { MindMapNode, MindMapSpec } from "@/lib/mindmaps/spec";

/**
 * The interactive Learning Map: an expandable knowledge graph (React Flow +
 * dagre) where every node is a small learning experience — summary, details,
 * inline challenges, and a scoped "ask the AI" tutor. Mastery is tracked per
 * node (levels 0-3) with spaced repetition, and node appearance reflects it.
 */

type ConceptNodeData = {
  nodeId: string;
  label: string;
  emoji?: string;
  level: 0 | 1 | 2 | 3;
  due: boolean;
  childCount: number;
  collapsed: boolean;
  onToggle?: (id: string) => void;
} & Record<string, unknown>;

const LEVEL_RING: Record<number, string> = {
  0: "border-border/60 opacity-80",
  1: "border-sky-400/80",
  2: "border-amber-400/90",
  3: "border-emerald-500/90 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]",
};

const LEVEL_LABEL = [
  "Belum diterokai",
  "Dilihat",
  "Sedang dikuasai",
  "Dikuasai",
];

const ConceptNode: FC<NodeProps<Node<ConceptNodeData>>> = ({
  data,
  selected,
}) => (
  <div
    className={cn(
      "bg-card relative max-w-44 min-w-28 rounded-xl border px-3 py-2 text-center shadow-sm transition-shadow",
      LEVEL_RING[data.level] ?? LEVEL_RING[0],
      selected && "ring-foreground/25 ring-2",
      data.due && "animate-pulse",
    )}
  >
    <Handle
      type="target"
      position={Position.Top}
      className="!border-0 !bg-transparent"
    />
    <div className="flex items-center justify-center gap-1.5">
      <span className="text-base leading-none">{data.emoji ?? "💡"}</span>
      {data.level >= 3 && (
        <CircleCheckIcon className="size-3.5 text-emerald-500" />
      )}
    </div>
    <p className="mt-1 text-[11px] leading-snug font-medium">{data.label}</p>
    {data.childCount > 0 && data.onToggle && (
      <button
        type="button"
        aria-label={data.collapsed ? "Kembangkan" : "Kuncupkan"}
        onClick={(event) => {
          event.stopPropagation();
          data.onToggle?.(data.nodeId);
        }}
        className="bg-muted text-muted-foreground hover:text-foreground absolute -bottom-2.5 left-1/2 flex h-5 min-w-5 -translate-x-1/2 items-center justify-center gap-0.5 rounded-full px-1 text-[9px] transition-colors"
      >
        {data.collapsed ? (
          <>
            <ChevronDownIcon className="size-3" />
            {data.childCount}
          </>
        ) : (
          <ChevronUpIcon className="size-3" />
        )}
      </button>
    )}
    <Handle
      type="source"
      position={Position.Bottom}
      className="!border-0 !bg-transparent"
    />
  </div>
);

const nodeTypes = { concept: ConceptNode };

/** Hidden when any ancestor is collapsed. */
const visibleNodeIds = (nodes: MindMapNode[], collapsed: Set<string>) => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, MindMapNode[]>();
  const roots: MindMapNode[] = [];
  for (const node of nodes) {
    if (node.parent && byId.has(node.parent)) {
      const list = children.get(node.parent) ?? [];
      list.push(node);
      children.set(node.parent, list);
    } else {
      roots.push(node);
    }
  }
  const visible = new Set<string>();
  const walk = (node: MindMapNode) => {
    visible.add(node.id);
    if (collapsed.has(node.id)) return;
    for (const child of children.get(node.id) ?? []) walk(child);
  };
  for (const root of roots) walk(root);
  return visible;
};

const NODE_W = 156;
const NODE_H = 68;

export const LearningMap: FC<{
  spec: MindMapSpec;
  variant?: "inline" | "full";
  /** When given, mastery persists per account via /api/mindmaps/<id>/progress. */
  mapId?: string;
  onClose?: () => void;
  onNodeChange?: (index: number) => void;
  onImproveNode?: (index: number, node: MindMapNode) => void;
  initialIndex?: number;
}> = ({
  spec,
  variant = "inline",
  mapId,
  onClose,
  onNodeChange,
  onImproveNode,
  initialIndex,
}) => {
  const full = variant === "full";
  const theme = accentTheme(spec.accent);
  const total = spec.nodes.length;

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof initialIndex === "number"
      ? (spec.nodes[initialIndex]?.id ?? null)
      : null,
  );
  const [nodeState, setNodeState] = useState<Record<string, NodeState>>({});

  /* ------------------------------------------------- progress persistence */

  const persist = useCallback(
    (next: Record<string, NodeState>) => {
      if (!mapId) return;
      void fetch(`/api/mindmaps/${mapId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeState: next, total }),
      }).catch(() => {});
    },
    [mapId, total],
  );

  useEffect(() => {
    if (!mapId) return;
    let cancelled = false;
    fetch(`/api/mindmaps/${mapId}/progress`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { nodeState?: Record<string, NodeState> } | null) => {
        if (cancelled || !data?.nodeState) return;
        if (Object.keys(data.nodeState).length > 0) {
          setNodeState(data.nodeState);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mapId]);

  const selected = selectedId
    ? (spec.nodes.find((node) => node.id === selectedId) ?? null)
    : null;
  const selectedIndex = selected
    ? spec.nodes.findIndex((node) => node.id === selected.id)
    : -1;

  useEffect(() => {
    if (full && selectedIndex >= 0) onNodeChange?.(selectedIndex);
  }, [full, selectedIndex, onNodeChange]);

  const selectNode = useCallback(
    (id: string) => {
      setSelectedId(id);
      const now = Date.now();
      setNodeState((prev) => {
        const current = prev[id];
        if (current && current.level >= 1) return prev;
        const next = { ...prev, [id]: applySeen(current, now) };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const recordChallenge = useCallback(
    (nodeId: string, correct: boolean) => {
      setNodeState((prev) => {
        const next = {
          ...prev,
          [nodeId]: applyChallengeResult(prev[nodeId], correct),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* ------------------------------------------------------------ graph data */

  const { nodes, edges } = useMemo(() => {
    const visible = visibleNodeIds(spec.nodes, collapsed);
    const visibleNodes = spec.nodes.filter((node) => visible.has(node.id));
    const childCount = new Map<string, number>();
    for (const node of spec.nodes) {
      if (node.parent) {
        childCount.set(node.parent, (childCount.get(node.parent) ?? 0) + 1);
      }
    }

    const graph = new dagre.graphlib.Graph();
    graph.setGraph({
      rankdir: "TB",
      nodesep: 26,
      ranksep: 64,
      marginx: 16,
      marginy: 16,
    });
    graph.setDefaultEdgeLabel(() => ({}));
    for (const node of visibleNodes) {
      graph.setNode(node.id, { width: NODE_W, height: NODE_H });
    }
    for (const node of visibleNodes) {
      if (node.parent && visible.has(node.parent)) {
        graph.setEdge(node.parent, node.id);
      }
    }
    dagre.layout(graph);

    const now = Date.now();
    const flowNodes: Node<ConceptNodeData>[] = visibleNodes.map((node) => {
      const position = graph.node(node.id);
      const state = nodeState[node.id];
      return {
        id: node.id,
        type: "concept",
        position: {
          x: (position?.x ?? 0) - NODE_W / 2,
          y: (position?.y ?? 0) - NODE_H / 2,
        },
        data: {
          nodeId: node.id,
          label: node.label,
          ...(node.emoji ? { emoji: node.emoji } : {}),
          level: (state?.level ?? 0) as 0 | 1 | 2 | 3,
          due: isDue(state, now),
          childCount: childCount.get(node.id) ?? 0,
          collapsed: collapsed.has(node.id),
          ...(childCount.get(node.id) ? { onToggle: toggleCollapse } : {}),
        },
      };
    });

    const flowEdges: Edge[] = [];
    for (const node of visibleNodes) {
      if (node.parent && visible.has(node.parent)) {
        flowEdges.push({
          id: `${node.parent}->${node.id}`,
          source: node.parent,
          target: node.id,
          type: "smoothstep",
          style: { stroke: "var(--border)", strokeWidth: 1.5 },
        });
      }
    }
    for (const edge of spec.edges ?? []) {
      if (!visible.has(edge.from) || !visible.has(edge.to)) continue;
      flowEdges.push({
        id: `x-${edge.from}->${edge.to}`,
        source: edge.from,
        target: edge.to,
        type: "smoothstep",
        label: edge.label,
        style: { strokeDasharray: "6 4", stroke: "var(--muted-foreground)" },
        labelStyle: { fontSize: 10, fill: "var(--muted-foreground)" },
      });
    }
    return { nodes: flowNodes, edges: flowEdges };
  }, [spec, collapsed, nodeState, toggleCollapse]);

  if (total === 0) {
    return (
      <div className="text-muted-foreground border-border/60 my-4 rounded-xl border border-dashed p-4 text-sm">
        This learning map has no nodes.
      </div>
    );
  }

  const explored = Object.values(nodeState).filter((s) => s.level >= 1).length;
  const mastered = Object.values(nodeState).filter((s) => s.level >= 3).length;
  const dueCount = spec.nodes.filter((node) =>
    isDue(nodeState[node.id]),
  ).length;
  const mastery = total > 0 ? Math.round((mastered / total) * 100) : 0;

  const canvas = (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={1.6}
      onNodeClick={(_, node) => selectNode(node.id)}
      className="[&_.react-flow\_\_attribution]:text-[8px]"
    >
      <Background gap={22} size={1.5} className="opacity-50" />
      {full && <Controls showInteractive={false} />}
    </ReactFlow>
  );

  /* ---------------------------------------------------------------- inline */

  if (!full) {
    return (
      <div className="border-border/60 bg-card my-4 w-full max-w-2xl overflow-hidden rounded-2xl border">
        <div className={cn("bg-gradient-to-r px-4 py-3", theme.header)}>
          <div className="flex items-center gap-2">
            <WaypointsIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {spec.title ?? "Peta Pembelajaran"}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                theme.chip,
              )}
            >
              {total} konsep
            </span>
          </div>
          {spec.subject ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {spec.subject}
            </p>
          ) : null}
        </div>
        <div className="h-72 w-full">{canvas}</div>
        <p className="text-muted-foreground border-border/60 border-t px-4 py-2 text-center text-[11px]">
          Ketik mana-mana nod untuk penerangan, cabaran dan soalan AI.
        </p>
        {selected && (
          <NodePanel
            spec={spec}
            node={selected}
            state={nodeState[selected.id]}
            theme={theme}
            onClose={() => setSelectedId(null)}
            onChallenge={recordChallenge}
          />
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------------ full */

  return (
    <div className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <header className="border-border/60 shrink-0 border-b px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-3">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              onClick={onClose}
              aria-label="Kembali ke peta pembelajaran"
            >
              <ArrowLeftIcon className="size-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl leading-snug font-semibold tracking-tight sm:text-2xl">
              {spec.title ?? "Peta Pembelajaran"}
            </h1>
            {spec.subject && (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                {spec.subject}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2">
          <span className="border-border/60 inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium">
            <WaypointsIcon className="text-muted-foreground size-3.5" />
            {total} konsep
          </span>
          <span
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium",
              theme.chip,
            )}
          >
            <CircleCheckIcon className="size-3.5" />
            {mastered} dikuasai
          </span>
          {dueCount > 0 && (
            <span className="inline-flex h-8 animate-pulse items-center gap-2 rounded-full bg-amber-500/15 px-3 text-xs font-medium text-amber-700 dark:text-amber-300">
              <RotateCcwIcon className="size-3.5" />
              {dueCount} perlu ulang
            </span>
          )}
          <div className="bg-muted/70 mx-1 hidden h-1 min-w-24 flex-1 overflow-hidden rounded-full sm:block">
            <div
              className={cn("h-full transition-all duration-300", theme.bar)}
              style={{ width: `${mastery}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {explored} diterokai daripada {total} · {mastery}%
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
        <div
          role="tablist"
          aria-label="Mod peta pembelajaran"
          className="bg-muted/60 flex w-full max-w-lg items-center gap-0.5 rounded-full p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium sm:gap-2 sm:px-4",
              theme.pill,
            )}
          >
            <CompassIcon className="size-4 shrink-0" />
            <span className="truncate">Terokai</span>
          </button>
          <button
            type="button"
            disabled
            title="Akan datang"
            className="text-muted-foreground/60 flex h-9 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-full px-2 text-sm sm:gap-2 sm:px-4"
          >
            <LockIcon className="size-3.5 shrink-0" />
            <span className="truncate">Bina</span>
          </button>
          <button
            type="button"
            disabled
            title="Akan datang"
            className="text-muted-foreground/60 flex h-9 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-full px-2 text-sm sm:gap-2 sm:px-4"
          >
            <LockIcon className="size-3.5 shrink-0" />
            <span className="truncate">Cabar</span>
          </button>
        </div>
      </div>

      <div className="mx-auto min-h-0 w-full max-w-6xl flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <div className="border-border/60 h-full min-h-80 w-full overflow-hidden rounded-2xl border">
          {canvas}
        </div>
      </div>

      {selected && (
        <NodePanel
          spec={spec}
          node={selected}
          state={nodeState[selected.id]}
          theme={theme}
          mapId={mapId}
          onClose={() => setSelectedId(null)}
          onChallenge={recordChallenge}
          onImprove={
            onImproveNode
              ? () => onImproveNode(selectedIndex, selected)
              : undefined
          }
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------- node panel */

const NodePanel: FC<{
  spec: MindMapSpec;
  node: MindMapNode;
  state?: NodeState;
  theme: ReturnType<typeof accentTheme>;
  mapId?: string;
  onClose: () => void;
  onChallenge: (nodeId: string, correct: boolean) => void;
  onImprove?: () => void;
}> = ({ node, state, theme, mapId, onClose, onChallenge, onImprove }) => {
  const level = (state?.level ?? 0) as 0 | 1 | 2 | 3;
  const due = isDue(state);
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end max-md:items-end"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="bg-background border-border/60 h-full w-full max-w-md overflow-y-auto border-l shadow-2xl max-md:h-[78vh] max-md:rounded-t-2xl max-md:border-t max-md:border-l-0"
      >
        <div className="border-border/60 bg-background/95 sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3 backdrop-blur">
          <span className="text-xl leading-none">{node.emoji ?? "💡"}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{node.label}</p>
            <p className="text-muted-foreground text-[11px]">
              {LEVEL_LABEL[level]}
              {due && " · perlu ulang"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-lg transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {node.kind && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                  theme.pill,
                )}
              >
                {node.kind}
              </span>
            )}
            {node.source && (
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]">
                Sumber: {node.source}
              </span>
            )}
            {node.aiAdded && (
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                Ditambah AI
              </span>
            )}
          </div>

          {node.summary && (
            <p className="text-sm leading-relaxed font-medium">
              {node.summary}
            </p>
          )}
          {node.details && (
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {node.details}
            </p>
          )}

          {node.challenges?.length ? (
            <div className="grid gap-3">
              <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                Cabaran pantas
              </p>
              {node.challenges.map((challenge, index) => (
                <ChallengeCard
                  key={index}
                  challenge={challenge}
                  theme={theme}
                  onResult={(correct) => onChallenge(node.id, correct)}
                />
              ))}
            </div>
          ) : null}

          {mapId ? (
            <NodeAsk key={node.id} mapId={mapId} nodeId={node.id} />
          ) : (
            <p className="text-muted-foreground text-xs">
              Buka peta ini di Spaces untuk bertanya kepada AI tentang nod ini.
            </p>
          )}

          {onImprove && (
            <button
              type="button"
              onClick={onImprove}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
            >
              <SparklesIcon className="size-3.5" />
              Improve with AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* --------------------------------------------------------- ask-ai (scoped) */

type AskMessage = { role: "user" | "assistant"; text: string };

const NodeAsk: FC<{ mapId: string; nodeId: string }> = ({ mapId, nodeId }) => {
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "assistant", text: "" },
    ]);
    const append = (delta: string) =>
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        return [...prev.slice(0, -1), { ...last, text: last.text + delta }];
      });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              parts: [{ type: "text", text }],
            },
          ],
          artifactAskTargetId: mapId,
          artifactAskNodeId: nodeId,
        }),
      });
      if (!res.ok || !res.body) throw new Error("request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type?: string;
              delta?: string;
            };
            if (
              event.type === "text-delta" &&
              typeof event.delta === "string"
            ) {
              append(event.delta);
            }
          } catch {
            // skip malformed frames
          }
        }
      }
      setMessages((prev) =>
        prev.filter(
          (message) => message.role !== "assistant" || message.text.trim(),
        ),
      );
    } catch {
      setMessages((prev) => [
        ...prev.filter(
          (message) => message.role !== "assistant" || message.text.trim(),
        ),
        { role: "assistant", text: "Maaf, ada masalah. Cuba lagi." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        Tanya AI tentang nod ini
      </p>
      {messages.map((message, index) => (
        <p
          key={index}
          className={cn(
            "text-sm leading-relaxed",
            message.role === "user"
              ? "bg-foreground text-background ml-6 self-end rounded-2xl rounded-br-md px-3 py-2"
              : "text-foreground whitespace-pre-wrap",
          )}
        >
          {message.text || (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
              <Loader2Icon className="size-3.5 animate-spin" />
              Sedang berfikir...
            </span>
          )}
        </p>
      ))}
      <div className="border-border/60 focus-within:ring-ring/40 flex items-center gap-2 rounded-xl border px-3 py-1.5 focus-within:ring-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="Contoh: kenapa Marikh merah?"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          aria-label="Hantar"
          disabled={busy || !input.trim()}
          onClick={() => void send()}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
            busy || !input.trim()
              ? "bg-muted text-muted-foreground"
              : "bg-foreground text-background hover:opacity-90",
          )}
        >
          {busy ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <SendIcon className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------- challenges */

const normalizeAccepted = (challenge: MindMapChallenge): string => {
  const raw =
    (challenge as { accepted?: unknown; answer?: unknown }).accepted ??
    (challenge as { answer?: unknown }).answer ??
    "";
  return Array.isArray(raw) ? raw.map(String).join(" / ") : String(raw);
};

const matchesFill = (input: string, challenge: MindMapChallenge) => {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return false;
  return normalizeAccepted(challenge)
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .some((option) => option === normalized);
};

const ChallengeCard: FC<{
  challenge: MindMapChallenge;
  theme: ReturnType<typeof accentTheme>;
  onResult: (correct: boolean) => void;
}> = ({ challenge, theme, onResult }) => {
  const [choice, setChoice] = useState<number | null>(null);
  const [tf, setTf] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const answer = (correct: boolean) => {
    if (checked) return;
    setChecked(true);
    onResult(correct);
  };

  return (
    <div className="border-border/60 bg-card rounded-xl border p-3">
      <p className="text-sm font-medium">{challenge.question}</p>

      {challenge.type === "multiple-choice" && challenge.options && (
        <div className="mt-2.5 grid gap-1.5">
          {challenge.options.map((option, index) => {
            const isAnswer = index === challenge.answerIndex;
            const isChosen = choice === index;
            return (
              <button
                key={index}
                type="button"
                disabled={checked}
                onClick={() => {
                  setChoice(index);
                  answer(index === challenge.answerIndex);
                }}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  checked && isAnswer
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : checked && isChosen
                      ? "border-rose-500/60 bg-rose-500/10"
                      : "border-border/60 hover:bg-muted/60",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}

      {challenge.type === "true-false" && (
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              disabled={checked}
              onClick={() => {
                setTf(value);
                answer(value === challenge.answer);
              }}
              className={cn(
                "h-10 rounded-lg border text-sm font-medium transition-colors",
                checked && value === challenge.answer
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : checked && tf === value
                    ? "border-rose-500/60 bg-rose-500/10"
                    : "border-border/60 hover:bg-muted/60",
              )}
            >
              {value ? "Benar" : "Palsu"}
            </button>
          ))}
        </div>
      )}

      {challenge.type === "fill-blank" && (
        <div className="mt-2.5 flex items-center gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && text.trim() && !checked) {
                answer(matchesFill(text, challenge));
              }
            }}
            disabled={checked}
            placeholder="Taip jawapan..."
            className="border-border/60 bg-background focus-visible:ring-ring/40 h-9 min-w-0 flex-1 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2"
          />
          {!checked && (
            <Button
              className={cn(
                "h-9 shrink-0 rounded-full px-3 text-xs text-white hover:opacity-90",
                theme.bar,
              )}
              disabled={!text.trim()}
              onClick={() => answer(matchesFill(text, challenge))}
            >
              Semak
            </Button>
          )}
        </div>
      )}

      {challenge.type === "open-ended" && (
        <div className="mt-2.5 grid gap-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={revealed}
            rows={2}
            placeholder="Taip jawapan anda..."
            className="border-border/60 bg-background focus-visible:ring-ring/40 w-full resize-y rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-2"
          />
          {!revealed ? (
            <Button
              className={cn(
                "h-9 justify-self-start rounded-full px-3 text-xs text-white hover:opacity-90",
                theme.bar,
              )}
              disabled={!text.trim()}
              onClick={() => setRevealed(true)}
            >
              Semak jawapan model
            </Button>
          ) : (
            <>
              <p className="border-border/60 bg-muted/40 rounded-lg border px-2.5 py-2 text-sm">
                <span className="text-muted-foreground mb-1 block text-[10px] font-medium tracking-wide uppercase">
                  Jawapan model
                </span>
                {challenge.modelAnswer}
              </p>
              {!checked && (
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant="outline"
                    className="h-9 gap-1.5 rounded-full text-xs"
                    onClick={() => answer(false)}
                  >
                    <RotateCcwIcon className="size-3.5" />
                    Masih Belajar
                  </Button>
                  <Button
                    className={cn(
                      "h-9 gap-1.5 rounded-full text-xs text-white hover:opacity-90",
                      theme.bar,
                    )}
                    onClick={() => answer(true)}
                  >
                    <CheckIcon className="size-3.5" />
                    Faham
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {checked && (
        <div className="mt-2.5">
          <p
            className={cn(
              "text-xs font-medium",
              // eslint-disable-next-line no-nested-ternary
              (
                challenge.type === "multiple-choice"
                  ? choice === challenge.answerIndex
                  : challenge.type === "true-false"
                    ? tf === challenge.answer
                    : challenge.type === "fill-blank"
                      ? matchesFill(text, challenge)
                      : true
              )
                ? "text-emerald-600"
                : "text-rose-600",
            )}
          >
            {challenge.explanation ?? "Selesai — mastery dikemas kini."}
          </p>
        </div>
      )}
    </div>
  );
};
