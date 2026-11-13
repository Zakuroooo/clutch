"""Date split by match: earliest 70% train, next 15% validation, latest 15% test.

A ball never appears in a different split from the rest of its match. Fails if the
replay match (data/replay.json) is not in the test split.
"""

from __future__ import annotations

import pandas as pd

from .common import ARTIFACTS, DATA, WORK, read_json, write_json


class ReplayNotInTest(AssertionError):
    pass


def make_split(matches: pd.DataFrame) -> dict:
    """matches needs match_id and date. Ties on date are broken by match id, so it is stable."""
    ordered = matches.sort_values(["date", "match_id"]).reset_index(drop=True)
    n = len(ordered)
    a, b = int(n * 0.70), int(n * 0.85)
    parts = {"train": ordered[:a], "validation": ordered[a:b], "test": ordered[b:]}
    return {
        name: {
            "match_ids": part["match_id"].tolist(),
            "matches": int(len(part)),
            "from": part["date"].min(),
            "to": part["date"].max(),
        }
        for name, part in parts.items()
    }


def assert_replay_in_test(split: dict, replay_id: str | None) -> None:
    if replay_id and replay_id not in set(split["test"]["match_ids"]):
        raise ReplayNotInTest(f"replay match {replay_id} is not in the test split")


def load_split() -> dict:
    return read_json(ARTIFACTS / "split.json")


def replay_id() -> str | None:
    path = DATA / "replay.json"
    return (read_json(path).get("match_id") or None) if path.exists() else None


def main() -> None:
    matches = pd.read_pickle(WORK / "matches.pkl")
    balls = pd.read_pickle(WORK / "balls.pkl")
    split = make_split(matches)
    assert_replay_in_test(split, replay_id())
    counts = balls.groupby("match_id").size()
    for part in split.values():
        part["balls"] = int(counts.loc[part["match_ids"]].sum())
    split["cutoffs"] = {
        "train_ends": split["train"]["to"],
        "validation_ends": split["validation"]["to"],
    }
    split["rule"] = "by match start date: 70% train, 15% validation, 15% test"
    write_json(ARTIFACTS / "split.json", split)
    for name in ("train", "validation", "test"):
        p = split[name]
        print(f"{name:11s} {p['matches']:5d} matches {p['balls']:8d} balls  {p['from']} to {p['to']}")


if __name__ == "__main__":
    main()
