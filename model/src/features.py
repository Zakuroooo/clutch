"""Features (docs/MODEL.md section 3) and the one function every later step uses to ask
the model for a win chance: win_prob().

A "state" is five numbers: innings, balls_left, wickets_left, score, target. Everything
else is derived from them, so no feature can see the future or identify a team or player.
"""

from __future__ import annotations

import numpy as np

from .common import BALLS_PER_INNINGS, RRR_CAP  # noqa: F401

# The current run rate is deliberately not a feature: early in an innings it is runs
# divided by almost nothing, and one six on ball one swung the win chance wildly.
# Score and balls left carry the same information without the blow-up.
FEATURES = ["innings", "balls_left", "wickets_left", "score", "target", "needed", "rrr"]
INNINGS1_FEATURES = ["balls_left", "wickets_left", "score"]
INNINGS2_FEATURES = ["balls_left", "wickets_left", "score", "target", "needed", "rrr"]


def build_features(innings, balls_left, wickets_left, score, target) -> np.ndarray:
    """State arrays -> feature matrix with columns in FEATURES order."""
    innings = np.asarray(innings, dtype=float)
    balls_left = np.asarray(balls_left, dtype=float)
    wickets_left = np.asarray(wickets_left, dtype=float)
    score = np.asarray(score, dtype=float)
    target = np.asarray(target, dtype=float)

    chase = innings == 2
    target = np.where(chase, target, 0.0)
    needed = np.where(chase, target - score, 0.0)
    rrr = np.divide(needed * 6.0, balls_left, out=np.full_like(score, RRR_CAP), where=balls_left > 0)
    rrr = np.where(chase, np.clip(rrr, 0.0, RRR_CAP), 0.0)
    return np.column_stack([innings, balls_left, wickets_left, score, target, needed, rrr])


def win_prob(model, innings, balls_left, wickets_left, score, target) -> np.ndarray:
    """Chance that the team batting FIRST wins, from any state.

    States where the rules already decide the answer do not go to the model:
    - chase: target reached -> 0; out of balls or wickets -> 1 (0.5 if scores are level)
    - innings 1 over (out of balls or wickets) -> the model's view of the chase's first ball
    """
    innings = np.asarray(innings, dtype=float).copy()
    balls_left = np.asarray(balls_left, dtype=float).copy()
    wickets_left = np.asarray(wickets_left, dtype=float).copy()
    score = np.asarray(score, dtype=float).copy()
    target = np.asarray(target, dtype=float).copy()

    over1 = (innings == 1) & ((balls_left <= 0) | (wickets_left <= 0))
    target[over1] = score[over1] + 1
    innings[over1] = 2
    balls_left[over1] = BALLS_PER_INNINGS
    wickets_left[over1] = 10
    score[over1] = 0

    chase = innings == 2
    needed = target - score
    won = chase & (needed <= 0)
    done = chase & ~won & ((balls_left <= 0) | (wickets_left <= 0))

    out = np.empty(len(innings), dtype=float)
    live = ~(won | done)
    if live.any():
        X = build_features(innings[live], balls_left[live], wickets_left[live], score[live], target[live])
        out[live] = model.predict(X)
    out[won] = 0.0
    out[done] = np.where(needed[done] == 1, 0.5, 1.0)
    return out


def after_state(df):
    """The state after each ball in a frame of ball rows (before-state + what happened)."""
    return (
        df["innings"].to_numpy(),
        (df["balls_left"] - df["legal"]).to_numpy(),
        (df["wickets_left"] - df["wickets_fell"]).to_numpy(),
        (df["score"] + df["runs_total"]).to_numpy(),
        df["target"].to_numpy(),
    )


def before_state(df):
    return (
        df["innings"].to_numpy(),
        df["balls_left"].to_numpy(),
        df["wickets_left"].to_numpy(),
        df["score"].to_numpy(),
        df["target"].to_numpy(),
    )
