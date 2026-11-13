"""Choose every threshold on TRAINING matches only, then freeze them in data/thresholds.json.

Targets are product choices (docs/MODEL.md section 6.5): a median of about 4, 12 and 25
call-backs per training match for the three Focus bars, and about 15 moments.
"""

from __future__ import annotations

import datetime as dt

import numpy as np
import pandas as pd

from .alerts import count_at_bar, walk
from .common import BALLS_PER_INNINGS, DATA, WORK, write_json
from .split import load_split

TARGETS = {"decider": 4, "big": 12, "notable": 25}
COOLDOWN_BALLS = 6  # one over. Fixed, not tuned.
MOMENT_TARGET = 15
FIXED_MOMENTS = 2  # the end of innings 1 and the result are always moments
GRID = [round(50 + 0.1 * k, 1) for k in range(0, 500)]  # 50.0 .. 99.9


def per_match(scored: pd.DataFrame) -> list[tuple[list, list, list]]:
    out = []
    for _, m in scored.sort_values(["match_id", "seq"]).groupby("match_id", sort=False):
        out.append(
            (
                m["innings"].tolist(),
                (BALLS_PER_INNINGS - m["balls_left"]).tolist(),
                m["stakes_pct"].tolist(),
            )
        )
    return out


def median_callbacks(matches, cutoffs: dict[str, float], bar: str) -> float:
    counts = [count_at_bar(walk(i, lb, p, cutoffs, COOLDOWN_BALLS), bar) for i, lb, p in matches]
    return float(np.median(counts))


def fit_bar(matches, bar: str, fixed: dict[str, float]) -> tuple[float, float]:
    """The cut-off whose median call-backs per match is closest to the target.
    The count falls as the cut-off rises, so a binary search over the grid finds the edge."""
    target = TARGETS[bar]
    top = min(fixed.values()) if fixed else 100.0
    grid = [c for c in GRID if c <= top]
    cache: dict[float, float] = {}

    def med(c: float) -> float:
        if c not in cache:
            cache[c] = median_callbacks(matches, {**fixed, bar: c}, bar)
        return cache[c]

    lo, hi = 0, len(grid) - 1
    while lo < hi:  # smallest index with med <= target
        mid = (lo + hi) // 2
        if med(grid[mid]) <= target:
            hi = mid
        else:
            lo = mid + 1
    candidates = [grid[k] for k in (lo - 1, lo) if 0 <= k < len(grid)]
    best = min(candidates, key=lambda c: (abs(med(c) - target), -c))
    return best, med(best)


def fit_min_swing(scored: pd.DataFrame) -> tuple[float, float]:
    """The single-ball swing that gives a median of about 15 moments per match, counting
    the two fixed moments (innings end, result)."""
    k = MOMENT_TARGET - FIXED_MOMENTS
    swing = (scored["wp_after"] - scored["wp_before"]).abs()
    kth = swing.groupby(scored["match_id"]).apply(lambda s: s.nlargest(k).min() if len(s) >= k else 0.0)
    value = round(float(kth.median()), 4)
    counts = (swing >= value).groupby(scored["match_id"]).sum() + FIXED_MOMENTS
    return value, float(counts.median())


def fit_thresholds(scored: pd.DataFrame, train_ids: list[str]) -> dict:
    """Only rows of train_ids are used, whatever else is in `scored`."""
    train = scored[scored["match_id"].isin(set(train_ids))]
    matches = per_match(train)
    cutoffs: dict[str, float] = {}
    achieved: dict[str, float] = {}
    for bar in ("decider", "big", "notable"):
        cutoffs[bar], achieved[bar] = fit_bar(matches, bar, dict(cutoffs))
    min_swing, moments = fit_min_swing(train)
    return {
        "fitted_on": "train",
        "fitted_at": dt.date.today().isoformat(),
        "train_matches": int(train["match_id"].nunique()),
        "pulse": {
            "building": round((50 + cutoffs["big"]) / 2, 1),
            "high": cutoffs["big"],
            "decider": cutoffs["decider"],
        },
        "alert": {
            "notable": cutoffs["notable"],
            "big": cutoffs["big"],
            "decider": cutoffs["decider"],
            "cooldown_balls": COOLDOWN_BALLS,
        },
        "moment": {"min_swing": min_swing},
        "fit": {
            "targets_median_per_match": {**TARGETS, "moments": MOMENT_TARGET},
            "achieved_median_on_train": {**achieved, "moments": moments},
        },
    }


def main() -> None:
    scored = pd.read_pickle(WORK / "scored.pkl")
    thresholds = fit_thresholds(scored, load_split()["train"]["match_ids"])
    write_json(DATA / "thresholds.json", thresholds)
    print(thresholds)


if __name__ == "__main__":
    main()
