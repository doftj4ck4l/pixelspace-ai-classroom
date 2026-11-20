import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mindmapProgress } from "@/lib/db/schema";
import { remapNodeState, type NodeState } from "@/lib/mindmaps/progress";
import type { MindMapNode } from "@/lib/mindmaps/spec";

/** Persist the remapped node state for a map, if the user has any progress. */
export const remapMindMapProgress = async (
  userId: string,
  mapId: string,
  oldNodes: MindMapNode[],
  newNodes: MindMapNode[],
): Promise<void> => {
  void oldNodes;
  const [row] = await db
    .select()
    .from(mindmapProgress)
    .where(
      and(eq(mindmapProgress.userId, userId), eq(mindmapProgress.mapId, mapId)),
    );
  if (!row) return;
  const state =
    row.nodeState &&
    typeof row.nodeState === "object" &&
    !Array.isArray(row.nodeState)
      ? (row.nodeState as Record<string, NodeState>)
      : {};
  const next = remapNodeState(newNodes, state);
  await db
    .update(mindmapProgress)
    .set({
      nodeState: next,
      total: String(newNodes.length),
      updatedAt: new Date(),
    })
    .where(
      and(eq(mindmapProgress.userId, userId), eq(mindmapProgress.mapId, mapId)),
    );
};
