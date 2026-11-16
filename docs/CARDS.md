# Clutch: moments, facts and cards

The one rule: **facts come from code, wording comes from the LLM, and code checks the wording before anyone sees it.**

Code: `lib/cards/` and `lib/adapters/cricket/`. Pre-generation script: `scripts/pregen-cards.ts`.

## 1. The moment engine

A moment is something worth keeping on the shelf. `detectMoments` walks the timeline once and applies these rules in order. A ball that matches several rules produces one moment, with the first matching kind.

| Kind | Rule |
|---|---|
| `result` | The last ball of the match |
| `innings_end` | The last ball of innings 1 |
| `wicket_big` | A wicket falls and (`|wp.after − wp.before| ≥ moment.min_swing` **or** `stakes.pct ≥ pulse.high`) |
| `over_big` | The last ball of an over in which the win chance moved by at least `1.5 × moment.min_swing` from the over's first ball to its last, and no other moment was recorded in that over |
| `swing` | `|wp.after − wp.before| ≥ moment.min_swing` on a single ball (a six, a four, a costly extra) |
| `milestone` | The batter reaches 50 or 100 on this ball |

A separate, lighter event, **not** a shelf moment, triggers a card only:

| Kind | Rule |
|---|---|
| `new_batter` | The first ball faced by a batter who came in after a wicket, when `stakes.pct ≥ pulse.building`. At most one per wicket. |

`moment.min_swing` and the `pulse.*` cut-offs come from `data/thresholds.json` (MODEL.md section 6.5).

### `moments.json`

```json
[
  {
    "id": "m_187",
    "i": 187,
    "kind": "wicket_big",
    "level": "big",
    "over_label": "16.1",
    "swing": -0.23,
    "replay_kind": "caught"
  }
]
```

- `level` is `notable`, `big` or `decider`, from the ball's `stakes.pct` against the alert thresholds. It decides nothing about visibility on the shelf (all moments show); it orders "Catch me up" when time is short.
- `swing` is `wp.after − wp.before` for the team that batted first.
- `replay_kind` is one of: `dot`, `runs`, `four`, `six`, `bowled`, `caught`, `lbw`, `run_out`, `stumped`, `wide`, `no_ball`, `none` (for `over_big`, `innings_end`, `result`, which show the win-chance line only).

## 2. The facts

For each moment and each new-batter event, `facts()` builds one object from the timeline. Nothing else is given to the LLM, and the check uses the same object.

```ts
type Facts = {
  moment_id: string;
  kind: "result" | "innings_end" | "wicket_big" | "over_big" | "swing" | "milestone" | "new_batter";
  over_label: string;                  // "16.1"
  batting_team: string;                // "South Africa"
  bowling_team: string;                // "India"
  score_before: string;                // "151/4"
  score_after: string;                 // "151/5"
  // chase only (null in innings 1)
  needed: number | null;               // runs still needed after this ball
  balls_left: number | null;
  wickets_left: number;
  // the ball
  batter: string | null;
  bowler: string | null;
  runs_off_ball: number;
  wicket: { kind: string; player_out: string; fielder: string | null } | null;
  // batter's innings so far (after this ball); null when not relevant
  batter_runs: number | null;
  batter_balls: number | null;
  // over summary, for over_big
  over_runs: number | null;
  // win chance, as whole percentages, for the team named in chance_team
  chance_team: string;
  chance_before: number;               // 71
  chance_after: number;                // 48
  who_gained: string;                  // the team whose chance went up
  // result only
  result: { winner: string; margin: string } | null;   // margin: "7 runs" | "4 wickets"
  // new_batter only
  new_batter: { name: string; matches: number; strike_rate: number | null; average: number | null } | null;
  // the two allow-lists used by the check, built by code from the fields above
  numbers: number[];                   // every number that appears in any field above
  names: string[];                     // every person and team named above, plus surnames
};
```

