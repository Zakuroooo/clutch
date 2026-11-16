# Clutch: product requirements

Status: written 13 Nov, before any feature code. Tier 1 was built on 14 and 15 Nov; what is built and measured is in the README.

## 1. The user

A casual fan. They like the occasion more than the sport, and they don't follow cricket closely. They watch in one of two ways:

- **Alone, while working.** The match is on beside the laptop. They look away during quiet stretches.
- **With friends.** Everyone else knows the players. They don't.

This is Pranay's own experience, and it is the starting point of the product.

## 2. The problem

Live sport is long stretches of nothing with a few seconds that matter, and nobody tells the casual fan which seconds.

1. **They miss the moment.** They look away, a wicket or a six happens, and by the time they look back the replay is gone.
2. **They don't know why it matters.** A player walks in, the room roars, and they don't know who he is or why this is big.
3. **They can't keep asking.** Asking friends "what just happened?" every five minutes is embarrassing, so they stop asking and drift to their phone.

Score apps and commentary are made for people who already know the game.

## 3. Hypothesis

> If a fan is called back *when* a moment matters, can see the moment they missed, and is told *why* it matters in terms they already understand, they stop missing the match and stop feeling like an outsider. They stay with it, alone or with friends, and come back for the next one.

**This is untested.** The prototype replays one real past match as if it were live. It has no real users. It can show the experience; it cannot prove the hypothesis. Section 7 says how a real product would test it.

## 4. Scope by tier

Tier 1 must be finished, tested and polished before tier 2 starts. Tier 3 is designed, not built.

| Tier | Features |
|---|---|
| 1: the product | Shared match clock and scoreboard (replay) · win-probability model and stakes · the Pulse and Focus mode call-backs · Moment Shelf with mini replay and "Catch me up" · Your World explanation cards with checks · reviewer demo mode |
| 2: the room | Friends' room by code · reactions · per-over calls and leaderboard · "Back me up" |
| 3: designed, not built | Voice room · floating mini Pulse · memento · spoiler guard · football adapter · roar trigger · push with the app fully closed |

## 5. Tier 1 user stories

Each acceptance criterion is written so a test can check it. Test names are in [TESTING.md](TESTING.md).

### F1. Match clock and scoreboard

*As a fan, I open Clutch and see a match in progress, and it is the same ball on every device.*

- AC1.1 Given a start anchor and the current server time, the clock returns one event index. The same inputs always give the same index (pure function).
- AC1.2 Two browsers in the same room, with device clocks 5 seconds apart, show the same ball within 1 second of each other.
- AC1.3 Refreshing the page returns to the same ball. No progress is lost.
- AC1.4 The scoreboard shows both teams, score, wickets, the over, and during a chase "X runs needed from Y balls". Every value equals the value in the match data for that event.
- AC1.5 A line saying "Replay of a real match, running as live" is visible on every match screen without scrolling.
- AC1.6 When the clock passes the last event, the screen shows the finished state with the real result.

### F2. Win probability and stakes

*As a fan, I don't see a model. I see whether this ball matters.*

- AC2.1 Every event in the replay match has `wp.before`, `wp.after`, `stakes.raw` and `stakes.pct`, produced by the offline pipeline. No value is typed by hand.
- AC2.2 The replay match is in the test split. The pipeline fails if it is not.
- AC2.3 Model metrics (Brier score, log loss, calibration) for the model and both baselines are saved to `model/artifacts/metrics.json` by the pipeline and copied into [MODEL.md](MODEL.md). Until then the tables stay blank.
- AC2.4 Alert thresholds are chosen using training matches only. A test checks the threshold file records the split it was fitted on.

### F3. The Pulse

*As a fan, one glance tells me whether to look up.*

