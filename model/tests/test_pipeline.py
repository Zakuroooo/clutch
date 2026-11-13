"""TESTING.md F2 rows 3 to 8, plus the replay timeline gaps (F1 row 7) and the call-back rule.

These run on fixtures only: no download, no trained model. The two checks that need the
real trained model are in test_trained_model.py and skip when it has not been built.
"""

import copy
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from src.alerts import count_at_bar, walk
from src.export import GAP_BALL, GAP_INNINGS, GAP_OVER_EXTRA, GAP_WICKET_EXTRA, build_alerts, build_timeline, build_times
from src.features import before_state, build_features, win_prob
from src.parse import parse_match
from src.split import ReplayNotInTest, assert_replay_in_test, make_split
from src.stakes import LEVELS, stakes_raw, to_pct
from src.thresholds import fit_thresholds

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "two_overs.json").read_text())


class HalfModel:
    """A stand-in model that knows nothing: always 0.5."""

    def predict(self, X):
        return np.full(len(X), 0.5)


# ---- split -------------------------------------------------------------------------------


def some_matches(n=40):
    dates = pd.date_range("2020-01-01", periods=n, freq="7D").strftime("%Y-%m-%d")
    return pd.DataFrame({"match_id": [f"m{k:02d}" for k in range(n)], "date": dates}).sample(frac=1, random_state=1)


def test_split_has_no_match_in_two_parts_and_dates_are_ordered():
    split = make_split(some_matches())
    ids = [set(split[p]["match_ids"]) for p in ("train", "validation", "test")]
    assert not (ids[0] & ids[1]) and not (ids[1] & ids[2]) and not (ids[0] & ids[2])
    assert sum(len(s) for s in ids) == 40
    assert [len(s) for s in ids] == [28, 6, 6]
    assert split["train"]["to"] <= split["validation"]["from"]
    assert split["validation"]["to"] <= split["test"]["from"]


def test_split_fails_when_the_replay_match_is_not_in_test():
    split = make_split(some_matches())
    assert_replay_in_test(split, split["test"]["match_ids"][0])
    assert_replay_in_test(split, None)
    with pytest.raises(ReplayNotInTest):
        assert_replay_in_test(split, split["train"]["match_ids"][0])


# ---- features ----------------------------------------------------------------------------


def test_no_feature_changes_when_future_balls_are_altered():
    _, rows = parse_match(FIXTURE, "fx1")
    changed = copy.deepcopy(FIXTURE)
    for dl in changed["innings"][0]["overs"][1]["deliveries"]:  # rewrite the second over
        dl["runs"] = {"batter": 6, "extras": 0, "total": 6}
        dl.pop("extras", None)
        dl["wickets"] = [{"kind": "bowled", "player_out": dl["batter"]}]
    _, rows2 = parse_match(changed, "fx1")
    k = 8  # every ball of over one, and the first ball of over two (state before it)
    a = build_features(*before_state(pd.DataFrame(rows[:k])))
    b = build_features(*before_state(pd.DataFrame(rows2[:k])))
    assert np.array_equal(a, b)


def test_chase_features():
    X = build_features([2], [60], [7], [100], [161])
    innings, balls_left, wickets_left, score, target, needed, rrr = X[0]
    assert (needed, rrr) == (61, pytest.approx(6.1))
    first = build_features([1], [60], [7], [100], [999])[0]
    assert tuple(first[4:]) == (0, 0, 0)  # no chase numbers in innings 1


# ---- win chance at decided states, and stakes ---------------------------------------------


def test_decided_states_do_not_go_to_the_model():
    m = HalfModel()
    assert win_prob(m, [2], [10], [5], [150], [150])[0] == 0.0  # target reached: bat-first lost
    assert win_prob(m, [2], [0], [5], [140], [150])[0] == 1.0  # out of balls, short
    assert win_prob(m, [2], [10], [0], [140], [150])[0] == 1.0  # all out, short
    assert win_prob(m, [2], [0], [5], [149], [150])[0] == 0.5  # scores level
    assert win_prob(m, [2], [10], [5], [140], [150])[0] == 0.5  # still live: the model answers


def test_stakes_are_zero_when_the_result_is_certain():
    m = HalfModel()
    # 50 needed from the last ball: a six and a wicket both lose the chase
    assert stakes_raw(m, [2], [1], [5], [100], [150])[0] == 0.0
    # 2 needed, last ball, last wicket: a six wins it, a wicket loses it
    assert stakes_raw(m, [2], [1], [1], [148], [150])[0] == 1.0


def test_percentile_lookup():
    table = np.linspace(0, 1, len(LEVELS)).tolist()
    assert to_pct([0.0], table)[0] == 0.0
    assert to_pct([0.5], table)[0] == 50.0
    assert to_pct([2.0], table)[0] == 100.0


# ---- call-backs ----------------------------------------------------------------------------

CUT = {"notable": 50, "big": 70, "decider": 90}


