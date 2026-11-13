"""Cricsheet JSON -> one row per ball, with the state BEFORE that ball.

Cleaning rules are in docs/DATA.md section 5. Every exclusion is counted in data_report.json.
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import pandas as pd

from .common import ARTIFACTS, BALLS_PER_INNINGS, RAW, WORK, read_json, write_json

# Kinds that do not count as a wicket falling.
NOT_A_WICKET = {"retired hurt", "retired not out"}

NUMERIC_COLUMNS = [
    "match_id", "seq", "innings", "over", "legal", "balls_left", "wickets_left",
    "score", "target", "runs_total", "runs_bat", "wickets_fell",
]  # fmt: skip


def exclusion_reason(d: dict) -> str | None:
    """Why a match is left out of the model data, or None to keep it."""
    info = d.get("info", {})
    if info.get("match_type") not in {"T20", "IT20"}:
        return "not_t20"
    if info.get("gender") != "male":
        return "not_male"
    if info.get("overs") != 20:
        return "overs_not_20"
    outcome = info.get("outcome", {})
    if outcome.get("method"):
        return "rain_rule_method"
    if outcome.get("eliminator") or outcome.get("bowl_out"):
        return "super_over_or_bowl_out"
    if outcome.get("result"):
        return "tie_or_no_result"
    innings = d.get("innings", [])
    if any(i.get("super_over") for i in innings):
        return "super_over_or_bowl_out"
    if len(innings) != 2 or any(not i.get("overs") for i in innings):
        return "missing_innings"
    if any(i.get("target", {}).get("overs", 20) < 20 for i in innings):
        return "shortened_target"
    if not outcome.get("winner"):
        return "no_winner"
    return None


def is_legal(delivery: dict) -> bool:
    extras = delivery.get("extras", {})
    return "wides" not in extras and "noballs" not in extras


def wickets_in(delivery: dict) -> list[dict]:
    return [w for w in delivery.get("wickets", []) if w.get("kind") not in NOT_A_WICKET]


def parse_match(d: dict, match_id: str) -> tuple[dict, list[dict]]:
    """Return (match info, rows). Call only for matches that exclusion_reason() keeps."""
    info = d["info"]
    innings = [i for i in d["innings"] if not i.get("super_over")]
    first_team = innings[0]["team"]
    winner = info.get("outcome", {}).get("winner")
    event = info.get("event") or {}
    match = {
        "match_id": match_id,
        "date": str(info["dates"][0]),
        "teams": info["teams"],
        "batting_order": [i["team"] for i in innings],
        "winner": winner,
        "label": int(winner == first_team),
        "event": event.get("name"),
        "stage": event.get("stage") or (f"Match {event['match_number']}" if "match_number" in event else None),
        "venue": info.get("venue"),
        "city": info.get("city"),
        "by": info.get("outcome", {}).get("by"),
    }
    rows: list[dict] = []
    seq = 0
    target = 0
    first_total = 0
    for n, inn in enumerate(innings, start=1):
        score = wickets = legal_balls = 0
        if n == 2:
            target = inn.get("target", {}).get("runs") or (first_total + 1)
        for over in inn["overs"]:
            for k, dl in enumerate(over["deliveries"]):
                legal = is_legal(dl)
                fell = wickets_in(dl)
                extras = dl.get("extras", {})
                rows.append(
                    {
                        "match_id": match_id,
                        "seq": seq,
                        "innings": n,
                        "over": over["over"],
                        "n_in_over": k,
                        "legal": int(legal),
                        "balls_left": BALLS_PER_INNINGS - legal_balls,
                        "wickets_left": 10 - wickets,
                        "score": score,
                        "target": target if n == 2 else 0,
                        "runs_total": dl["runs"]["total"],
                        "runs_bat": dl["runs"]["batter"],
                        "runs_extras": dl["runs"]["extras"],
                        "wickets_fell": len(fell),
                        # text, used only when exporting a replay
                        "batting": inn["team"],
                        "batter": dl["batter"],
                        "bowler": dl["bowler"],
                        "non_striker": dl["non_striker"],
                        "extras_kind": next(iter(extras), None),
                        "wicket": (
                            {
                                "kind": fell[0]["kind"],
                                "player_out": fell[0]["player_out"],
                                "fielders": [
                                    f["name"] for f in fell[0].get("fielders", []) if "name" in f
                                ],
                            }
                            if fell
                            else None
                        ),
                    }
                )
                seq += 1
                score += dl["runs"]["total"]
                wickets += len(fell)
                legal_balls += int(legal)
        if n == 1:
            first_total = score
    return match, rows


def iter_raw_files() -> list[Path]:
    return sorted(RAW.glob("*/*.json"))


def main() -> None:
    kept: list[dict] = []
    frames: list[pd.DataFrame] = []
    reasons: Counter[str] = Counter()
    seen: set[str] = set()
    files = iter_raw_files()
    for path in files:
        match_id = path.stem
        if match_id in seen:  # the same match can sit in two zips
            reasons["duplicate_file"] += 1
            continue
        seen.add(match_id)
        d = json.loads(path.read_text())
        reason = exclusion_reason(d)
        if reason:
            reasons[reason] += 1
            continue
        match, rows = parse_match(d, match_id)
        match["source_file"] = path.parent.name
        kept.append(match)
        frames.append(pd.DataFrame(rows)[NUMERIC_COLUMNS])
    balls = pd.concat(frames, ignore_index=True)
    matches = pd.DataFrame(kept)
    balls = balls.merge(matches[["match_id", "label"]], on="match_id")
    WORK.mkdir(parents=True, exist_ok=True)
    balls.to_pickle(WORK / "balls.pkl")
    matches.to_pickle(WORK / "matches.pkl")

    dl_path = ARTIFACTS / "download.json"
    download = read_json(dl_path) if dl_path.exists() else {}
    report = {
        "source": "Cricsheet (cricsheet.org), ODC-By 1.0",
        "downloaded_on": download.get("downloaded_on"),
        "files": download.get("files"),
        "files_read": len(files),
        "matches_kept": len(kept),
        "matches_kept_by_file": matches["source_file"].value_counts().to_dict(),
        "excluded": dict(sorted(reasons.items())),
        "excluded_total": sum(reasons.values()),
        "balls": int(len(balls)),
        "first_match_date": matches["date"].min(),
        "last_match_date": matches["date"].max(),
        "bat_first_win_share": round(float(matches["label"].mean()), 4),
    }
    write_json(ARTIFACTS / "data_report.json", report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
