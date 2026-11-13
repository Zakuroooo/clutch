# Clutch

A second screen for casual sports fans: a Pulse ring that says when to look up, a shelf of missed moments, and explanations in the fan's own world. It replays one real past cricket match as live. Dream11 assignment, due 16 Nov 2026.

Docs are the spec. Start with `docs/BUILD-PLAN.md`; it links to the section to read for each task.

## Stack
- Next.js (App Router), TypeScript strict, Tailwind v4, Zod. Hosted on Vercel.
- Supabase (Postgres, Realtime, anonymous auth, RLS) for tier 2 rooms only.
- Python 3.11+ (pandas, scikit-learn) in `model/`, offline only.
- Vitest, Playwright, pytest. GitHub Actions.

## Commands
- `npm run dev` · `npm run build`
- `npm run typecheck` · `npm run lint` · `npm test` · `npm run e2e`
- `npm run evals:check` (no key needed) · `npm run check-data` · `npm run pregen`
- `make model-setup` · `make model` · `make model-test` · `make export`

## Rules that are never broken
1. **Facts come from code, never from the model.** The LLM only words facts it is given. Every LLM output goes through `lib/cards/check.ts` before anyone sees it. On failure, show the template.
2. **No number without a source.** Do not write a metric, count or percentage into any doc or UI string unless it is read from a file in `model/artifacts/` or `evals/results/`. Unmeasured means blank.
3. **It is a replay.** "Replay of a real match, running as live" stays visible on every match screen. Never describe the product as live or as having users.
4. **No faces.** Never generate, draw or add an image of a real player, and no official logos. Jerseys, crests and numbers only.
5. **No betting language** anywhere: bet, odds, wager, gamble, jackpot, payout.
6. **Secrets stay in `.env.local`.** Never print, log, commit or paste a key. Server-only keys never get a `NEXT_PUBLIC_` prefix.
7. **Tier 1 before tier 2.** Do not start a tier 2 task until Review 3 in the build plan.

## How to work
- Tests first. For each task, write the failing tests named in `docs/TESTING.md`, then the code.
- Update the doc in the same change. If code and a doc disagree, the commit that changes one changes the other.
- Look up current docs before writing framework or SDK code (context7 MCP). Do not rely on memory for Next.js, Tailwind v4, Supabase or the LLM SDK.
- Logic is pure and takes `now` as a parameter. No `Date.now()` inside `lib/clock` or `lib/engine` functions.
- The engine (`lib/engine`, `lib/clock`, `lib/cards`) must not import from `lib/adapters/cricket` or mention cricket.
- UI uses tokens from `design/tokens.css` only. The pulse gradient is for stakes and nothing else. Read `docs/DESIGN-SYSTEM.md` §10 before finishing any screen.
- The mock-ups in `design/screens/` are the floor. Improve the design while building; it should look like a finished sports app (Dream11, JioHotstar class), not a web page. Show Pranay real screenshots early and often.
- 8 GB RAM machine: do not run the dev server, Playwright and model training at the same time.
- Verify in a browser at 390 × 844 before calling UI work done (`/verify`).

## Git
- Commit as the configured user. **No Co-Authored-By, no "Generated with", no AI or Claude lines in commit messages or PR text.** AI use is disclosed in `docs/AI-WORKFLOW.md`.
- One task per commit. Message says what changed and why, in plain words.
- Ask before pushing, deploying or deleting.

## Skills and agents
- `/new-feature <task id>` runs one build-plan task: read spec, plan, failing tests, code, verify.
- `/verify` runs the app and checks it in a browser. `/run-evals` runs card evals. `/design-review` checks a screen against the design system.
- Reviewers in `.claude/agents/`: `code-reviewer`, `test-writer`, `design-critic`, `data-checker`. Use them after a task, not instead of tests.

## Where things are
- Spec: `docs/` · Design: `design/tokens.css`, `design/screens/` · Decisions: `docs/DECISIONS/`
- Match data: `data/matches/<id>/` · Model: `model/` · Evals: `evals/` · E2E: `e2e/`
