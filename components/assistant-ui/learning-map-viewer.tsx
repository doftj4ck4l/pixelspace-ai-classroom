"use client";

import type { FC } from "react";
import {
  LearningMap,
  type MindMapNode,
  type MindMapSpec,
} from "@/components/assistant-ui/learning-map";

/**
 * Full-area learning map view used from Spaces. The map owns the experience
 * (explore, node panels, challenges, ask AI); this only frames it.
 */
export const LearningMapViewer: FC<{
  spec: MindMapSpec;
  mapId?: string;
  onClose: () => void;
  onNodeChange?: (index: number) => void;
  onImproveNode?: (index: number, node: MindMapNode) => void;
  initialIndex?: number;
}> = ({ spec, mapId, onClose, onNodeChange, onImproveNode, initialIndex }) => (
  <div className="bg-background h-full overflow-hidden">
    <LearningMap
      spec={spec}
      variant="full"
      mapId={mapId}
      onClose={onClose}
      onNodeChange={onNodeChange}
      onImproveNode={onImproveNode}
      initialIndex={initialIndex}
    />
  </div>
);