Rules for the builder:
- Percentages are rounded to whole numbers. Rates are rounded to one decimal.
- `chance_team` is the batting team in a chase and the team batting first otherwise, so the sentence reads naturally.
- `names` includes each full name and its last word ("H Klaasen" and "Klaasen").
- If a field cannot be computed, it is `null`. Never a guess.
- For `innings_end`, `needed` is what the other side must now chase (the score plus one) and `balls_left` is a full innings, so the template can say "{bowling_team} need {needed}".
- `numbers` is built from every field except `moment_id`, which is a label. `names` also holds each word of a team name.
- In R2, names from `facts.names` are set aside before number words are looked for, so a surname that is also a number word is not read as a number.

## 3. Your World: analogy rules

The fan picks one world. The LLM writes the "why" line in that world's terms.

**General rules (all worlds):**
1. The analogy explains **why the situation matters**, not the cricket action itself.
2. It uses roles, never real people, clubs, teams, films or games from that world. "Your best striker", not a footballer's name. This keeps us from stating false facts about real people.
3. Any number in the analogy must come from the facts or from the world's **anchors** (below). The LLM may not invent "the 88th minute"; code computes it.
4. It must keep the direction right: who is ahead, who just gained.
5. One or two sentences, at most 220 characters.
6. No betting language. No insults.

**Anchors.** `anchors(moment, world)` maps match progress onto the world's own scale. `p` is the share of the whole match completed (balls bowled ÷ 240, both innings); `q` is the share of the current innings.

| World | Anchors computed by code | Typical vocabulary allowed |
|---|---|---|
| `football` | `minute` = round(90 × p), `minutes_left` = 90 − minute | striker, keeper, red card, penalty, extra time, one goal up or down, bench |
| `f1` | `lap` = max(1, round(50 × p)), `laps_left` = 50 − lap, `total_laps` = 50 | pit stop, safety car, tyres, pole, gap, overtake, podium |
| `chess` | `move` = max(1, round(40 × p)) | queen, sacrifice, endgame, clock, time trouble, a pawn up |
| `bollywood` | `act` = 1 before the innings break, 2 after | interval, climax, hero, villain, twist, the last song, the final scene |
| `gaming` | `round` = max(1, round(12 × p)), `total_rounds` = 12 | final boss, health bar, respawn, clutch round, carry, last life |
| `hinglish` | none | no analogy: the facts said the way friends talk, Hindi and English mixed in Roman script |
| `plain` | none | no analogy: a plain-words explanation for someone new to cricket |

The 50 laps, 40 moves and 12 rounds are fixed, stated conventions so the mapping is the same every time. They are not claims about any real race or game.

## 4. The prompt and the output schema

Prompt version: `p2` (p2 adds the Hinglish world). The version is part of every cache key. Any change to the text below bumps it.

**System**

```
You write one short explanation card for a casual fan watching a cricket match.
You are given FACTS as JSON. The facts are complete and correct.

Rules:
- Use only the FACTS. Do not add any number, name, record or history that is not in FACTS or ANCHORS.
- Every number you write must appear in FACTS.numbers or ANCHORS. Write numbers as digits.
- Name only people and teams in FACTS.names. Never name a real person, club, film or game from the analogy world; use roles ("your best striker").
- Keep the direction right: FACTS.who_gained is the side that is better off after this moment.
- No betting or gambling words. No insults.
- "headline": at most 45 characters. A spoken line that says what it means for the match. End with a full stop.
- "what": one sentence of plain fact, at most 120 characters.
- "why": at most 220 characters. If WORLD is not "plain", explain why this matters as an analogy from WORLD, using ANCHORS where a number helps. If WORLD is "plain", explain it in everyday words with no cricket jargon. If WORLD is "hinglish", write every field in natural Hinglish (Hindi and English mixed, Roman script, the way friends talk), with no analogy.
- "watch": one thing to look for next, at most 90 characters, or null.
- "used_facts": the names of the FACTS fields you relied on.
Return only JSON matching the schema.
```

**User**

```
WORLD: {world}
ANCHORS: {anchors as JSON}
FACTS: {facts as JSON}
```

