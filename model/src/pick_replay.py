"""List test-split matches ranked by how much the win chance swung, so Pranay can pick
the replay match. Writes model/artifacts/replay_candidates.json and prints the top ones.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .alerts import BARS, count_at_bar, walk
from .common import ARTIFACTS, BALLS_PER_INNINGS, DATA, WORK, read_json, write_json
from .split import load_split

TOP = 25


def describe(m: pd.DataFrame, thresholds: dict) -> dict:
    swing = (m["wp_after"] - m["wp_before"]).to_numpy()
    wp = m["wp_after"].to_numpy()
    side = np.sign(wp - 0.5)
    side = side[side != 0]
    fired = walk(
        m["innings"].tolist(),
        (BALLS_PER_INNINGS - m["balls_left"]).tolist(),
        m["stakes_pct"].tolist(),
        {b: thresholds["alert"][b] for b in BARS},
        thresholds["alert"]["cooldown_balls"],
    )
    chase = m[m["innings"] == 2]
    last_over = chase[chase["balls_left"] <= 6]
    return {
        "total_swing": round(float(np.abs(swing).sum()), 2),
        "late_swing": round(float(np.abs(swing[-30:]).sum()), 2),
        "biggest_single_swing": round(float(np.abs(swing).max()), 3),
        "lead_changes": int((side[1:] != side[:-1]).sum()),
        "went_to_last_over": bool(len(last_over) > 0),
        "moments_over_min_swing": int((np.abs(swing) >= thresholds["moment"]["min_swing"]).sum()),
        "callbacks": {b: count_at_bar(fired, b) for b in BARS},
    }


def main() -> None:
    scored = pd.read_pickle(WORK / "scored.pkl")
    matches = pd.read_pickle(WORK / "matches.pkl").set_index("match_id")
    thresholds = read_json(DATA / "thresholds.json")
    test_ids = set(load_split()["test"]["match_ids"])
    test = scored[scored["match_id"].isin(test_ids)].sort_values(["match_id", "seq"])
    rows = []
    for mid, m in test.groupby("match_id", sort=True):
        info = matches.loc[mid]
        by = info["by"] or {}
        margin = " ".join(f"{v} {k}" for k, v in by.items())
        rows.append(
            {
                "match_id": mid,
                "date": info["date"],
                "teams": f"{info['batting_order'][0]} v {info['batting_order'][1]}",
                "event": info["event"],
                "stage": info["stage"],
                "result": f"{info['winner']} won by {margin}",
                **describe(m, thresholds),
            }
        )
    # Drama: a match that kept moving, moved late, and changed hands.
    for r in rows:
        r["rank_score"] = round(r["late_swing"] + 0.5 * r["total_swing"] + 0.3 * r["lead_changes"], 2)
    rows.sort(key=lambda r: -r["rank_score"])
    write_json(ARTIFACTS / "replay_candidates.json", {"split": "test", "ranked_by": "late_swing + 0.5 * total_swing + 0.3 * lead_changes", "candidates": rows[:100]})
    for k, r in enumerate(rows[:TOP], start=1):
        print(
            f"{k:2d}. {r['match_id']:8s} {r['date']}  {r['teams']:44s} {str(r['event'])[:34]:34s} "
            f"{r['result'][:38]:38s} swing {r['total_swing']:5.2f} late {r['late_swing']:4.2f} "
            f"flips {r['lead_changes']:2d} cb {r['callbacks']}"
        )


if __name__ == "__main__":
    main()
