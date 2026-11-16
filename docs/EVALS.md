# Clutch: evals for the cards

Two questions, measured separately:

1. **Faithfulness** (by code): does a card say only what the facts support? This is the check in [CARDS.md](CARDS.md) section 6.
2. **Analogy quality** (by rubric): is the analogy any good for a casual fan?

All results are blank until run. Results live in `evals/results/` and are copied into the README from there.

## 1. Layout

```
evals/
  cases/cards.jsonl          the eval cases (inputs)
  cases/adversarial.jsonl    planted-error cards the check must reject
  outputs/<prompt>/cards.jsonl   what the LLM wrote for each case (committed)
  results/summary.json       pass rates and rubric scores (committed)
  results/human_scores.csv   Pranay's own scores on a sample
  run.ts                     the runner
  rubric.md                  the rubric text given to the judge and to Pranay
```

## 2. The case format

One JSON object per line in `evals/cases/cards.jsonl`:

```json
{
  "id": "c017_football",
  "world": "football",
  "facts": { "...": "a full Facts object, CARDS.md section 2" },
  "anchors": { "minute": 73, "minutes_left": 17 },
  "notes": "big wicket in a chase; batting side was ahead"
}
```

**Where cases come from.** About 40 moments × 6 worlds ≈ 240 cases. The moments are drawn by `evals/make_cases.ts` from **test-split matches other than the replay match**, so the prompt is not tuned on the one match the reviewer sees. They are stratified: at least 5 of each moment kind, a mix of both innings, and at least 8 where the side that gained is the bowling side (the direction that is easiest to get wrong). The script is seeded so the set is reproducible.

Facts in cases are built by the same `facts()` code as production. Nobody types them.

## 3. Faithfulness (code)

For every case, the runner takes the LLM output and runs `check()`.

| Metric | Meaning | Result |
|---|---|---|
| First-try pass rate | Share of outputs passing every rule on the first generation | 211 of 322 (first full run) |
| Pass rate after one retry | | 263 of 322 |
| Template rate | Share that would fall back to a template in production | 59 of 322 in the first run; 35 of 322 shipped after a second pass |
| Failures by rule (R1 to R9) | Which rule failed, counted | Over all failed attempts in the first run: request error or timeout 67, R9 59, R7 12, R8 11, R4 8, R2 7, R1 4, R6 2 |
| By world | Passed (first try or retry) out of 46, first run | plain 42, f1 44, hinglish 41, football 40, chess 37, bollywood 37, gaming 22 |

Source: `evals/results/summary.json`.

The number that matters to the fan is this: **cards shown that break a rule = 0, by construction**, because a failing card is replaced by a template. The pass rate measures how often the fan gets the analogy instead of the plain template.

## 4. Testing the check itself

A check that never fails is worthless. `evals/cases/adversarial.jsonl` holds hand-written cards with one planted error each, with the rule that must catch it:

```json
{ "id": "a03", "must_fail": "R2", "world": "football", "facts": { "…": "…" }, "anchors": { "…": 0 },
  "card": { "headline": "…", "what": "They need 36 from 23.", "why": "…", "watch": null, "used_facts": ["needed"] } }
```

At least three cases per rule, 30 in total, including: a wrong score, a number off by one, a number written as a word, a different player from the same match, a famous footballer's name, a betting word, the losing side "in control", "won" before the match is over, a plain card using football words. There are also 10 **good** cards that must pass, so the check is not simply rejecting everything.

| Metric | Target | Result |
|---|---|---|
| Planted errors caught | 30 of 30 | 30 of 30 (`evals/results/summary.json`) |
| Good cards passed | 10 of 10 | 10 of 10 |

This set runs as a unit test on every push. If someone loosens the check and a planted error slips through, CI fails.

## 5. Analogy quality (rubric)

Only cards that passed the check are scored. Four questions, each 0, 1 or 2. Full text in `evals/rubric.md`.