**Output schema** (also the Zod schema `CardText` in `lib/cards/schema.ts`):

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["headline", "what", "why", "watch", "used_facts"],
  "properties": {
    "headline":   { "type": "string", "minLength": 3, "maxLength": 45 },
    "what":       { "type": "string", "minLength": 10, "maxLength": 120 },
    "why":        { "type": "string", "minLength": 20, "maxLength": 220 },
    "watch":      { "type": ["string", "null"], "maxLength": 90 },
    "used_facts": { "type": "array", "minItems": 1, "items": { "type": "string" } }
  }
}
```

Temperature 0.7, max 300 output tokens, timeout 8 s, one retry.

A stored card is the LLM's text plus what code adds: `moment_id`, `world`, `kind`, `source`, `checked`, and the display data (`over_label`, `chance_team`, `chance_before`, `chance_after`) taken from the facts.

## 5. Pre-generation

`scripts/pregen-cards.ts` runs once per replay match (and again when the prompt version changes):

```
for each moment and new-batter event × each of the 6 worlds:
    facts = facts(moment); anchors = anchors(moment, world)
    text = LLM(prompt p1)             // skipped if LLM_PROVIDER=none
    result = check(text, facts, anchors, world)
    if result.ok: save with source "pregen"
    else: retry once; if it fails again save the template with source "template"
    append { moment_id, world, ok, failed_rule } to evals/results/pregen_log.json
