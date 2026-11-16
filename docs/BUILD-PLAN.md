# Clutch: build plan

For the coding agent. Work top to bottom. **Finish tier 1 before touching tier 2.**

**Status, 15 Nov:** T0 to T13 are built (tier 1) and deployed (T19) at https://clutch-one-mu.vercel.app. Review 1 to Review 3 are Pranay's and are still open. The replay match is chosen (DATA.md section 7). Tier 2 has not been started. What was done differently from this plan is listed at the end.

Rules for every task:
1. Read the linked doc section first.
2. Write the failing tests listed, then the code, then run the acceptance check.
3. If the code and a doc disagree, fix the doc in the same commit.
4. Use the `new-feature` skill to run a task and the `verify` skill before calling it done.
5. Look up current library docs before writing framework code (docs-lookup MCP server).
6. Small commits, one task each. No AI trailers in commit messages (CLAUDE.md).

Pranay reviews at the four checkpoints marked **Review**. He must be able to explain what was built up to each one.

## Schedule

| When | Tasks | Done when |
|---|---|---|
| 14 Nov, morning | T0 to T4 | Model trained, metrics saved, replay match exported |
| 14 Nov, afternoon | T5 to T8 | A replay runs with the Pulse; Focus call-backs arrive in a background tab |
| 15 Nov, morning | T9 to T13 | Cards, shelf and demo mode work; evals recorded. **Tier 1 complete** |
| 15 Nov, afternoon | T14 to T17, as far as time allows | Room, reactions, calls, Back me up |
| 15 Nov, evening | T18 to T20 | Deployed, README true, note final, submitted |
| 16 Nov | Buffer only | Fixes, real-phone checks, resubmit if needed |

**Hard stop:** at 15:00 on 15 Nov, if tier 1 is not complete and verified, skip tier 2 entirely and go to T18.

---

## Tier 1

### T0. Scaffold the app
- **Read:** TRD §1, DESIGN-SYSTEM §8.
- **Create:** Next.js app (App Router, TypeScript strict, Tailwind, ESLint) in the repo root without overwriting existing files; `app/globals.css` importing `design/tokens.css`; fonts via `next/font/google`; Vitest, Playwright, Prettier, Zod; npm scripts `dev`, `build`, `typecheck`, `lint`, `test`, `e2e`, `evals:check`, `check-data`, `pregen`; `Makefile` with `model-setup`, `model`, `model-test`, `export`.
- **Tests first:** one Vitest smoke test; one Playwright test that the home page has the replay note.
- **Accept:** `npm run typecheck && npm run lint && npm test && npm run build` pass. CI goes green. The after-edit hook formats a file.

### T1. Data pipeline: download and parse
- **Read:** DATA §3 to §5, MODEL §2.
- **Create:** `model/requirements.txt`, `model/src/download.py`, `parse.py`, `model/tests/test_parse.py`, a hand-written 2-over fixture file.
- **Tests first:** TESTING F2 rows 1 and 2.
- **Accept:** `make model-test` passes; `data_report.json` lists match counts and each exclusion count.

### T2. Split, features, model, metrics
- **Read:** MODEL §3 to §5.
- **Create:** `split.py`, `features.py`, `train.py`, `evaluate.py`, tests.
- **Tests first:** TESTING F2 rows 3 to 6.
- **Accept:** `model/artifacts/split.json`, `metrics.json` and `calibration.png` exist. Copy the numbers into MODEL.md §4 and §5. Memory stays under 4 GB (watch Activity Monitor; if not, read the data in chunks).

### T3. Stakes, thresholds, Pulse evaluation
- **Read:** MODEL §6 and §7.
- **Create:** `stakes.py`, `thresholds.py`, `pulse_eval.py`, tests.
- **Tests first:** TESTING F2 rows 7 and 8.
- **Accept:** `data/thresholds.json` has `fitted_on: "train"` and non-zero values; `pulse_eval.json` has the three bars and the three comparison strategies. Copy into MODEL.md §6.5 and §7.

