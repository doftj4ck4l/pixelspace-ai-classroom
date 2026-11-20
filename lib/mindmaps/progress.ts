/** Node mastery state, keyed by node id in the DB. */
export type NodeState = {
  level: 0 | 1 | 2 | 3;
  streak: number;
  correct: number;
  attempts: number;
  nextDue: number;
  lastSeen: number;
};

/** Spaced-repetition intervals in days, indexed by streak (capped). */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 21] as const;

export const applyChallengeResult = (
  state: NodeState | undefined,
  correct: boolean,
  now = Date.now(),
): NodeState => {
  const base: NodeState = state ?? {
    level: 0,
    streak: 0,
    correct: 0,
    attempts: 0,
    nextDue: now,
    lastSeen: now,
  };
  if (correct) {
    const streak = base.streak + 1;
    const level = Math.min(3, base.level + 1) as NodeState["level"];
    const days =
      REVIEW_INTERVALS_DAYS[
        Math.min(streak - 1, REVIEW_INTERVALS_DAYS.length - 1)
      ] ?? 1;
    return {
      level,
      streak,
      correct: base.correct + 1,
      attempts: base.attempts + 1,
      nextDue: now + days * 86_400_000,
      lastSeen: now,
    };
  }
  return {
    level: Math.max(0, base.level - 1) as NodeState["level"],
    streak: 0,
    correct: base.correct,
    attempts: base.attempts + 1,
    nextDue: now + 86_400_000,
    lastSeen: now,
  };
};

/** Mark a node as seen (opened) — level 0 becomes 1. */
export const applySeen = (
  state: NodeState | undefined,
  now = Date.now(),
): NodeState => {
  const base: NodeState = state ?? {
    level: 0,
    streak: 0,
    correct: 0,
    attempts: 0,
    nextDue: now,
    lastSeen: now,
  };
  return {
    ...base,
    level: base.level === 0 ? 1 : base.level,
    lastSeen: now,
  };
};

export const isDue = (state: NodeState | undefined, now = Date.now()) =>
  !!state && state.level > 0 && state.nextDue <= now;

export const masteredCount = (state: Record<string, NodeState>) =>
  Object.values(state).filter((s) => s.level >= 3).length;

export const exploredCount = (state: Record<string, NodeState>) =>
  Object.values(state).filter((s) => s.level >= 1).length;

/**
 * Node ids are stable slugs, so an AI edit keeps mastery for every node that
 * still exists; deleted nodes drop out and new nodes start fresh.
 */
export const remapNodeState = (
  newNodes: { id: string }[],
  state: Record<string, NodeState>,
): Record<string, NodeState> => {
  const next: Record<string, NodeState> = {};
  const present = new Set(newNodes.map((node) => node.id));
  for (const [id, value] of Object.entries(state)) {
    if (present.has(id)) next[id] = value;
  }
  return next;
};