```

It sleeps between calls to stay under the provider's free-tier rate limit, can resume, and writes `data/matches/<id>/cards.json` keyed by `"<moment_id>:<world>"`. The share of cards that passed first time, passed on retry, and fell back to a template is reported in the README from the log. It is never hidden.

## 6. The faithfulness check, in exact terms

`check(text, facts, anchors, world) → { ok: true } | { ok: false, rule: string, detail: string }`

The check runs on the three text fields joined together (`headline`, `what`, `why`, `watch`). It fails on the **first** rule broken. All matching is case-insensitive unless stated.

| # | Rule | Exact test |
|---|---|---|
| R1 | Shape | The object parses with the `CardText` schema (types, required fields, length limits). |
| R2 | Numbers | Extract every match of `\d+(?:\.\d+)?` from the text. Also convert number words `zero` to `twenty`, `thirty`, `forty`, `fifty`, `hundred` to numbers (so "ten minutes" counts as 10); the words `one` and `a` used as articles are ignored ("one goal up" is allowed only if 1 is in the allowed set **or** the phrase is in the world's fixed-phrase list below). Each extracted number must equal, within 0.05, a value in `facts.numbers` or in `anchors`. An over label such as "16.1" matches `facts.over_label`. A score such as "151/5" must equal `score_before` or `score_after`. |
| R3 | Names from this match | For every name in the match's full player and team list (from `timeline.json`, full names and surnames of 4 or more letters), if it appears in the text as a whole word it must be in `facts.names`. This catches a wrong player being named. |
| R4 | No real people from the world | The text must not contain any entry of the world's deny-list (`lib/cards/worlds/<world>.deny.txt`: well-known people, clubs, teams, films and game titles). In addition, any capitalised word that is not at the start of a sentence must be in `facts.names` or in the world's vocabulary list or in a small list of ordinary capitalised words (`I`, month and day names). |
| R5 | Direction | Let `G = facts.who_gained` and `L` the other team. The text fails if it matches `L` followed within 40 characters by any of: `on top`, `in control`, `favourites`, `cruising`, `ahead now`, `take charge`; or `G` followed within 40 characters by any of: `in trouble`, `collapsing`, `slipping`, `lose their grip`. (A narrow, mechanical check. Wider direction errors are measured by the rubric in EVALS.md.) |
| R6 | No result unless it is one | If `facts.result` is null, the text must not match `\b(won|wins the match|have won|has won|victory is theirs|jeet gaye|jeet gayi|jeet liya|jeet gaya)\b`. |
| R7 | Banned words | The text must not contain, as whole words: `bet`, `bets`, `betting`, `odds`, `wager`, `gamble`, `gambling`, `jackpot`, `payout`, `bookie`, `punter`, or any word in `lib/cards/abuse.txt`. |
| R8 | Used facts are real | Every entry of `used_facts` is a field name of `Facts`, and its value is not null. |
| R9 | The analogy is one | If `world` is an analogy world, the `why` field contains at least one word from that world's vocabulary list. If `world` is `plain` or `hinglish`, it contains none of the analogy worlds' vocabulary. |

In R4, a deny-listed word that is also a person or team in this moment's facts is allowed: it is that player, not the famous person (a player named Anand is not the chess champion).

**Fixed phrases allowed by R2** (numbers that are idiom, not data): `out of 100` (the scale every chance is stated on), `one goal up`, `one goal down`, `a goal up`, `a goal down`, `one move`, `one lap`, `one life`, `last life`, `first ball`, `one ball`, `one over`, `one shot`, `number one`.

The check is deliberately strict. A false failure costs nothing: the fan gets a correct template card. A false pass shows a wrong fact. When in doubt, fail.

The check itself is tested with planted errors (EVALS.md section 4): a wrong score, a wrong player, a real footballer's name, a betting word, the wrong team "in control". Every planted error must be caught.

## 7. Back me up

### 7.1 The data: `players.json`

Built offline by `model/src/export.py` from **all matches in our dataset** (the same Cricsheet files as the model, every split, since this is counting, not predicting). For every player in the replay match's two squads:

```json
{
  "V Kohli": {
    "id": "ba607b88",
    "team": "India",
    "jersey": 18,
    "matches": 0,
    "batting": {
      "innings": 0, "runs": 0, "average": null, "strike_rate": null,
      "fifties": 0, "sixes": 0,
      "chase_innings": 0, "chase_average": null, "chase_fifties": 0, "chase_not_outs": 0,
      "death_strike_rate": null
    },
    "bowling": { "innings": 0, "wickets": 0, "economy": null, "death_economy": null }
  }
}
```

Zeros and nulls here are placeholders; real values come from the pipeline. `id` is the Cricsheet registry id. Jersey numbers are not in Cricsheet: they are typed into a small file, `data/jerseys.json`, by hand from a public squad list, and a missing number shows as no number.

A stat is `null` when its sample is too small: fewer than 10 innings for averages and rates, fewer than 60 balls for death-over rates.

### 7.2 Choosing the facts (code, not the LLM)

Comparable stats, each with a direction:

| Key | Label shown | Better is |
|---|---|---|
| `average` | average | higher |
| `strike_rate` | strike rate | higher |
| `fifties` | fifties | higher |
| `chase_average` | average when chasing | higher |
| `chase_fifties` | fifties in chases | higher |
| `chase_not_outs` | not out at the finish of a chase | higher |
| `death_strike_rate` | strike rate in the last five overs | higher |
| `sixes` | sixes | higher |
| `wickets` | wickets | higher |
| `economy` | runs given per over | lower |
| `death_economy` | runs given per over in the last five | lower |

Algorithm:
1. Keep stats where both players have a non-null value. If both are mainly batters, use batting stats; both bowlers, bowling stats; otherwise the stats both have.
2. For each, compute the margin: `(mine − theirs) / max(|mine|, |theirs|)`, sign flipped for "lower is better".
3. **My facts:** up to three stats with the largest positive margin (at least 0.03).
4. **Fair point:** the one stat with the largest negative margin, if any. It is always shown when it exists.
5. If there are no positive margins, return `leader: "theirs"` on everything and the screen says "On these numbers, theirs is ahead" with the closest stat.
6. If either player has fewer than 10 matches in the data, return the "too little data" state.
7. During the match, add **live ammo** if a player has batted or bowled today: "today: 40 off 22", from the timeline up to the current ball. It is a fact row, built by code.

### 7.3 The closing line

Only the closing line is written by the LLM. Prompt version `b1`.

**System**

```
Two friends are arguing about which of two cricketers is better. Write ONE closing line for the friend who supports MINE.
You are given FACTS as JSON: the stats where MINE leads, and one where THEIRS leads.

