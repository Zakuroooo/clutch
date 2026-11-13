"""TESTING.md F2 rows 1 and 2: the parser and the exclusions, on a hand-written file."""

import copy
import json
from pathlib import Path

import pytest

from src.parse import exclusion_reason, parse_match

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "two_overs.json").read_text())


@pytest.fixture
def parsed():
    return parse_match(FIXTURE, "fx1")


def test_one_row_per_delivery_including_extras(parsed):
    _, rows = parsed
    assert len(rows) == 7 + 7 + 6 + 1
    assert [r["innings"] for r in rows].count(1) == 14


def test_legal_ball_counts(parsed):
    _, rows = parsed
    first = [r for r in rows if r["innings"] == 1]
    assert sum(r["legal"] for r in first) == 12  # one wide and one no-ball are not legal
    assert [r["legal"] for r in first[:7]] == [1, 1, 0, 1, 1, 1, 1]
    # balls_left is the state BEFORE the ball: the wide does not use one up
    assert [r["balls_left"] for r in first[:7]] == [120, 119, 118, 118, 117, 116, 115]


def test_score_before_each_ball(parsed):
    _, rows = parsed
    first = [r for r in rows if r["innings"] == 1]
    assert [r["score"] for r in first] == [0, 1, 5, 6, 6, 6, 12, 14, 15, 17, 17, 17, 18, 20]
    assert first[-1]["score"] + first[-1]["runs_total"] == 20


def test_wickets_and_retired_hurt(parsed):
    _, rows = parsed
    first = [r for r in rows if r["innings"] == 1]
    assert [r["wickets_fell"] for r in first] == [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1]
    assert first[5]["wickets_left"] == 9
    assert first[11]["wickets_left"] == 9  # retired hurt is not a wicket
    assert first[4]["wicket"] == {"kind": "bowled", "player_out": "B Two", "fielders": []}
    assert first[-1]["wicket"]["fielders"] == ["Y Zed"]


def test_chase_target_and_label(parsed):
    match, rows = parsed
    chase = [r for r in rows if r["innings"] == 2]
    assert {r["target"] for r in chase} == {21}
    assert all(r["target"] == 0 for r in rows if r["innings"] == 1)
    assert match["batting_order"] == ["Reds", "Blues"]
    assert match["label"] == 0  # the team batting first lost
    assert match["date"] == "2026-01-01"


def test_extras_kind(parsed):
    _, rows = parsed
    assert rows[2]["extras_kind"] == "wides"
    assert rows[8]["extras_kind"] == "noballs"
    assert rows[11]["extras_kind"] == "legbyes"
    assert rows[0]["extras_kind"] is None


def test_good_match_is_kept():
    assert exclusion_reason(FIXTURE) is None


@pytest.mark.parametrize(
    "change, reason",
    [
        (lambda d: d["info"]["outcome"].update(method="D/L"), "rain_rule_method"),
        (lambda d: d["info"].update(outcome={"result": "tie"}), "tie_or_no_result"),
        (lambda d: d["info"].update(outcome={"result": "no result"}), "tie_or_no_result"),
        (lambda d: d["info"].update(outcome={"result": "tie", "eliminator": "Reds"}), "super_over_or_bowl_out"),
        (lambda d: d["innings"].append({"team": "Reds", "super_over": True, "overs": []}), "super_over_or_bowl_out"),
        (lambda d: d["innings"][1]["target"].update(overs=12), "shortened_target"),
        (lambda d: d["innings"].pop(), "missing_innings"),
        (lambda d: d["info"].update(overs=10), "overs_not_20"),
        (lambda d: d["info"].update(gender="female"), "not_male"),
        (lambda d: d["info"].update(match_type="ODI"), "not_t20"),
    ],
)
def test_exclusions(change, reason):
    d = copy.deepcopy(FIXTURE)
    change(d)
    assert exclusion_reason(d) == reason
