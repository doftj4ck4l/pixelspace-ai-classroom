/**
 * In-process registry of live chat relays, keyed by app thread id.
 *
 * A run is an open SSE relay held by this Node process. Stopping it takes two
 * things, because neither stops the run alone: abort this process's upstream
 * fetch (so the relay stops reading), and tell the harness to cancel the pi
 * loop (closing the connection does not reliably reach it). The stop route
 * finds the run here; the relay registers itself at start and unregisters
 * when it settles.
 */

export type ActiveRun = {
  controller: AbortController;
  conversationId?: string;
};

const runs = new Map<string, ActiveRun>();

export const threadRuns = {
  register(threadId: string): ActiveRun {
    const run: ActiveRun = { controller: new AbortController() };
    runs.set(threadId, run);
    return run;
  },

  setConversationId(threadId: string, conversationId: string): void {
    const run = runs.get(threadId);
    if (run) run.conversationId = conversationId;
  },

  get(threadId: string): ActiveRun | undefined {
    return runs.get(threadId);
  },

  unregister(threadId: string, run: ActiveRun): void {
    if (runs.get(threadId) === run) runs.delete(threadId);
  },

  /** Abort this process's relay for the thread. False when nothing is running. */
  abort(threadId: string): boolean {
    const run = runs.get(threadId);
    if (!run) return false;
    run.controller.abort();
    return true;
  },
};
