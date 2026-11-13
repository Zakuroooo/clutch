# Clutch: testing

Tests are written first. For each task in [BUILD-PLAN.md](BUILD-PLAN.md) the failing test comes before the code. Counts and pass rates are blank until they exist.

## 1. Tools

| Layer | Tool | Where | Command |
|---|---|---|---|
| Unit and integration (TypeScript) | Vitest | beside the code, `*.test.ts` | `npm test` |
| End to end, two browsers | Playwright | `e2e/` | `npm run e2e` |
| Model and pipeline (Python) | pytest | `model/tests/` | `make model-test` |
| Card evals | custom runner | `evals/` | `npm run evals:check` |
| Types and lint | `tsc --noEmit`, ESLint | | `npm run typecheck`, `npm run lint` |

Rules:
- Pure logic (clock, engine, check, scoring) is tested as pure functions with no browser and no network.
- Tests never call a real LLM. `LLM_PROVIDER=none`, or a fake provider that returns fixed text.
- Time is injected (`now` is a parameter), never read from the system inside logic.
- A small fixture match (`lib/testing/fixture-match.ts`: 2 innings, 3 overs each, hand-checkable) is used for unit tests. The real replay match is used for data checks.

## 2. Tests by feature

### F1. Match clock and scoreboard

| Test | Kind | Checks |
|---|---|---|
| `clock.indexAt` returns −1 before the first ball, the right index at exact `t_ms` boundaries, the last index after the end | unit | AC1.1 |
| The five worked examples in TRD section 3.5, as written | unit | AC1.1 |
| Re-anchoring: skip, speed change and pause keep `elapsed` continuous | unit | AC1.1 |
| `estimateOffset` picks the sample with the smallest round trip | unit | AC1.2 |
| Property test: for random anchors and times, `indexAt` is monotonic in `now` | unit | AC1.1 |
| Cricket adapter `scoreboard()` output equals the fixture's known scores at five chosen balls, including a wide, a wicket and the innings change | unit | AC1.4 |
| Timeline builder: gaps follow the table in TRD 3.1 | pytest | |
| Two browser contexts, one with its clock shifted +5 s, show the same ball | e2e | AC1.2 |
| Reload keeps the same ball | e2e | AC1.3 |
| Replay note is visible on room, focus, shelf and card screens | e2e | AC1.5 |
| Jumping past the end shows the finished state and the real result | e2e | AC1.6 |

### F2. Model and stakes

| Test | Kind | Checks |
|---|---|---|
| Parser: a hand-written 2-over Cricsheet file gives the expected rows (extras, wicket, legal ball counts) | pytest | |
| Exclusions: D/L, tie, no-result and super-over matches are dropped | pytest | |
| Split: no match id in two splits; train dates ≤ validation dates ≤ test dates | pytest | AC2.2 |
| Split: fails when the replay match is not in test | pytest | AC2.2 |
| Features: no feature changes when future balls are altered (leak test) | pytest | |
| Model: probabilities in [0, 1]; a chase needing 1 from 60 balls with 10 wickets is above 0.95 for the chasing side; needing 60 from 6 is below 0.05 | pytest | sanity |
| Stakes: zero when the result is certain; higher at "12 from 6" than at "80 from 60" | pytest | |
| Thresholds file records `fitted_on: "train"` and every threshold is from train match ids only | pytest | AC2.4 |
| `check-data`: every event in the replay timeline has `wp`, `stakes`, and a `state` consistent with the running total | script in CI | AC2.1 |
| `metrics.json` exists and has all four rows before `MODEL.md` tables may be filled (doc check) | script | AC2.3 |

### F3. The Pulse

| Test | Kind | Checks |
|---|---|---|
| `pulseState(pct, thresholds)` at each boundary | unit | AC3.1 |
| The ring's arc length matches `stakes.pct`; the card is in its glowing style only for high and decider | component | |
| Reduced motion: no animation is running; the word still changes | e2e | AC3.2 |
| The live region text changes once per state change | component | AC3.4 |
| `--pulse` colour is not used outside the allowed components (grep test over `components/`) | script | AC3.3 |

### F4. Focus mode

| Test | Kind | Checks |
|---|---|---|
| `dueAlerts(prevIndex, index, bar, fired)` returns only alerts at or above the bar, never one already fired | unit | AC4.3 |
| A jump over several alerts fires at most the newest as a notification; the rest only reach the shelf | unit | |
| Bar choice survives reload | e2e | AC4.1 |
| With permission granted (Playwright grant), an alert produces a notification call and a title change | e2e | AC4.2 |
| With permission denied, the banner and title change still happen and the screen says notifications are off | e2e | AC4.4 |
| Promise line shows no number when `pulse_eval.json` has none | component | AC4.6 |

Checked by hand on real devices (cannot be automated here): a background tab on a laptop receives the notification within 5 seconds; an Android phone vibrates; an iPhone with the app added to the Home Screen shows the notification. Results go in the README as "tested by hand on: …".

### F5. Moment Shelf