### T4. Pick and export the replay match
- **Read:** DATA §7, TRD §2 and §3.1.
- **Create:** `pick_replay.py`, `export.py`, `data/replay.json`, `data/jerseys.json`, `data/ATTRIBUTION.md`, `scripts/check-data.ts`.
- **Tests first:** timeline gap test (TESTING F1 row 7); `check-data` (F2 row 9).
- **Accept:** **Pranay picks the match** from the list. `data/matches/<id>/timeline.json`, `alerts.json`, `players.json` exist and pass `npm run check-data`. The split assertion passes.

**Review 1 (Pranay):** read `metrics.json` and `pulse_eval.json`. Can you explain the split, the Brier score, and how stakes is computed? If the Pulse coverage is poor, decide now what the product may promise.

### T5. The clock
- **Read:** TRD §3.
- **Create:** `lib/clock/` (`anchor.ts`, `indexAt.ts`, `serverTime.ts`, `ticker.worker.ts`, `useClock.ts`), `app/api/time/route.ts`, `lib/testing/fixture-match.ts`.
- **Tests first:** TESTING F1 rows 1 to 5 (the five worked examples, exactly).
- **Accept:** unit tests pass.

### T6. Engine and cricket adapter
- **Read:** TRD §2 and §4, CARDS §1.
- **Create:** `lib/engine/` (`types.ts`, `pulse.ts`, `alerts.ts`, `shelf.ts`), `lib/adapters/cricket/` (`load.ts`, `scoreboard.ts`, `moments.ts`, `replayKind.ts`), `lib/adapters/README.md` (how to add a sport).
- **Tests first:** F1 row 6, F3 row 1, F4 rows 1 and 2, F5 rows 1 to 4.
- **Accept:** unit tests pass; `moments.json` is written for the replay match by a script using `detectMoments`.

### T7. The Match screen and the Pulse
- **Read:** DRD §2.1 to §2.3 and §3, DESIGN-SYSTEM §7, `design/screens/room.html`.
- **Create:** `components/AppBar.tsx`, `ScoreCard.tsx`, `PulseCard.tsx` (with `Ring`), `WinBar.tsx`, `BallChips.tsx`, `MomentCard.tsx`, `TabBar.tsx`, `Button.tsx`, `Badge.tsx`, `Jersey.tsx`; `app/page.tsx` (start), `app/world/page.tsx`, `app/match/page.tsx` (solo Match tab).
- **Tests first:** F3 rows 2 to 5; e2e F1 rows 9 to 11.
- **Accept:** `verify` skill at 390 × 844: the screen is at least as good as the mock-up; score card and Pulse are above the fold; every state in DRD §2.3 is reachable; `design-review` passes. Save a screenshot to `design/review/` for Pranay.

### T8. Focus mode and call-backs
- **Read:** PRD F4, TRD §8, DRD §2.4 and §4.
- **Create:** `lib/notify/`, `public/sw.js`, `app/manifest.ts`, `components/Segmented.tsx`, `StatTile.tsx`, Focus state in the match page.
- **Tests first:** F4 rows 3 to 6.
- **Accept:** on the laptop, with the tab in the background, a call-back notification arrives within 5 seconds of its time. Checked by hand; note the result in the README.

**Review 2 (Pranay):** open it on your phone. Is the Pulse readable in two seconds? Does it look like an app you would install? Say what to improve; the design is improved alongside the build.

