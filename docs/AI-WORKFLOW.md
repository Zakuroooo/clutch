# How AI was used to build Clutch

The submission form asks which AI tools were used and for what. This file is the full, honest answer. It is filled in as work happens, not afterwards. If a row is not true, it is corrected, not polished.

## The short version

- **Mine (Pranay):** the fan problem, which comes from how I actually watch sport; the hypothesis; the product decisions (what to build, what to cut, the name, the design direction); the choice of replay match; reviewing and accepting or rejecting what the AI produced; scoring eval cards by hand.
- **AI-assisted:** research into what exists, the planning documents, the design mock-ups, and most of the code and tests.

I did not write most of this code by hand. I directed it, reviewed it, and studied it so I can explain every part.

## Tools

| Tool | Used for | Not used for |
|---|---|---|
| Claude Code (Anthropic), model Claude Fable 5.2 | Research, the plan, every document in `docs/`, the design tokens and mock-ups, the agent setup in `.claude/`; from 14 Nov, code and tests | Deciding the problem, the hypothesis or scope |
| _LLM provider used in the product (fill in: name and model)_ | Wording of explanation cards and Back me up closing lines, from facts built by code | Any fact, number or decision in the product |
| _Judge model for the rubric (fill in)_ | Scoring analogy quality in evals | |
| _Any other tool (fill in, or delete this row)_ | | |

## What I decided, and what I rejected

| Date | Decision | Mine or AI's suggestion | Notes |
|---|---|---|---|
| 13 Nov | The fan problem: missing moments while working; not knowing why a player matters; not wanting to keep asking friends | Mine | From my own experience |
| 13 Nov | The name "Clutch" | AI suggested, I chose _(confirm)_ | |
| 13 Nov | Three scope tiers; tier 1 before anything else | AI proposed after I gave the real deadline; I agreed | |
| 13 Nov | **Rejected the first design.** It followed a "broadcast scoreboard" brief and looked cluttered and like every other sports app. I asked for something classy and minimal | Mine | Led to the single-dial design. See DECISIONS/0009 |
| 13 Nov | Notifications from the open page only; closed-app push not built | AI flagged it as unrealistic in three days; _(fill in: agreed / changed)_ | DECISIONS/0007 |
| 13 Nov | Mini replay as a labelled drawing, not a ball path | AI found the data has no tracking; _(fill in)_ | DECISIONS/0008 |
| | Replay match chosen: _(fill in)_ | Mine | |
| | My world for the demo: _(fill in)_ | Mine | |
| | _(add rows as they happen)_ | | |

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
| 13 Nov | First design direction was cluttered and generic | My review of the mock-ups | Redesigned around one dial |
| 13 Nov | The original plan described a ball-path replay the data cannot support | The AI checked the data format before writing the spec | Changed to a labelled drawing |
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