Rules:
- At most 110 characters. Cheeky, warm, never cruel. End with a full stop.
- Tease the argument, never the person. Nothing about any person's looks, family, religion, region, country, caste, gender or personal life. No insults, no swearing.
- Do not write any number. The numbers are shown beside your line.
- Do not claim anything that is not supported by FACTS. Do not say MINE is better at the thing in fair_point.
- You may name only the two players, by the names in FACTS.
- If WORLD is not "plain", you may use one image from WORLD, with roles and no real names.
Return only JSON: {"closing": "..."}.
```

**Check for Back me up** (`checkBackup`):

| # | Rule |
|---|---|
| B1 | `closing` is a string of 10 to 110 characters |
| B2 | It contains no digits and no number words (the numbers are rendered by code from `players.json`, so they cannot be wrong) |
| B3 | Names: same as R3 and R4, with allowed names being the two players |
| B4 | Banned and abuse lists (R7), plus the sensitive-topic list `lib/cards/sensitive.txt` (religion, caste, region, country, family, body, gender terms). Any hit fails |
| B5 | It does not contain the fair-point stat's label words next to the name of my player |

On failure, one retry, then a template closing line chosen by hash from five fixed lines such as "The numbers have spoken. Your move."

Every Back me up card shows: **"Based on N matches in our data."** where N is the smaller of the two players' `matches`. It is rendered by code.

**Fairness:** the same function with the players swapped gives the friend their best true case. Both use the same data and the same rules.

## 8. Fallback templates

Used when the LLM is off, slow, or fails the check. Built by code from the facts, so they are always correct. `{…}` are `Facts` fields.

**Two layers.** The table below is the plain card. On top of it, each world has one fixed analogy sentence per kind (`lib/cards/templates.ts`), filled with the anchors, used as the "why" line: for a wicket in football, "Think of minute {minute} in football: {batting_team} just lost a striker to a red card, and {bowling_team} have the momentum." The sentences use roles only and say nothing the facts do not support; a wicket analogy is used only when `who_gained` is the bowling side, otherwise the card stays plain. They pass through the same check as an LLM card. With no LLM key, this is what the fan reads.

| Kind | Headline | What | Why (plain) |
|---|---|---|---|
| `wicket_big` | "{wicket.player_out} is out." | "{wicket.player_out} is out for {batter_runs} off {batter_balls}. {batting_team} are {score_after}." | "{chance_team}'s chance of winning went from {chance_before} to {chance_after} out of 100 on that ball." |
| `swing` | "{batter} hits a six." or "a four."; "A dot ball that hurts." for no run; otherwise "{runs_off_ball} off one ball." | "{runs_off_ball} off this ball, {bowler} to {batter}. {batting_team} are {score_after}." (the facts do not say whether the runs were extras, so the sentence does not claim the batter hit them) | same chance sentence |
| `over_big` | "{over_runs} runs in one over." | "{batting_team} go from {score_before} to {score_after} in the over." | same chance sentence |
| `milestone` | "{batter} reaches {batter_runs}." | "{batter} has {batter_runs} off {batter_balls} balls." | "A batter who has been in this long is hard to stop, and {batting_team} know it." |
| `innings_end` | "{bowling_team} need {needed}." | "{batting_team} finish on {score_after}." | "Now the other side bats and has to beat that score." |
| `result` | "{result.winner} win." | "{result.winner} win by {result.margin}." | "That's the match." |
| `new_batter` | "{new_batter.name} walks in." | "{new_batter.name} comes in with {batting_team} {score_after}." | "We have {new_batter.matches} of his matches in our data." (omitted if matches is 0) |

In a chase, the template `watch` line is "{batting_team} need {needed} from {balls_left} balls." Otherwise null.

Template cards go through the same check (they must pass; a test asserts this for every moment in the replay match).
