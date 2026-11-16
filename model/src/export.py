"""Write the replay match's files: data/matches/<id>/timeline.json, alerts.json, players.json.

Shapes are in docs/TRD.md section 2 and docs/CARDS.md section 7.1. Every number here is
computed; nothing is typed by hand except team colours (data/teams.json) and jersey
numbers (data/jerseys.json).
"""

from __future__ import annotations

import json
from collections import defaultdict

import pandas as pd

from .alerts import BARS, LINES, walk
from .common import BALLS_PER_INNINGS, DATA, RAW, RRR_CAP, read_json, write_json
from .parse import NOT_A_WICKET, exclusion_reason, is_legal, parse_match
from .split import assert_replay_in_test, load_split
from .stakes import load_model, load_percentiles, score_balls, to_pct

# Replay clock gaps, in ms (docs/TRD.md section 3.1). A design choice, not real timing.
GAP_BALL = 30_000
GAP_OVER_EXTRA = 45_000
GAP_WICKET_EXTRA = 60_000
GAP_INNINGS = 120_000

MIN_INNINGS = 10  # below this an average or rate is null
MIN_DEATH_BALLS = 60
NOT_BOWLERS_WICKET = {"run out", "retired out", "obstructing the field", "timed out", "handled the ball"}


def build_times(rows: list[dict]) -> list[int]:
    """t_ms for each ball: the previous t_ms plus the gap that follows the previous ball."""
    times = [0]
    for prev, cur in zip(rows, rows[1:]):
        if cur["innings"] != prev["innings"]:
            gap = GAP_INNINGS
        else:
            gap = GAP_BALL
            if cur["over"] != prev["over"]:
                gap += GAP_OVER_EXTRA
            if prev["wickets_fell"] > 0:
                gap += GAP_WICKET_EXTRA
        times.append(times[-1] + gap)
    return times


def team_meta(name: str, teams: dict, slot: int) -> dict:
    known = teams.get(name)
    if known:
        return {"code": known["code"], "name": name, "colors": known["colors"]}
    words = name.split()
    code = "".join(w[0] for w in words).upper() if len(words) > 1 else name[:3].upper()
    fallback = [["#2f6fe0", "#1b3f9c"], ["#1f9d55", "#0d5c30"]][slot]
    return {"code": code, "name": name, "colors": fallback}


def build_timeline(d: dict, match_id: str, model, table: list[float], teams: dict) -> tuple[dict, pd.DataFrame]:
    match, rows = parse_match(d, match_id)
    df = pd.DataFrame(rows)
    scored = score_balls(model, df)
    scored.loc[scored.index[-1], "wp_after"] = float(match["label"])
    scored["stakes_pct"] = to_pct(scored["stakes_raw"].to_numpy(), table)
    times = build_times(rows)
    sync_file = DATA / "matches" / match_id / "video_sync.json"
    if sync_file.exists():
        # With a match video, a ball's time is its time in the video (TRD section 3.6),
        # moved earlier by the scoreboard's measured delay so the call-back still comes first.
        sync = read_json(sync_file)
        if len(sync["ball_times"]) == len(rows):
            lag = sync.get("scoreboard_lag_s", 0)
            times = [round((t - lag) * 1000) for t in sync["ball_times"]]
    order = match["batting_order"]
    metas = [team_meta(name, teams, k) for k, name in enumerate(order)]
    code = {m["name"]: m["code"] for m in metas}

    events = []
    legal_in_over = 0
    for i, (r, s) in enumerate(zip(rows, scored.itertuples())):
        if i == 0 or r["over"] != rows[i - 1]["over"] or r["innings"] != rows[i - 1]["innings"]:
            legal_in_over = 0
        ball_no = legal_in_over + 1
        legal_in_over += r["legal"]
        score = r["score"] + r["runs_total"]
        wickets = 10 - r["wickets_left"] + r["wickets_fell"]
        bowled = BALLS_PER_INNINGS - r["balls_left"] + r["legal"]
        left = BALLS_PER_INNINGS - bowled
        chase = r["innings"] == 2
        needed = max(r["target"] - score, 0) if chase else None
        events.append(
            {
                "i": i,
                "t_ms": times[i],
                "event": {
                    "innings": r["innings"],
                    "over": r["over"],
                    "ball": ball_no,
                    "legal": bool(r["legal"]),
                    "batter": r["batter"],
                    "bowler": r["bowler"],
                    "non_striker": r["non_striker"],
                    "runs": {"bat": r["runs_bat"], "extras": r["runs_extras"], "total": r["runs_total"]},
                    "extras_kind": r["extras_kind"],
                    "wicket": r["wicket"],
                },
                "state": {
                    "batting": code[r["batting"]],
                    "score": score,
                    "wickets": wickets,
                    "balls_bowled": bowled,
                    "balls_left": left,
                    "target": r["target"] if chase else None,
                    "needed": needed,
                    "crr": round(score * 6 / bowled, 2) if bowled else 0.0,
                    "rrr": (round(min(needed * 6 / left, RRR_CAP), 2) if left else None) if chase else None,
                },
                "wp": {
                    "team": code[order[0]],
                    "before": round(float(s.wp_before), 4),
                    "after": round(float(s.wp_after), 4),
                },
                "stakes": {"raw": round(float(s.stakes_raw), 4), "pct": float(s.stakes_pct)},
            }
        )
    info = d["info"]
    timeline = {
        "match": {
            "id": match_id,
            "sport": "cricket",
            "format": "T20",
            "date": match["date"],
            "venue": match["venue"],
            "city": match["city"],
            "event": {"name": match["event"], "stage": match["stage"]},
            "teams": metas,
            "batting_order": [code[n] for n in order],
            "result": {"winner": code[match["winner"]], "by": match["by"]},
            "squads": {code[t]: info.get("players", {}).get(t, []) for t in order},
            "source": "Cricsheet",
            "licence": "ODC-By 1.0",
        },
        "events": events,
    }
    return timeline, scored


