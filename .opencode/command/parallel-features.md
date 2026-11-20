---
description: Build two features in parallel with isolated worktree subagents, then merge sequentially
agent: build
---

Split $ARGUMENTS on the first "|" into Feature A (left) and Feature B (right).

Spawn TWO `feature-builder` subagents IN PARALLEL — one single message with two
task tool calls (this is what makes them run concurrently):

- Task 1 — feature-builder: "Feature A: <brief A>. Follow the feature-builder
  instructions exactly: own worktree + branch, lint+build, commit locally,
  never push."
- Task 2 — feature-builder: "Feature B: <brief B>. Same rules."

While they run, do not start work that touches the repo working tree.

When both report back:
1. Inspect each branch's diff (`git diff main..feat/<slug> --stat`) and both
   reports' "shared files" lists.
2. Spawn the `reviewer` subagent on each branch diff (parallel, same pattern).
3. Merge sequentially into main: branch A first, then branch B — resolve the
   shared-file conflicts yourself, keeping both features' entries (e.g. sidebar
   nav, gallery modes). Re-run `pnpm lint` + `pnpm build` after each merge.
4. Push main once, watch the runner deploy land on weedad, then spawn
   `staging-verifier` for the end-to-end check of both features.
5. Report: branches, merge order, conflicts resolved, deploy hash, verification
   results. If a feature is not mergeable, leave it on its branch and say why.