| # | Question | 0 | 1 | 2 |
|---|---|---|---|---|
| Q1 | **Right way round.** Does the analogy put the same side ahead, and the same side better off, as the facts? | Reversed or wrong | Unclear | Correct |
| Q2 | **Same size.** Does it feel as big as the moment? (A 23-point swing is not "a minor setback", a 5-point one is not "the title decider".) | Badly off | Roughly | Matches |
| Q3 | **Lands for a fan of that world.** Would someone who follows that world get it at once, with no cricket knowledge? | No | With effort | At once |
| Q4 | **Plain and short.** One clear idea, no jargon, no filler. | Muddled | Fine | Clean |

A card **passes the rubric** if Q1 = 2 and the total is at least 6 of 8. Q1 is a gate because a reversed analogy is worse than no analogy.

**Who scores.**
- An LLM judge scores all cards, given the facts, the anchors, the card and the rubric, returning JSON with a score and a one-line reason per question. The judge is a different model from the writer where a free option exists; if it is the same model, the README says so.
- **Pranay scores a random sample of 30 cards by hand,** blind to the judge's scores (`evals/results/human_scores.csv`). Agreement between Pranay and the judge is reported: exact agreement on Q1, and how often they agree on pass or fail.

| Metric | Result |
|---|---|
| Rubric pass rate (judge), all worlds | to be measured |
| Rubric pass rate by world | to be measured |
| Mean score by question | to be measured |
| Judge and human agreement on pass or fail (30 cards) | to be measured |
| Judge and human agreement on Q1 | to be measured |

If agreement is poor, the judge's numbers are not reported as quality; only the human sample is, with its size stated.

## 6. Back me up evals

Smaller set: 20 player pairs from the replay match's squads × 2 worlds (plain and one other).

| Metric | Result |
|---|---|
| Closing lines passing `checkBackup` first try | to be measured |
| Planted errors caught (10 cases: a number, an insult, a sensitive topic, a third player's name) | to be measured |
| Fact rows equal to `players.json` values (code-rendered, expected 100%) | to be measured |
| Fairness: for every pair, swapping the players swaps the leaders | to be measured |

## 7. How evals run

| Command | What it does | Needs an LLM key |
|---|---|---|
| `npm run evals:check` | Runs `check()` over committed outputs in `evals/outputs/<prompt>/`, runs the adversarial set, writes `summary.json`, fails if a planted error passes or if the first-try pass rate drops more than 5 points below the committed summary | No |
| `npm run evals:generate` | Calls the LLM for every case with the current prompt and writes `evals/outputs/<prompt>/` | Yes |
| `npm run evals:judge` | Runs the rubric judge over passing cards | Yes |

**In CI:** only `evals:check` runs, on every push. CI has no LLM key, makes no network calls, and costs nothing. It checks recorded outputs, so it is deterministic.

**When the prompt changes:** bump the prompt version, run `evals:generate` and `evals:judge` locally, commit the new outputs and summary in the same change as the prompt. CI then guards that version. A prompt change without new committed outputs fails CI (the runner checks that outputs exist for the current prompt version).

## 8. What these evals do not show

- Whether real fans find the analogies helpful. Nobody outside the builder has used this.
- Whether the judge model shares the writer's blind spots.
- Anything beyond cricket and the six worlds.

## 9. Status on 17 Nov 2026

Built and run: the adversarial set (30 of 30 caught, 10 of 10 good cards pass) and `npm run evals:check`, which also re-checks every recorded card for the replay match. Run against a real model on 17 Nov 2026: `npm run pregen` with Gemini (gemini-3.5-flash-lite), prompt p2, all 322 cards for the replay match. First full run: 211 passed first time, 52 on retry, 59 fell back to a template (`evals/results/pregen_log_run1.json`). A second pass retried only those 59; 287 of the shipped cards are now model-worded and 35 are templates, and all 322 pass the check again in `evals:check`. Not run: the rubric (section 5) and the judge, which is designed, not built. Back me up (section 6) is tier 2 and not built.
