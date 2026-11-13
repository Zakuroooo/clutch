"""Does the Pulse call a fan back before the biggest swings? (docs/MODEL.md section 7)

On test matches only. For each match: take the 10 balls with the largest actual change
in win chance; a swing is "caught" at a bar if a call-back at that bar or higher fired in
the 6 legal balls up to and including it. Compared with three other strategies.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .alerts import BARS, walk
from .common import ARTIFACTS, BALLS_PER_INNINGS, DATA, SEED, WORK, read_json, write_json
from .split import load_split, replay_id

TOP_K = 10
WINDOW = 6
RANDOM_DRAWS = 20
BAR_NAMES = {"decider": "The decider", "big": "Big moments", "notable": "Everything"}


def coverage(alert_idx, swings, innings, legal_before) -> float:
    """Share of the swing balls that had a call-back in the window before them."""
    if len(swings) == 0:
        return 0.0
    caught = 0
    for i in swings:
        for j in alert_idx:
            if j <= i and innings[j] == innings[i] and legal_before[i] - legal_before[j] < WINDOW:
                caught += 1
                break
    return caught / len(swings)


def last_overs_alerts(innings, over, n: int) -> list[int]:
    """One call-back at the first ball of each of the final n overs of the match."""
    starts = [i for i in range(len(over)) if i == 0 or over[i] != over[i - 1] or innings[i] != innings[i - 1]]
    return starts[-n:] if n > 0 else []


def after_wicket_alerts(innings, wickets_fell) -> list[int]:
    """Reactive: a call-back on the ball after each wicket."""
    return [
        i + 1
        for i in range(len(innings) - 1)
        if wickets_fell[i] > 0 and innings[i + 1] == innings[i]
    ]


def eval_match(m: pd.DataFrame, thresholds: dict, rng) -> dict:
    innings = m["innings"].tolist()
    legal_before = (BALLS_PER_INNINGS - m["balls_left"]).tolist()
    over = m["over"].tolist()
    swing = (m["wp_after"] - m["wp_before"]).abs().to_numpy()
    top = np.argsort(-swing, kind="stable")[:TOP_K].tolist()
    cutoffs = {b: thresholds["alert"][b] for b in BARS}
    fired = walk(innings, legal_before, m["stakes_pct"].tolist(), cutoffs, thresholds["alert"]["cooldown_balls"])
    wicket_alerts = after_wicket_alerts(innings, m["wickets_fell"].tolist())
    out = {
        "after_wickets": {
            "callbacks": len(wicket_alerts),
            "coverage": coverage(wicket_alerts, top, innings, legal_before),
        }
    }
    for k, bar in enumerate(BARS):
        mine = [i for i, level in fired if level >= k]
        n = len(mine)
        random_cov = np.mean(
            [
                coverage(sorted(rng.choice(len(innings), size=n, replace=False).tolist()), top, innings, legal_before)
                for _ in range(RANDOM_DRAWS)
            ]
        )
        out[bar] = {
            "callbacks": n,
            "coverage": coverage(mine, top, innings, legal_before),
            "random": float(random_cov),
            "last_overs": coverage(last_overs_alerts(innings, over, n), top, innings, legal_before),
        }
    return out


def summarise(rows: list[dict]) -> dict:
    out = {}
    for bar in BARS:
        n = np.array([r[bar]["callbacks"] for r in rows])
        out[bar] = {
            "name": BAR_NAMES[bar],
            "callbacks_median": float(np.median(n)),
            "callbacks_p10": float(np.percentile(n, 10)),
            "callbacks_p90": float(np.percentile(n, 90)),
            "coverage": round(float(np.mean([r[bar]["coverage"] for r in rows])), 3),
            "random_same_count": round(float(np.mean([r[bar]["random"] for r in rows])), 3),
            "last_overs_same_count": round(float(np.mean([r[bar]["last_overs"] for r in rows])), 3),
        }
    aw = [r["after_wickets"] for r in rows]
    out["after_wickets"] = {
        "callbacks_median": float(np.median([a["callbacks"] for a in aw])),
        "coverage": round(float(np.mean([a["coverage"] for a in aw])), 3),
        "note": "reactive: its count is not matched to a bar",
    }
    return out


def main() -> None:
    scored = pd.read_pickle(WORK / "scored.pkl")
    thresholds = read_json(DATA / "thresholds.json")
    test_ids = load_split()["test"]["match_ids"]
    test = scored[scored["match_id"].isin(set(test_ids))].sort_values(["match_id", "seq"])
    rng = np.random.default_rng(SEED)
    per = {mid: eval_match(m, thresholds, rng) for mid, m in test.groupby("match_id", sort=True)}
    result = {
        "split": "test",
        "test_matches": len(per),
        "definition": {
            "biggest_swings": f"the {TOP_K} balls per match with the largest |wp.after - wp.before|",
            "caught": f"a call-back at that bar or higher in the {WINDOW} legal balls up to and including the ball",
            "random": f"same number of call-backs at random balls, mean of {RANDOM_DRAWS} draws",
            "last_overs": "same number of call-backs, one at the start of each of the final overs",
            "after_wickets": "a call-back on the ball after each wicket",
        },
        "thresholds": thresholds["alert"],
        "bars": summarise(list(per.values())),
    }
    rid = replay_id()
    if rid and rid in per:
        result["replay_match"] = {"match_id": rid, **per[rid]}
    write_json(ARTIFACTS / "pulse_eval.json", result)
    for bar in BARS:
        print(bar, result["bars"][bar])
    print("after_wickets", result["bars"]["after_wickets"])


if __name__ == "__main__":
    main()
