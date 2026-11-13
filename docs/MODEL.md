# Clutch: the win-probability model, stakes and the Pulse

Status: built and run on 14 Nov 2026. Every number below was copied from the artifact file named beside its table. Do not type a number into this file by hand; rerun the pipeline and copy it.

Code lives in `model/`. It runs offline on a laptop (8 GB RAM is enough) and never in production.

## 1. What the model does

For any point in a T20 match it estimates the chance that the team batting first wins. From that we derive two things the product uses:

- **Win chance before and after each ball** (shown on cards and the shelf).
- **Stakes for each ball** (drives the Pulse and the call-backs).

It is a simple model on public data. It knows the score situation and nothing else: not who is batting, not the pitch, not the teams.

## 2. Data

Source and licence: [DATA.md](DATA.md). Men's T20 matches from Cricsheet (T20 internationals and the IPL to start; add more leagues only if needed).

**Excluded matches:** no result, ties, matches decided by a super over, matches shortened by rain or with a Duckworth-Lewis-Stern target (`outcome.method` present, or innings `overs` not 20), and matches with missing innings. The count of each exclusion is saved to `model/artifacts/data_report.json`.

**One row per ball** (including wides and no-balls), with the state *before* that ball.

From `model/artifacts/data_report.json` (downloaded 2026-11-14): 4,892 files read, 4,482 matches kept, 410 excluded, 1,048,402 balls. Excluded: 152 with a rain-rule method, 105 with a shortened chase, 91 ties or no-results, 51 decided by a super over or bowl-out, 11 not 20 overs a side.

## 3. Features

| Feature | Meaning | Innings |
|---|---|---|
| `innings` | 1 or 2 | both |
| `balls_left` | legal balls left in this innings (120 at the start) | both |
| `wickets_left` | 10 minus wickets fallen | both |
| `score` | runs so far in this innings | both |
| `target` | runs needed to win at the start of the chase | 2 only (0 in innings 1) |
| `needed` | runs still needed | 2 only |
| `rrr` | required run rate (needed per over left; capped at 36) | 2 only |

Label: `1` if the team that batted first won the match.

No feature uses anything from the future, and no feature identifies teams or players. That keeps the model honest and easy to explain.

**The current run rate is not a feature.** The first version had it. Early in an innings it is runs divided by almost nothing, so one six on the first ball swung the win chance wildly and the opening over looked like a decider. Score and balls left carry the same information without the blow-up, and removing it changed the validation Brier score only in the fourth decimal place. The scoreboard still shows the run rate; the model does not read it.

## 4. Split

By match and by date. A ball never appears in a different split from the rest of its match.

1. Sort matches by start date.
2. **Train:** the earliest 70% of matches. **Validation:** the next 15%. **Test:** the latest 15%.
3. The replay match must be in the test split. `model/src/split.py` fails if it is not.
4. The split is saved to `model/artifacts/split.json` (match ids per split and the two cut-off dates), so every later step uses the same one.

Why by date and not random: a random split would let the model train on matches played after the ones it is tested on, which flatters the score.

| | Matches | Balls | From | To |
|---|---|---|---|---|
| Train | 3,137 | 739,719 | 2005-02-17 | 2024-08-25 |
| Validation | 672 | 155,080 | 2024-08-25 | 2025-10-15 |
| Test | 673 | 153,603 | 2025-10-16 | 2026-11-01 |

Source: `model/artifacts/split.json`.

## 5. Models and baselines

| Name | What it is |
|---|---|
| Baseline A: constant | Always predicts the training share of matches won by the team batting first |
| Baseline B: run-rate rule | Innings 1: Baseline A. Innings 2: a one-feature logistic regression on required run rate minus the run rate so far |
| Model 1: logistic regression | All features, standardised, separate models for innings 1 and innings 2 |
| Model 2: gradient-boosted trees | `HistGradientBoostingClassifier`, same features, separate models for innings 1 and innings 2, tuned on validation only (depth, learning rate, iterations, and whether to force sensible directions: more runs needed can never help the chasing side) |

The shipped model is whichever of Model 1 and Model 2 has the lower validation Brier score. If they are within noise, ship the logistic regression because it is easier to explain. "Within noise" is tested, not judged by eye: resample validation matches 1,000 times and take the 95% interval of (logistic − boosted) Brier; the boosted trees ship only if the whole interval is above zero. The test set is used once, at the end, to report.

### Metrics

- **Brier score:** mean of (predicted chance − outcome)². Lower is better. Always predicting 0.5 scores 0.25.
- **Log loss.**
- **Calibration:** split predictions into 10 equal-width bins; in each, compare the mean prediction with the share that actually won. Reported as a chart (`model/artifacts/calibration.png`) and as expected calibration error (the bin-size-weighted mean gap).
- All three are also reported by phase: innings 1, innings 2 overs 1 to 10, innings 2 overs 11 to 20.