- AC3.1 The Pulse has four states: calm, building, high, decider. The state is a pure function of `stakes.pct` and the thresholds file.
- AC3.2 Each state has a different word, breathing speed and brightness. With reduced motion on, breathing stops and the word and brightness still change.
- AC3.3 The Pulse colour appears nowhere on screen except stakes elements (checked in design review).
- AC3.4 The state is announced to screen readers when it changes, at most once per change.

### F4. Focus mode call-backs

*As a fan who is working, I tell Clutch to stay quiet and call me back for big moments only.*

- AC4.1 I can choose one of three bars: only the decider, big moments, anything notable. The choice survives a refresh.
- AC4.2 When an alert at or above my bar is due, Clutch calls me back about 10 seconds before that ball: a system notification (if I allowed it), one vibration (if the device supports it), and the tab title changes. With the tab in the background on a laptop, the notification still arrives within 5 seconds of its due time.
- AC4.3 No alert fires below my bar. No alert fires twice.
- AC4.4 If I refuse notification permission, Focus mode still works with the tab title and an in-page banner, and the screen says so plainly.
- AC4.5 The Focus screen shows how many call-backs I have had and how many moments are waiting on the shelf.
- AC4.6 The promise text ("about N call-backs in a T20") shows only numbers measured in [MODEL.md](MODEL.md). Until measured it shows no number.

Limit, stated honestly: call-backs need the page to be open (in front or in a background tab). Push to a fully closed app is tier 3. See [DECISIONS/0007](DECISIONS/0007-local-notifications-first.md).

### F5. Moment Shelf, mini replay, Catch me up

*As a fan who looked away, I come back and see exactly what I missed and why it mattered.*

- AC5.1 Every moment (as defined in [CARDS.md](CARDS.md) section 1) that has already happened on the clock appears on the shelf, newest first. Future moments never appear.
- AC5.2 A moment is marked "missed" if the page was hidden, or Focus mode was on, when it happened. Otherwise it is marked seen. The mark survives a refresh.
- AC5.3 Each moment shows: one line of what happened, the score before and after, the win chance before and after, and its card.
- AC5.4 The mini replay is a side-on drawing made only from the recorded outcome (runs, extras, wicket kind). It carries a caption saying it is a drawing and not the ball's real path. It never shows a direction or position that the data does not contain.
- AC5.5 "Catch me up" plays my missed moments oldest first and marks them seen. It can be stopped at any point.
- AC5.6 With no moments yet, the shelf shows an empty state that explains what will appear there.

### F6. Your World cards

*As a fan, I get the explanation in the language of something I already love.*

- AC6.1 On first use I pick one world: football, F1, chess, Bollywood, gaming, or plain. I can change it later. It survives a refresh.
- AC6.2 A card appears for each moment and for each new batter, in my world.
- AC6.3 Every number in a card appears in that card's facts or analogy anchors. Every person or team named is in its facts. The check in [CARDS.md](CARDS.md) section 6 enforces this. A card that fails is never shown.
- AC6.4 If the check fails or the LLM is unavailable, a plain template card built from the facts is shown instead, with no error visible to the fan.
- AC6.5 Two fans in the same world see the same card for the same moment (cards are cached by moment and world).
- AC6.6 "Say it plainly" switches any card to the plain version.
- AC6.7 No card contains betting language (banned list in [CARDS.md](CARDS.md)).

### F7. Reviewer demo mode

*As a reviewer with two minutes, I see the whole idea without waiting for a three-hour match.*

- AC7.1 The start screen offers "Show me in 2 minutes". It opens a solo match a few balls before a big moment.
- AC7.2 "Skip to the next big moment" moves the clock to 8 seconds before the next moment. It works until the match ends, then is disabled.
- AC7.3 The guided demo shows, in order: the Pulse rising, a call-back, a Your World card, the shelf with a missed moment and its mini replay. Each step has one line of explanation and can be skipped.
- AC7.4 Demo mode needs no account, no key and no permission. It works with the database unreachable.

## 6. Tier 2 user stories

### F8. Friends' room by code