def build_alerts(scored: pd.DataFrame, thresholds: dict) -> list[dict]:
    fired = walk(
        scored["innings"].tolist(),
        (BALLS_PER_INNINGS - scored["balls_left"]).tolist(),
        scored["stakes_pct"].tolist(),
        {b: thresholds["alert"][b] for b in BARS},
        thresholds["alert"]["cooldown_balls"],
    )
    return [{"i": i, "bar": BARS[level], "line": LINES[BARS[level]]} for i, level in fired]


def rate(num: float, den: float, per: float = 1.0) -> float | None:
    return round(num * per / den, 1) if den else None


def player_stats(squad_ids: dict[str, str], files) -> dict[str, dict]:
    """Career counts for the given people over every men's T20 in our files (all splits:
    this is counting, not predicting). squad_ids maps registry id -> display name."""
    stat = {
        pid: defaultdict(float, {"matches": 0}) for pid in squad_ids
    }
    seen: set[str] = set()
    for path in files:
        if path.stem in seen:
            continue
        seen.add(path.stem)
        d = json.loads(path.read_text())
        info = d.get("info", {})
        if info.get("gender") != "male" or info.get("match_type") not in {"T20", "IT20"}:
            continue
        people = info.get("registry", {}).get("people", {})
        ids = {name: pid for name, pid in people.items() if pid in stat}
        if not ids:
            continue
        for names in info.get("players", {}).values():
            for name in names:
                if name in ids:
                    stat[ids[name]]["matches"] += 1
        for n, inn in enumerate([i for i in d.get("innings", []) if not i.get("super_over")], start=1):
            bat = defaultdict(lambda: {"runs": 0, "balls": 0, "out": False})
            bowled_by: set[str] = set()
            for over in inn.get("overs", []):
                death = over["over"] >= 15
                for dl in over["deliveries"]:
                    extras = dl.get("extras", {})
                    legal = is_legal(dl)
                    b = bat[dl["batter"]]
                    b["runs"] += dl["runs"]["batter"]
                    faced = "wides" not in extras
                    b["balls"] += int(faced)
                    if dl["batter"] in ids:
                        s = stat[ids[dl["batter"]]]
                        s["sixes"] += int(dl["runs"]["batter"] == 6)
                        if death:
                            s["death_runs"] += dl["runs"]["batter"]
                            s["death_balls"] += int(faced)
                    if dl["bowler"] in ids:
                        s = stat[ids[dl["bowler"]]]
                        bowled_by.add(dl["bowler"])
                        conceded = dl["runs"]["total"] - sum(extras.get(k, 0) for k in ("byes", "legbyes", "penalty"))
                        s["bowl_runs"] += conceded
                        s["bowl_balls"] += int(legal)
                        if death:
                            s["death_bowl_runs"] += conceded
                            s["death_bowl_balls"] += int(legal)
                    for w in dl.get("wickets", []):
                        if w.get("kind") in NOT_A_WICKET:
                            continue
                        bat[w["player_out"]]["out"] = True
                        if dl["bowler"] in ids and w["kind"] not in NOT_BOWLERS_WICKET:
                            stat[ids[dl["bowler"]]]["wickets"] += 1
            for name in bowled_by:
                stat[ids[name]]["bowl_innings"] += 1
            for name, b in bat.items():
                if name not in ids:
                    continue
                s = stat[ids[name]]
                s["bat_innings"] += 1
                s["runs"] += b["runs"]
                s["balls"] += b["balls"]
                s["outs"] += int(b["out"])
                s["fifties"] += int(b["runs"] >= 50)
                if n == 2:
                    s["chase_innings"] += 1
                    s["chase_runs"] += b["runs"]
                    s["chase_outs"] += int(b["out"])
                    s["chase_fifties"] += int(b["runs"] >= 50)
                    s["chase_not_outs"] += int(not b["out"])
    out = {}
    for pid, s in stat.items():
        enough_bat = s["bat_innings"] >= MIN_INNINGS
        enough_chase = s["chase_innings"] >= MIN_INNINGS
        enough_bowl = s["bowl_innings"] >= MIN_INNINGS
        out[pid] = {
            "matches": int(s["matches"]),
            "batting": {
                "innings": int(s["bat_innings"]),
                "runs": int(s["runs"]),
                "average": rate(s["runs"], s["outs"]) if enough_bat else None,
                "strike_rate": rate(s["runs"], s["balls"], 100) if enough_bat else None,
                "fifties": int(s["fifties"]),
                "sixes": int(s["sixes"]),
                "chase_innings": int(s["chase_innings"]),
                "chase_average": rate(s["chase_runs"], s["chase_outs"]) if enough_chase else None,
                "chase_fifties": int(s["chase_fifties"]),
                "chase_not_outs": int(s["chase_not_outs"]),
                "death_strike_rate": (
                    rate(s["death_runs"], s["death_balls"], 100) if s["death_balls"] >= MIN_DEATH_BALLS else None
                ),
            },
            "bowling": {
                "innings": int(s["bowl_innings"]),
                "wickets": int(s["wickets"]),
                "economy": rate(s["bowl_runs"], s["bowl_balls"], 6) if enough_bowl else None,
                "death_economy": (
                    rate(s["death_bowl_runs"], s["death_bowl_balls"], 6)
                    if s["death_bowl_balls"] >= MIN_DEATH_BALLS
                    else None
                ),
            },
        }
    return out


