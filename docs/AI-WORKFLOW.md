# How AI was used to build Clutch

The submission form asks which AI tools were used and for what. This file is the full, honest answer. It is filled in as work happens, not afterwards. If a row is not true, it is corrected, not polished.

## The short version

**The idea is my own, and I built it with AI.**

- **Mine (Pranay):** the idea, from how I actually watch sport; the hypothesis; the product decisions (what to build, what to cut, the design direction); the choice of replay match; reviewing and accepting or rejecting what the AI produced.
- **Built with AI:** Claude Code (Anthropic) wrote the documents, the design mock-ups, and most of the code and tests, under the rules in `CLAUDE.md`.

I did not write most of this code by hand. I directed it, reviewed it, and studied it so I can explain every part.

## Tools

| Tool | Used for | Not used for |
|---|---|---|
| Claude Code (Anthropic), models Claude Fable 5.2 and Claude Opus 5.5 | Writing the documents in `docs/`, the design tokens and mock-ups, the agent setup in `.claude/`, the code and the tests | The idea, the hypothesis or scope |
| Google Gemini, model gemini-3.5-flash-lite (17 Nov 2026) | Wording of explanation cards, from facts built by code; 287 of 322 shipped cards, each passed the code check | Any fact, number or decision in the product |
| _Judge model for the rubric (fill in)_ | Scoring analogy quality in evals | |
| _Any other tool (fill in, or delete this row)_ | | |

## What I decided, and what I rejected

| Date | Decision | Notes |
|---|---|---|
| 13 Nov | The fan problem: missing moments while working; not knowing why a player matters; not wanting to keep asking friends | From my own experience |
| 13 Nov | Three scope tiers; tier 1 before anything else | Set by the real deadline |
| 13 Nov | **Rejected the first design** (broadcast scoreboard): cluttered and boring | |
| 13 Nov | **Rejected the second design** (one dial, serif type, no cards): looked like a plain page with big fonts, not a professional app. I asked for the patterns real apps use, like Dream11 and JioHotstar | DECISIONS/0009 |
| 13 Nov | Accepted the third direction (match centre with cards, crests, jerseys and the Pulse ring) as good enough to start building, to be improved alongside the build | Not yet the design I want |
| 13 Nov | Notifications from the open page only; closed-app push not built, because it is not realistic in three days | DECISIONS/0007 |
| 13 Nov | Mini replay as a labelled drawing, not a ball path, because the data has no ball tracking | DECISIONS/0008 |
| 15 Nov | Replay match: Punjab Kings v Mumbai Indians, IPL, 14 May 2026 | Chosen from the test-split matches ranked by `pick_replay.py`: a calm first half and a tight finish, so the Pulse goes from calm to hot |
| 14 Nov | Removed the run-rate feature from the model; cool-down of 6 balls instead of 12; three tabs instead of four; fixed analogy templates when there is no LLM key | BUILD-PLAN "What was done differently" |
| | _(add rows as they happen)_ | |

## How the agent was set up

All of this is in the repository and can be inspected.

| Piece | What it does |
|---|---|
| `CLAUDE.md` | Short project rules: facts come from code, tests first, update the doc in the same change |
| `.claude/skills/` | `new-feature` (spec, plan, failing tests, code, verify), `verify` (run the app and check it in a browser), `run-evals`, `design-review` |
| `.claude/agents/` | Separate reviewers so the builder does not mark its own work: code reviewer, test writer, design critic, data checker |
| `.claude/settings.json` hooks | Format and type-check after each edit; block commits that contain secrets or `.env` files |
| `.mcp.json` | Database, deploy, browser testing and docs lookup |
| `docs/BUILD-PLAN.md` | The ordered task list, with the test to write first for each task |

## Review log

What I checked myself at each checkpoint in the build plan, and what I found.

| Checkpoint | What I checked | What I found or changed |
|---|---|---|
| Documents (13 Nov) | _(fill in)_ | |
| Review 1: model | | |
| Review 2: dial and Focus | | |
| Review 3: tier 1 complete; 30 eval cards scored by hand | | |
| Review 4: README against the running app | | |

## Mistakes the AI made that were caught

Kept because it is the useful part. Add every one, including small ones.

| Date | What went wrong | How it was caught | Fix |
|---|---|---|---|
| 13 Nov | First design direction was cluttered and generic | My review of the mock-ups | Redesigned |
| 13 Nov | Second design over-corrected into a bare page with large serif text | My review of the mock-ups | Redesigned as a match-centre app |
| 13 Nov | The AI wrote full design documents before showing me a screenshot, twice, so two rounds of documents were thrown away | Hindsight | Screenshots first from now on |
| 13 Nov | The original plan described a ball-path replay the data cannot support | The AI checked the data format before writing the spec | Changed to a labelled drawing |
| 14 Nov | The model's run-rate feature blew up in the first over: one six on ball one moved the win chance by 33 points and the opening ball was rated a decider | The AI inspected the exported match and saw a call-back on ball one | Feature removed, model retrained, reason written in MODEL.md |
| 14 Nov | The plan's cool-down (12 balls) made its own target (about 25 call-backs) impossible | The AI worked out the maximum while writing the threshold fit | Cool-down set to 6 balls, documented |
| 14 Nov | A CSS class named `ring` clashed with a Tailwind utility and drew a white box around the Pulse | Seen in the first real screenshot | Class renamed `pulse-ring` |
| 14 Nov | The AI's own template cards broke its own check ("out of 100" was not an allowed phrase; a moment id leaked into the allowed numbers; "one side" counted as the number one) | The template tests failed | Fixed the facts builder, the phrase list and the wording |
| 14 Nov | The first replay match the AI picked was tight for the whole chase, so the Pulse never moved from calm to hot | The demo walk-through | Ranked matches by calm-then-tense shape and switched |
| 14 Nov | Catch me up re-ran an effect on every render | An end-to-end test failed | Callbacks made stable |
| 14 Nov | Tests were mostly written alongside the code, not before it, against the project rule | The AI reported it | Left as is; recorded here and in BUILD-PLAN |
| 15 Nov | The Pulse word touched its ring and "Look up" looked barely different from "Building" | The design-critic agent, reading real screenshots | Ring given more room, hot state made louder |
| 15 Nov | The CI workflow, written by the AI on 13 Nov, used `hashFiles()` in job-level conditions, which GitHub rejects. Every run had failed before starting, unnoticed | The first push of code; the AI read the run status | Conditions removed; CI green |
| | | | |

## What I can explain without help

Tick only when true. This is my check before the demo round.

- [ ] How the match clock keeps two phones on the same ball
- [ ] Why the model is split by date, and what the Brier score means
- [ ] How stakes is computed and why thresholds are set on training data
- [ ] How the Pulse is evaluated and what its numbers mean
- [ ] What the faithfulness check does, rule by rule, and what it cannot catch
- [ ] Why cards are pre-generated
- [ ] How rooms work without login, and what row-level security does
- [ ] What is built, what is designed only, and why