def test_callbacks_respect_the_cooldown_and_escalate():
    innings = [1] * 14
    legal_before = list(range(14))
    pct = [10, 75, 75, 95, 95, 75, 10, 75, 10, 10, 95, 10, 10, 10]
    fired = walk(innings, legal_before, pct, CUT, cooldown=6)
    # ball 1: big. ball 2: big again, inside the cooldown. ball 3: decider escalates.
    # ball 5 and 7: big, but a decider fired within 6 balls. ball 10: 7 balls after the decider.
    assert fired == [(1, 1), (3, 2), (10, 2)]
    assert count_at_bar(fired, "decider") == 2
    assert count_at_bar(fired, "big") == 3
    assert count_at_bar(fired, "notable") == 3


def test_cooldown_resets_at_the_innings_change():
    fired = walk([1, 2], [119, 0], [95, 95], CUT, cooldown=6)
    assert [i for i, _ in fired] == [0, 1]


# ---- thresholds -----------------------------------------------------------------------------


def fake_scored(ids, seed, scale=1.0):
    rng = np.random.default_rng(seed)
    frames = []
    for mid in ids:
        n = 240
        frames.append(
            pd.DataFrame(
                {
                    "match_id": mid,
                    "seq": range(n),
                    "innings": [1] * 120 + [2] * 120,
                    "balls_left": list(range(120, 0, -1)) * 2,
                    "stakes_pct": np.round(rng.uniform(0, 100, n) * scale, 1),
                    "wp_before": 0.5,
                    "wp_after": 0.5 + rng.normal(0, 0.03, n) * scale,
                }
            )
        )
    return pd.concat(frames, ignore_index=True)


def test_thresholds_use_training_matches_only():
    train_ids = [f"t{k}" for k in range(12)]
    train = fake_scored(train_ids, seed=1)
    other = fake_scored([f"x{k}" for k in range(12)], seed=2, scale=0.1)  # very different matches
    alone = fit_thresholds(train, train_ids)
    mixed = fit_thresholds(pd.concat([train, other], ignore_index=True), train_ids)
    assert alone["fitted_on"] == "train"
    assert alone["train_matches"] == 12
    for key in ("pulse", "alert", "moment"):
        assert alone[key] == mixed[key]
    assert alone["alert"]["decider"] >= alone["alert"]["big"] >= alone["alert"]["notable"] > 0
    assert alone["pulse"]["high"] == alone["alert"]["big"]
    assert alone["moment"]["min_swing"] > 0


# ---- replay timeline -------------------------------------------------------------------------


def test_timeline_gaps_follow_the_table():
    _, rows = parse_match(FIXTURE, "fx1")
    t = build_times(rows)
    assert t[0] == 0
    assert t[1] - t[0] == GAP_BALL  # any ball
    assert t[5] - t[4] == GAP_BALL + GAP_WICKET_EXTRA  # after a wicket
    assert t[7] - t[6] == GAP_BALL + GAP_OVER_EXTRA  # after the last ball of an over
    assert t[14] - t[13] == GAP_INNINGS  # after innings 1
    assert t[17] - t[16] == GAP_BALL + GAP_WICKET_EXTRA
    assert all(b > a for a, b in zip(t, t[1:]))


def test_exported_timeline_shape_and_running_totals():
    table = np.linspace(0, 1, len(LEVELS)).tolist()
    timeline, scored = build_timeline(FIXTURE, "fx1", HalfModel(), table, teams={})
    events = timeline["events"]
    assert [e["i"] for e in events] == list(range(21))
    assert timeline["match"]["batting_order"] == ["RED", "BLU"]
    assert timeline["match"]["result"] == {"winner": "BLU", "by": {"wickets": 9}}
    wide = events[2]
    assert wide["event"]["legal"] is False and wide["event"]["ball"] == 3
    assert events[3]["event"]["ball"] == 3  # the re-bowled ball has the same number
    assert wide["state"] == {
        "batting": "RED", "score": 6, "wickets": 0, "balls_bowled": 2, "balls_left": 118,
        "target": None, "needed": None, "crr": 18.0, "rrr": None,
    }  # fmt: skip
    last = events[-1]
    assert last["state"]["needed"] == 0 and last["state"]["score"] == 21
    assert last["wp"]["after"] == 0.0  # ends on the real result: the team batting first lost
    assert events[13]["state"]["score"] == 20 and events[13]["state"]["wickets"] == 2
    assert events[14]["state"]["target"] == 21 and events[14]["state"]["needed"] == 15
    for e in events:
        assert 0 <= e["wp"]["before"] <= 1 and 0 <= e["stakes"]["pct"] <= 100
    alerts = build_alerts(scored, {"alert": {"notable": 50, "big": 70, "decider": 90, "cooldown_balls": 6}})
    assert all(a["bar"] in ("notable", "big", "decider") and a["line"] for a in alerts)