Because balls from one match are not independent, confidence intervals come from resampling **matches** (1,000 bootstrap samples of test matches), not balls.

| On test matches | Brier (95% interval) | Log loss (95% interval) | Calibration error |
|---|---|---|---|
| Baseline A: constant | 0.2501 (0.2499 to 0.2503) | 0.6933 (0.6929 to 0.6938) | 0.0158 |
| Baseline B: run-rate rule | 0.1926 (0.188 to 0.1971) | 0.5566 (0.5452 to 0.5689) | 0.0175 |
| Model 1: logistic regression | 0.155 (0.1457 to 0.1644) | 0.4617 (0.4383 to 0.4858) | 0.0223 |
| Model 2: gradient-boosted trees | 0.1533 (0.144 to 0.1623) | 0.4552 (0.4325 to 0.4777) | 0.018 |

Source: `model/artifacts/metrics.json` (673 test matches, 153,603 balls; intervals from 1,000 resamples of matches).

**Shipped model: Model 2, gradient-boosted trees** (depth 3, learning rate 0.05, 300 iterations, directions forced). On validation the logistic regression scored 0.16657 and the boosted trees 0.16479; the 95% interval of the difference is 0.00035 to 0.00316, which is above zero, so the trees ship. The gain is small. Both models are far better than the baselines and close to each other.

| Shipped model by phase (test) | Brier | Calibration error |
|---|---|---|
| Innings 1 | 0.197 | 0.0293 |
| Innings 2, overs 1 to 10 | 0.1233 | 0.0254 |
| Innings 2, overs 11 to 20 | 0.0724 | 0.0123 |

## 6. From win chance to stakes, the Pulse and call-backs

### 6.1 Stakes for a ball

**Stakes = how far apart the win chance would be after the best and the worst thing that can happen on this ball.**

For the state `s` before a ball:

```
best  = WP(s after the batting side scores 6 off this ball)
worst = WP(s after the batting side loses a wicket and scores 0)
stakes.raw = | best_for_batting_side − worst_for_batting_side |
```

Both outcomes use up one ball. If a six would win the match, `best` is 1 for the batting side; if a wicket would end the innings in a chase, `worst` is 0.

This uses only the model and the current state. It does not look at what actually happened next, so it can be computed "live".

`stakes.pct` is the percentile (0 to 100, to one decimal place) of `stakes.raw` among all balls in **training** matches. The percentile table is saved to `model/artifacts/stakes_percentiles.json`. Percentiles make the thresholds below readable: "90" means "bigger than 90% of balls ever bowled in our training data".

### 6.2 Pulse states

| State | Rule |
|---|---|
| calm | `stakes.pct < pulse.building` |
| building | `pulse.building ≤ pct < pulse.high` |
| high | `pulse.high ≤ pct < pulse.decider` |
| decider | `pct ≥ pulse.decider` |

### 6.3 Call-backs (alerts)

A call-back fires **before** a ball, so the fan looks up in time. For each Focus bar `b` in {notable, big, decider} with threshold `alert[b]`:

> Walk through the match ball by ball. A ball's level is the highest bar whose cut-off its `stakes.pct` reaches. It fires a call-back unless one of the same or a higher level fired in the last `cooldown_balls` legal balls of this innings.

So a step up (a "big" call-back, then a "decider" two balls later) is never swallowed by the cool-down, and repeats at the same level are. Each alert is stored once, at its level; a fan at bar `b` receives every alert at level `b` or above. The code is `model/src/alerts.py`, used by the threshold fit, the evaluation and the export, so all three agree. The line shown is chosen by code: "This over can decide it" (decider), "Big moment coming" (big), "Worth a look" (notable). It fires 10 seconds before the ball on the replay clock.

### 6.4 Moments (for the shelf)

A moment is recorded **after** a ball, from what actually happened. Rules are in [CARDS.md](CARDS.md) section 1; the one tuned number is `moment.min_swing`, the smallest change in win chance on one ball that counts.

### 6.5 Setting the thresholds, on training data only

All thresholds are chosen by `model/src/thresholds.py` using **training matches only**, then frozen in `data/thresholds.json` with `"fitted_on": "train"`.

| Threshold | How it is chosen |
|---|---|
| `alert.decider` | The `pct` cut-off giving a median of about 4 call-backs per training match |
| `alert.big` | Median of about 12 |
| `alert.notable` | Median of about 25 |
| `alert.cooldown_balls` | 6 (one over). Fixed, not tuned. The plan said 12, but that caps a match at 20 call-backs, so the "about 25" target could never be reached |
| `pulse.high`, `pulse.decider` | Equal to `alert.big` and `alert.decider`, so the Pulse and the call-backs agree |
| `pulse.building` | Halfway (in percentile) between 50 and `pulse.high` |
| `moment.min_swing` | The swing giving a median of about 15 moments per training match |

The targets (4, 12, 25, 15) are product choices: they are what "only the decider", "big moments" and "everything" should feel like. The numbers that result on test matches are whatever they are, and are reported below.