def find_raw(match_id: str):
    hits = sorted(RAW.glob(f"*/{match_id}.json"))
    if not hits:
        raise FileNotFoundError(f"no raw file for match {match_id}; run `make model` first")
    return hits[0]


def main() -> None:
    replay = read_json(DATA / "replay.json")
    match_id = replay["match_id"]
    if not match_id:
        raise SystemExit("data/replay.json has no match_id. Run `make pick`, choose one, then export.")
    assert_replay_in_test(load_split(), match_id)
    d = json.loads(find_raw(match_id).read_text())
    if exclusion_reason(d):
        raise SystemExit(f"match {match_id} is excluded from the model data: {exclusion_reason(d)}")

    teams = read_json(DATA / "teams.json") if (DATA / "teams.json").exists() else {}
    jerseys = read_json(DATA / "jerseys.json") if (DATA / "jerseys.json").exists() else {}
    thresholds = read_json(DATA / "thresholds.json")
    timeline, scored = build_timeline(d, match_id, load_model(), load_percentiles(), teams)
    out = DATA / "matches" / match_id
    write_json(out / "timeline.json", timeline)
    write_json(out / "alerts.json", build_alerts(scored, thresholds))

    people = d["info"]["registry"]["people"]
    squads = d["info"].get("players", {})
    ids = {people[name]: name for names in squads.values() for name in names if name in people}
    stats = player_stats(ids, sorted(RAW.glob("*/*.json")))
    players = {}
    for team, names in squads.items():
        for name in names:
            pid = people.get(name)
            if pid:
                players[name] = {"id": pid, "team": team, "jersey": jerseys.get(match_id, {}).get(name), **stats[pid]}
    write_json(out / "players.json", players)
    print(f"wrote {out}: {len(timeline['events'])} events, {len(players)} players")


if __name__ == "__main__":
    main()
