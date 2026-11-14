# Rubric for analogy quality

Only cards that passed the faithfulness check are scored. Four questions, each 0, 1 or 2.
You are given the facts, the anchors and the card. Score what is written, not what you
would have written.

| #   | Question                                                                                                                                                   | 0                 | 1           | 2       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------- | ------- |
| Q1  | **Right way round.** Does the analogy put the same side ahead, and the same side better off, as the facts (`who_gained`, `chance_before`, `chance_after`)? | Reversed or wrong | Unclear     | Correct |
| Q2  | **Same size.** Does it feel as big as the moment? A 23-point swing is not "a minor setback"; a 5-point one is not "the title decider".                     | Badly off         | Roughly     | Matches |
| Q3  | **Lands for a fan of that world.** Would someone who follows that world get it at once, with no cricket knowledge?                                         | No                | With effort | At once |
| Q4  | **Plain and short.** One clear idea, no jargon, no filler.                                                                                                 | Muddled           | Fine        | Clean   |

A card **passes** if Q1 = 2 and the total is at least 6 of 8. Q1 is a gate: a reversed
analogy is worse than no analogy.

## Scoring by hand

Put one row per card in `evals/results/human_scores.csv`:

```
moment_id,world,q1,q2,q3,q4,note
```

Score 30 cards picked at random, without looking at any other score first.

## Status

The LLM judge is designed (docs/EVALS.md section 5) and not built. Until cards are
generated with an LLM key there is nothing to score: template cards are fixed sentences.