| Threshold | Value |
|---|---|
| `alert.decider` (= `pulse.decider`) | 88.6 |
| `alert.big` (= `pulse.high`) | 76.5 |
| `alert.notable` | 52.4 |
| `pulse.building` | 63.2 |
| `moment.min_swing` | 0.0572 |

Source: `data/thresholds.json`, fitted on 3,137 training matches. Medians reached on training matches: 4, 12 and 25 call-backs, and 15 moments.

## 7. Evaluating the Pulse itself

The model's Brier score does not tell us whether the call-backs are any good. This does.

**The question:** on matches the model has never seen, if a fan only looked up when called, how many of the match's biggest swings would they have caught, and how often were they called?

**Definitions, per test match:**

- **Biggest swings:** the 10 balls with the largest actual change in win chance, `|wp.after − wp.before|`.
- **Caught:** a swing is caught at bar `b` if a call-back for bar `b` (or higher) fired in the 6 legal balls up to and including that ball. Six balls is one over: "this over can decide it".
- **Coverage at bar `b`:** caught swings ÷ 10, averaged over test matches.
- **Call-backs per match at bar `b`:** the count, reported as median and 10th to 90th percentile.

**Comparisons at the same number of call-backs** (otherwise more alerts always look better):

| Strategy | What it does |
|---|---|
| Random | The same number of call-backs per match, at random balls |
| Last overs | The same number of call-backs, spread evenly over the final overs of the chase |
| After wickets | A call-back on the ball after each wicket (reactive, like a score app's notification) |

| On 673 test matches | Call-backs per match (median, 10th to 90th) | Coverage of top-10 swings | Random, same count | Last overs, same count |
|---|---|---|---|---|
| The decider | 2 (0 to 12) | 30% | 10% | 18% |
| Big moments | 8 (1 to 21) | 52% | 22% | 30% |
| Everything | 20 (6 to 35) | 82% | 42% | 50% |

After wickets (reactive, a call-back on the ball after each wicket): a median of 12 call-backs a match and 23% coverage. Its count is its own, not matched to a bar.

**How to read it.** At every bar the Pulse catches two to three times as many of the biggest swings as the same number of random call-backs, and clearly more than calling the fan back for the final overs. It is not complete: at "Big moments" about half of a match's ten biggest swings had a call-back in the over before them. The spread is wide because matches differ: a one-sided match has almost no call-backs and a tight one has many.

Source: `model/artifacts/pulse_eval.json`. The same file gives the replay match's own row, which is what a reviewer will actually experience.

**The promise shown in the product** ("about N call-backs in a match, covering most of its biggest swings") is filled from this table and nowhere else. If coverage is poor, the product says the true number or drops the claim.

## 8. Limits to state plainly

1. **The yardstick is the model's own.** "Biggest swings" are measured with the same model that triggers the call-backs. A swing the model cannot see (a dropped catch, a key player's injury) is invisible to both. The comparison against random and reactive strategies is fair; the absolute coverage number is optimistic.
2. **Situation only.** The model does not know who is batting or bowling. A chase needing 30 from 12 is scored the same whoever is at the crease.
3. **Men's T20s only**, from the leagues listed in DATA.md. It is not validated for other formats or for women's matches.
4. **Shortened matches are excluded,** so the model is not valid for them.
5. **Innings 1 is weak.** With no target, the score situation says little about who wins. Expect innings-1 predictions to stay near the base rate, and stakes to be low. That is correct behaviour, not a bug.
6. **Replay timing is synthetic** (TRD section 3.1). It does not affect the model, only when things appear.

## 9. Pipeline

```
model/src/download.py     fetch Cricsheet zips into model/data/raw (not committed)
model/src/parse.py        JSON → one row per ball; apply exclusions; write data_report.json
model/src/split.py        date split; assert the replay match is in test; write split.json
model/src/features.py     build the feature table
model/src/train.py        baselines + two models; pick on validation; write model.joblib
model/src/evaluate.py     test metrics, calibration chart, bootstrap intervals → metrics.json
model/src/stakes.py       stakes per ball; percentile table from train
model/src/thresholds.py   fit thresholds on train → data/thresholds.json
model/src/pulse_eval.py   section 7 → pulse_eval.json
model/src/export.py       write data/matches/<id>/timeline.json, alerts.json, players.json
```

One command runs all of it: `make model` (see RUNBOOK.md). A fixed random seed is set everywhere. `model/artifacts/*.json` and the calibration chart are committed; raw data and the model file are not.

## 10. Questions Pranay should be able to answer live

- Why split by date, not randomly?
- Why resample matches, not balls, for the confidence interval?
- What does a Brier score of 0.25 mean?
- Why is stakes "six versus wicket" and not the actual swing?
- Why are thresholds fitted on training data only?
- Why compare against random call-backs with the same count?
- Where does the model fail? (section 8)