| Test | Kind | Checks |
|---|---|---|
| `detectMoments` on the fixture gives exactly the expected moments, one per ball at most | unit | CARDS §1 |
| Shelf at index `i` contains only moments with index ≤ `i`, newest first | unit | AC5.1 |
| Seen and missed: hidden page or Focus on at the moment's time means missed | unit | AC5.2 |
| `replayKind` for every outcome kind in the fixture; no drawing takes a position or direction input (type-level: the component's props have none) | unit | AC5.4 |
| Hide the page (Playwright visibility), advance past a moment, show it again: the moment is marked missed; reload keeps it | e2e | AC5.2 |
| Catch me up plays missed moments oldest first and marks them seen; Stop works | e2e | AC5.5 |
| Empty state text at index −1 | component | AC5.6 |

### F6. Cards

| Test | Kind | Checks |
|---|---|---|
| `facts()` on fixture moments equals hand-written expected objects | unit | CARDS §2 |
| `facts.numbers` and `facts.names` contain every number and name in the other fields | unit | |
| `anchors()` for each world at start, middle and end of the match | unit | CARDS §3 |
| The adversarial set: every planted error is rejected by the named rule; every good card passes | unit | AC6.3 |
| Every template card for every moment in the replay match passes the check | unit | AC6.4 |
| `/api/card`: returns the pre-generated card; with a failing fake LLM returns a template and `source: "template"`; never returns an unchecked card | integration | AC6.3, AC6.4 |
| Same moment and world twice gives the identical card (cache) | integration | AC6.5 |
| World choice survives reload; "Say it plainly" swaps the text | e2e | AC6.1, AC6.6 |

### F7. Demo mode

| Test | Kind | Checks |
|---|---|---|
| `nextMomentAnchor(elapsed, moments)` lands 8 s before the next moment; returns null after the last | unit | AC7.2 |
| "Show me in 2 minutes" reaches a card and the shelf with no permission prompt and with Supabase env vars unset | e2e | AC7.1, AC7.3, AC7.4 |

### F8 to F11 (tier 2)

| Test | Kind | Checks |
|---|---|---|
| Room code generator: 6 characters from the allowed alphabet; no look-alikes | unit | AC8.4 |
| `POST /api/rooms` then `POST /api/rooms/join` with a fake Supabase: member rows as expected; wrong code gives 404 | integration | AC8.1, AC8.4 |
| RLS, against a local Supabase (or the dev project): a signed-in user who is not a member selects zero rows from `rooms`, `members`, `calls`; cannot insert into any table | integration | AC8.5 |
| **Two browsers, one room:** A creates, B joins by code; both show the same ball; B sees A in the friends row; A closes, B's row updates | e2e | AC8.1 to AC8.3 |
| Two browsers: A taps a reaction, B sees it within 1 second; a third browser joining later sees none | e2e | AC9.1, AC9.2 |
| Reaction rate limit: the sixth tap in 3 seconds is dropped | unit | AC9.3 |
| `scoreOver(runs, choice, multiplier)` for each bucket boundary (5, 6, 9, 10) | unit | AC10.2 |
| `/api/calls` rejects a call once the over has started on the room clock (time injected) | integration | AC10.4 |
| Two browsers: both call, the over ends, both leaderboards show the same points | e2e | AC10.3 |
| `chooseBackupFacts`: picks the top three positive margins; always includes a fair point when one exists; all-negative gives the "theirs is ahead" result; small samples give "too little data" | unit | AC11.1, AC11.5 |
| Swapping the players swaps every leader | unit | AC11.4 |
| `checkBackup` rejects digits, a third name, each sensitive-topic sample | unit | AC11.6 |
| Fact values in the API response equal `players.json` | integration | AC11.2, AC11.3 |
| Two browsers: A drops a Back me up card in the room, B sees it | e2e | AC11.7 |

## 3. Two-browser end-to-end tests

Playwright launches two (sometimes three) separate browser contexts in one test, each with its own storage, so each is a different anonymous person. Phone viewport (390 × 844) for all.

- The app accepts a test-only query parameter, `?t0=<ms>`, that fixes the anchor so tests can start a few seconds before a known moment. It is read only when `NEXT_PUBLIC_E2E=1`.
- Clock skew is simulated with Playwright's clock API on one context.
- Tier 2 e2e tests need a Supabase project. Locally they use the dev project from `.env.local`. In CI they run only if the Supabase secrets are present; otherwise they are skipped and the CI summary says so. Tier 1 e2e tests need nothing and always run.

## 4. What runs when

| When | What |
|---|---|
| After each file edit (Claude Code hook) | Prettier on the file; `tsc --noEmit` for TypeScript files |
| Before a commit (by habit and by the `new-feature` skill) | `npm run typecheck && npm test` |
| Every push (GitHub Actions) | lint, typecheck, unit and integration tests, `evals:check`, `check-data`, pytest, tier 1 e2e |
| Before deploy | Everything above plus the hand checks in RUNBOOK.md |

## 5. Not tested, said plainly

- Real-device notification delivery and vibration are checked by hand, not automated.
- No load testing. The free tier allows 200 concurrent Realtime connections; nothing here has been run near that.
- No testing with real users.

## 6. Results

| | Count | Passing |
|---|---|---|
| Unit and integration tests | | |
| End-to-end tests | | |
| Python tests | | |

To be filled from CI output.
