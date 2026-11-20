# Pixelspace AI Classroom — agent guide

Next.js 15 (App Router) + Tailwind v4 + assistant-ui + Drizzle/Postgres (Docker).
Staging: https://paic2staging.pixelspace.com.my — deployed from `main` by a
self-hosted GitHub runner on weedad. The pi harness (pixelspacev3 + our
`render_ui` patch) is the only LLM path.

## Commands
- `pnpm lint` (oxlint + oxfmt) and `pnpm lint:fix`
- `pnpm build` — must pass before any commit
- `pnpm db:generate` after `lib/db/schema.ts` changes; deploys run `pnpm db:migrate`
- Staging verification: Playwright scripts in
  `/var/folders/97/wphpbky16m52k5lfm_lm_cxr0000gn/T/opencode/pw` (login
  benjamin@nextplus.com.my / Admin1234)
- weedad access: `sshpass -p "$WEEDAD_PASS" ssh work-station-2@10.0.0.79`
  (`WEEDAD_PASS` is set in the developer's shell profile — it is deliberately
  NOT stored in this repo; if unset, ask the user for it)
  app at `~/Developer/gemini-clone`, service `paic2.service` (systemctl --user)

## Hard rules
1. NEVER push to `main` from parallel/background work: every push auto-deploys
   staging via the runner. Feature work happens on branches in git worktrees;
   merging to main is a deliberate, sequential step.
2. Every API route: `requireApiUser()` first and filter every query by
   `user.id`. No cross-user reads or writes, ever.
3. Generative-UI contracts: app validators in `lib/{flashcards,quizzes,mindmaps,notes}/spec.ts`
   must mirror `harness/patches/apply-flashcards-patch.mjs`. Stored specs are
   the *normalized* validator output.
4. Secrets only in `~/Developer/gemini-clone/.env.local` on weedad (router keys,
   PI_* config). Never commit tokens/keys/passwords.
5. No code comments unless the user asks. Match existing UI patterns
   (Malay/English mix, `cn()` class merging, viewer pages keyed by a version
   counter for live refresh, `ArtifactAiPanel` for AI editing).

## Map
- `app/(app)/spaces/<module>/[artifactId]/page.tsx` — artifact pages
- `components/assistant-ui/` — viewers (`flashcard-deck`, `quiz-runner`,
  `learning-map`, `notes-viewer`, `slide-preview`, `document-preview`,
  `image-viewer`), `artifact-ai-panel`, `space-gallery` (all Spaces pages)
- `app/api/chat/route.ts` — harness relay: capture, edit context, apply + remap
- `lib/pi/`, `lib/{flashcards,quizzes,mindmaps,notes}/`, `lib/slides/render.ts`,
  `lib/nextplus/router.ts`, `lib/db/schema.ts`
- `harness/patches/apply-flashcards-patch.mjs` — run on weedad to rebuild
  `pixelspace-api:genui-patch`
- `scripts/deploy.sh` — what the runner executes on push to main