- AC8.1 "Watch with friends" creates a room and shows a 6-character code. A friend enters the code and a name and is in. No sign-up, no password.
- AC8.2 Everyone in the room sees the same ball within 1 second (two-browser test).
- AC8.3 The room shows who is here now. When a friend leaves, their marker goes within 10 seconds.
- AC8.4 A wrong code gives a clear message and lets me try again. Codes avoid look-alike characters (no 0, O, 1, I).
- AC8.5 A person outside the room cannot read its members or calls (row-level security test).

### F9. Reactions

- AC9.1 One tap sends a reaction. It bursts across every screen in the room within 1 second.
- AC9.2 Reactions are not stored. A person who joins later does not see old ones.
- AC9.3 A person can send at most 5 reactions in 3 seconds; extra taps are dropped quietly.

### F10. Per-over calls and leaderboard

- AC10.1 Before each over, I can make one call: how many runs this over (0 to 5, 6 to 9, 10 or more). It locks when the over's first ball is bowled on the shared clock.
- AC10.2 After the over, a right call scores 10 points times the over's multiplier (1, 2 or 3, from the over's highest stakes). Points only. No money, no prizes.
- AC10.3 The leaderboard shows everyone's total and updates within 2 seconds of the over ending.
- AC10.4 A call for an over that has started is rejected by the server, not only by the screen.

### F11. Back me up

- AC11.1 I pick my player and a rival from this match's squads. I get up to three true facts where my player leads, one fair point where the rival leads (if any exists), and a short closing line.
- AC11.2 Every number shown equals the value in the player stats file. The check in [CARDS.md](CARDS.md) enforces it.
- AC11.3 The card shows "Based on N matches in our data", with N from the data.
- AC11.4 If my friend asks for the reverse, they get their player's best true case from the same data.
- AC11.5 If my player leads on nothing, Clutch says so and offers the closest comparison. It never invents a stat.
- AC11.6 The closing line teases the argument, never the person. Text matching the abuse list is blocked and replaced with a template line.
- AC11.7 I can drop the card into the room; everyone sees it.

## 7. Success measures

**What this prototype can measure (all blank until measured):**

| Measure | Where it comes from | Result |
|---|---|---|
| Model Brier score vs baselines on test matches | `model/artifacts/metrics.json` | 0.1533 against 0.1926 and 0.2501 |
| Share of each test match's biggest swings that got a call-back first, per Focus bar | `model/artifacts/pulse_eval.json` | 30%, 52%, 82% |
| Call-backs per match, per Focus bar | same | median 2, 8, 20 |
| Cards passing the faithfulness check | `evals/results/summary.json` | templates only so far; no LLM-written cards yet |
| Analogy quality by rubric | same | to be measured |
| Clock agreement between two browsers | Playwright test | to be measured |

**What a real product would measure (not possible here):** minutes stayed per match; share of call-backs followed by a look (app opened or reaction within 30 seconds); whether a casual fan returns for a second match.

## 8. Out of scope

- Re-streaming, clipping or screen sharing of match video. The replay match's own stream is embedded in YouTube's player and nothing else ([DECISIONS/0010](DECISIONS/0010-embedded-match-video.md)).
- Money, betting, fantasy teams, prizes.
- Accounts, passwords, profiles.
- Real players' faces or likenesses, drawn or generated.
- A live data feed. This is a replay.
- More than one sport. The engine is built to take other sports; only cricket is shown.
- Explanation levels (easy or expert). The plan had them; they are cut. "Plain" covers the non-analogy case.

## 9. Non-functional requirements

- Mobile first: works at 360 px wide, one thumb, nothing essential below the fold on the room screen.
- First load of the room under 3 seconds on a mid-range phone on 4G (to be measured).
- Works with the database down for solo mode (tier 1 has no database dependency).
- No secrets in the repository or in client code.
- Accessibility: see [DRD.md](DRD.md) section 6.