### T9. Facts, check, templates
- **Read:** CARDS §2, §3, §6, §8.
- **Create:** `lib/cards/` (`schema.ts`, `facts.ts` re-exporting the adapter's, `anchors.ts`, `check.ts`, `templates.ts`, `worlds/*.vocab.txt`, `worlds/*.deny.txt`, `abuse.txt`, `sensitive.txt`), `evals/cases/adversarial.jsonl`.
- **Tests first:** F6 rows 1 to 5. Write the adversarial cases before `check.ts`.
- **Accept:** all 30 planted errors caught, all 10 good cards pass, every template passes.

### T10. LLM provider, pre-generation, card route
- **Read:** CARDS §4 and §5, TRD §5 (`/api/card`), §9, §10.
- **Create:** `lib/llm/` (interface, one provider, `none`), `lib/cards/prompt.ts`, `scripts/pregen-cards.ts`, `app/api/card/route.ts`.
- **Tests first:** F6 rows 6 and 7, with a fake provider.
- **Accept:** `npm run pregen` writes `cards.json` for all moments × 6 worlds and a log of pass, retry and template counts. With `LLM_PROVIDER=none` it writes templates and still succeeds.

### T11. Card screen and Your World
- **Read:** DRD §2.2 and §2.6, `design/screens/card.html`.
- **Create:** `components/ExplanationCard.tsx`, `BeforeAfter.tsx`; wire `MomentCard` to open it.
- **Tests first:** e2e F6 row 8.
- **Accept:** `verify`: a card appears at a moment in the chosen world; "Say it plainly" swaps it; the template shows when the route is forced to fail.

### T12. Moment Shelf, mini replay, Catch me up
- **Read:** PRD F5, DRD §2.5, DESIGN-SYSTEM (MomentCard, MiniReplay), `design/screens/shelf.html`.
- **Create:** `components/MiniReplay.tsx`, `SwingChip.tsx` (one drawing per `replay_kind`), `app/match/shelf` view, seen and missed storage, `CatchMeUp.tsx`.
- **Tests first:** e2e F5 rows 5 and 6; component row 7.
- **Accept:** `verify`: hide the tab past a moment, come back, Moments says "You missed one big moment" and plays it.

### T13. Demo mode and evals
- **Read:** PRD F7, DRD §2.9 and §7, EVALS.
- **Create:** demo guide state, "Skip ahead"; `evals/make_cases.ts`, `evals/run.ts`, `evals/rubric.md`; run `evals:generate` and `evals:judge` once; commit outputs and `summary.json`.
- **Tests first:** F7 rows 1 and 2.
- **Accept:** the 2-minute demo runs start to finish in a private window with Supabase env vars unset. `npm run evals:check` passes in CI. Copy results into EVALS.md.

**Review 3 (Pranay): tier 1 complete.** Score 30 eval cards by hand (EVALS §5). Run the full demo on your phone. Fill AI-WORKFLOW.md for the work so far.

---

## Tier 2 (only after Review 3)

### T14. Rooms
- **Read:** PRD F8, TRD §5 to §7, DECISIONS 0005.
- **Create:** `supabase/migrations/0001_init.sql` (from TRD §7, exactly), `lib/room/` (clients, channel), `app/api/rooms/route.ts`, `join/route.ts`, `[id]/anchor/route.ts`, `app/room/[code]/page.tsx`, friends markers.
- **Tests first:** TESTING tier 2 rows 1 to 4.
- **Accept:** two browsers in one room show the same ball; the RLS test passes; a non-member reads nothing.

### T15. Reactions
- **Read:** PRD F9, TRD §6.
- **Tests first:** tier 2 rows 5 and 6.
- **Accept:** two-browser reaction test passes.

### T16. Back me up
- **Read:** PRD F11, CARDS §7, DRD §2.7, `design/screens/backup.html`.
- **Create:** `lib/cards/backup.ts` (`chooseBackupFacts`, `checkBackup`, templates), `app/api/backup/route.ts`, `components/VersusCard.tsx`, `CompareRow.tsx`, `QuoteCard.tsx`, the Back me up screen.
- **Tests first:** tier 2 rows 10 to 14.
- **Accept:** fact values equal `players.json`; swapping players swaps leaders; a planted insult is blocked.

### T17. Calls and leaderboard
- **Read:** PRD F10, TRD §5.
- **Tests first:** tier 2 rows 7 to 9.
- **Accept:** two-browser leaderboard test passes; a late call returns 409.

---

## Ship

### T18. Polish and real devices
- Run `design-review` on every screen. Fix anything on the checklist.
- Hand checks from TESTING §2 (F4) on a laptop, an Android phone and an iPhone if available. Record what was and was not checked.

### T19. Deploy
- RUNBOOK §5, including the pre-submission checklist.

### T20. Make the documents true, then submit
- README: fill every "to be measured" from artifact files, or leave it blank and say why. Move anything unbuilt to "designed, not built". Replace mock-up screenshots with real ones.
- AI-WORKFLOW.md complete. SUBMISSION-NOTE.md final, under 200 words, numbers from artifacts only.
- **Review 4 (Pranay):** read the README top to bottom against the running app. Then submit.

---

## Cut order

If time runs short, cut from the top. Each cut moves the item to "designed, not built" in the README.

1. Per-over calls and leaderboard (T17)
2. Reactions (T15)
3. `new_batter` cards (keep moment cards)
4. `milestone` and `over_big` moment kinds
5. Speed control in rooms (keep skip)
6. Back me up (T16). Cheap because it reuses the card engine, so it is cut late
7. Rooms (T14). If cut, the whole of tier 2 is "designed, not built"
8. The LLM judge for the rubric (keep the code check and Pranay's hand-scored sample)
9. Worlds beyond football and plain

**Never cut:** the clock, the model with saved metrics, the Pulse, Focus call-backs, the shelf with the mini replay, checked cards with template fallback, the 2-minute demo, the replay note, honest documents.

## Already cut from the plan, and why

| Plan item | Change | Reason |
|---|---|---|
| "Alert reaches a phone with the app in the background" | Tier 1 call-backs need the page open; closed-app push is tier 3 | DECISIONS 0007 |
| Mini replay showing where the ball pitched and went | Side-on drawing of the outcome kind | The data has no tracking. DECISIONS 0008 |
| Explanation "levels" (easy, expert) | Removed; "Plain" covers it | One fewer axis to generate, cache and evaluate |
| `reactions`, `moments`, `moments_seen` tables | Reactions are broadcast only; moments are static files; seen and missed live in the browser | Less to build and nothing personal stored |
| Runtime LLM calls for every card | Cards are pre-generated once and shipped as data | Demo cannot fail on a rate limit; cost near zero |
| Room vote on debates, memento, spoiler guard, voice, floating mini Pulse, football, roar trigger | Tier 3, designed not built | Three days |
| Broadcast-scoreboard look, then a minimal one-dial look | A match-centre app in the style of mainstream sports apps, improved alongside the build | Pranay's reviews. DECISIONS 0009 |

## What was done differently while building tier 1

| Plan | What happened | Why |
|---|---|---|
| Current run rate as a model feature | Removed | It blew up in the first over; no measurable loss on validation (MODEL.md section 3) |
| Cool-down of 12 balls | 6 balls | 12 capped a match at 20 call-backs, below the "Everything" target |
| Four tabs | Three: Match, Focus, Moments | Back me up and Room are tier 2; no dead tabs |
| Template cards are plain | Plus one fixed analogy sentence per world and kind | So Your World works with no LLM key, still checked |
| `evals:generate` and `evals:judge` run once | `evals:generate` (pregen) run with Gemini on 17 Nov; judge not run | The judge is cut-order item 8 |
| Pranay picks the replay match from the list first | A provisional match was used while building; Pranay confirmed it on 15 Nov | Work was not blocked |
| Tests written before code | Mostly written alongside the code, some after | Speed. Every test listed in TESTING.md for tier 1 exists except the ones named there |
| CI goes green | Green from 15 Nov | The workflow used `hashFiles()` in job conditions, which GitHub rejects, so CI never ran until it was fixed on the first push |
