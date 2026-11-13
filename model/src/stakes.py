"""Win chance before and after every ball, and the stakes of every ball.

stakes.raw = | WP(after a six) - WP(after a wicket and no run) |, both using one ball.
It uses only the state before the ball, never what actually happened.
stakes.pct = percentile of stakes.raw among all balls in TRAINING matches.
"""

from __future__ import annotations

import joblib
import numpy as np
import pandas as pd

from .common import ARTIFACTS, WORK, read_json, write_json
from .features import after_state, before_state, win_prob
from .split import load_split

LEVELS = np.round(np.arange(0, 100.01, 0.1), 1)  # percentile levels 0.0, 0.1, ... 100.0


def load_model():
    bundle = joblib.load(ARTIFACTS / "model.joblib")
    return bundle["models"][bundle["shipped"]]


def stakes_raw(model, innings, balls_left, wickets_left, score, target) -> np.ndarray:
    innings = np.asarray(innings)
    balls_left = np.asarray(balls_left)
    wickets_left = np.asarray(wickets_left)
    score = np.asarray(score)
    best = win_prob(model, innings, balls_left - 1, wickets_left, score + 6, target)
    worst = win_prob(model, innings, balls_left - 1, wickets_left - 1, score, target)
    return np.abs(best - worst)


def to_pct(raw, table: list[float]) -> np.ndarray:
    """Percentile of raw in the training table, to one decimal: the highest level whose
    training value is at or below raw."""
    pos = np.searchsorted(np.asarray(table), np.asarray(raw), side="right") - 1
    return LEVELS[np.clip(pos, 0, len(LEVELS) - 1)]


def score_balls(model, df: pd.DataFrame) -> pd.DataFrame:
    """Add wp_before, wp_after and stakes_raw to a frame of ball rows."""
    out = df.copy()
    out["wp_before"] = win_prob(model, *before_state(df))
    out["wp_after"] = win_prob(model, *after_state(df))
    out["stakes_raw"] = stakes_raw(model, *before_state(df))
    return out


def load_percentiles() -> list[float]:
    return read_json(ARTIFACTS / "stakes_percentiles.json")["values"]


def main() -> None:
    balls = pd.read_pickle(WORK / "balls.pkl")
    model = load_model()
    scored = score_balls(model, balls)
    # The last ball of a match ends on the real result, whatever the model thought.
    last = scored.groupby("match_id")["seq"].transform("max") == scored["seq"]
    scored.loc[last, "wp_after"] = scored.loc[last, "label"].astype(float)

    train_ids = set(load_split()["train"]["match_ids"])
    train_raw = scored.loc[scored["match_id"].isin(train_ids), "stakes_raw"].to_numpy()
    table = [round(float(v), 6) for v in np.percentile(train_raw, LEVELS)]
    write_json(
        ARTIFACTS / "stakes_percentiles.json",
        {
            "fitted_on": "train",
            "train_balls": int(len(train_raw)),
            "levels": "0.0 to 100.0 in steps of 0.1",
            "values": table,
        },
    )
    scored["stakes_pct"] = to_pct(scored["stakes_raw"].to_numpy(), table)
    scored.to_pickle(WORK / "scored.pkl")
    q = {k: table[int(k * 10)] for k in (50, 75, 90, 95, 99)}
    print("stakes.raw at training percentiles:", q)


if __name__ == "__main__":
    main()
