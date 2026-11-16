"""Pin every ball of the replay match to a time in its match video.

Input: scoreboard readings taken from the embedded video (scripts in the video branch
notes: a browser seeks the YouTube player, crops the on-screen scoreboard and reads it
with the operating system's text recognition; no frames are kept). Each reading is
{t: video seconds, text: recognised lines}.

A reading such as "GER 98/6 OVERS 17.2" names exactly one state of the match (innings,
score, wickets, legal balls). That state is the state after one event of the timeline, so
the reading says: by video time t, that event has happened and the next has not.

A ball's video time is the first time the scoreboard shows it. Balls between two anchors
are spread evenly. Unresolved readings are reported, never forced.

Writes data/matches/<id>/video_sync.json. export.py uses it for t_ms when it exists.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from .common import DATA, read_json, write_json

SCORE = re.compile(r"^(\d{1,3})\s*/\s*(\d{1,2})$")
OVERS = re.compile(r"OVERS\s*(\d{1,2})\s*[.,]\s*(\d)", re.I)


def parse_reading(text: str, codes: dict[str, int]) -> tuple[int, int, int, int] | None:
    """(innings, score, wickets, legal balls) from one reading, or None."""
    lines = [ln.split("\t", 1)[-1].strip() for ln in text.splitlines()]
    team = next((codes[ln] for ln in lines if ln in codes), None)
    score = next((SCORE.match(ln) for ln in lines if SCORE.match(ln)), None)
    overs = next((OVERS.search(ln) for ln in lines if OVERS.search(ln)), None)
    if team is None or score is None or overs is None:
        return None
    o, b = int(overs.group(1)), int(overs.group(2))
    if b > 5:
        return None
    return team, int(score.group(1)), int(score.group(2)), o * 6 + b


def state_index(events: list[dict]) -> dict[tuple[int, int, int, int], int]:
    """Each state after an event -> the LAST event with that state (a wide keeps the
    ball count, a dot keeps the score; the full tuple is still unique within an innings)."""
    out = {}
    for e in events:
        s = e["state"]
        out[(e["event"]["innings"], s["score"], s["wickets"], s["balls_bowled"])] = e["i"]
    # Before the first ball of each innings: score 0/0 after 0 balls.
    out.setdefault((1, 0, 0, 0), -1)
    first2 = next(e["i"] for e in events if e["event"]["innings"] == 2)
    out.setdefault((2, 0, 0, 0), first2 - 1)
    return out


def anchors_from(readings: list[dict], events: list[dict], codes: dict[str, int]):
    """First video time at which each event index is shown, plus unresolved readings."""
    index = state_index(events)
    first_seen: dict[int, float] = {}
    unresolved = []
    for r in sorted(readings, key=lambda r: r["now"]):
        parsed = parse_reading(r["text"], codes)
        if parsed is None:
            continue
        i = index.get(parsed)
        if i is None:
            unresolved.append({"t": r["now"], "reading": parsed})
            continue
        if i not in first_seen or r["now"] < first_seen[i]:
            first_seen[i] = r["now"]
    # Keep only anchors that move forward in both index and time.
    anchors = []
    for i in sorted(first_seen):
        t = first_seen[i]
        if anchors and t <= anchors[-1][1]:
            continue
        anchors.append((i, t))
    return anchors, unresolved


def ball_times(n: int, anchors: list[tuple[int, float]]) -> list[float]:
    """A video time for every event 0..n-1, from anchors (event index, seconds)."""
    pts = [(i, t) for i, t in anchors if 0 <= i < n]
    if len(pts) < 2:
        raise ValueError("need at least two anchors")
    times = []
    for k in range(n):
        if k <= pts[0][0]:
            (i0, t0), (i1, t1) = pts[0], pts[1]
        elif k >= pts[-1][0]:
            (i0, t0), (i1, t1) = pts[-2], pts[-1]
        else:
            j = next(j for j in range(1, len(pts)) if pts[j][0] >= k)
            (i0, t0), (i1, t1) = pts[j - 1], pts[j]
        times.append(round(t0 + (t1 - t0) * (k - i0) / (i1 - i0), 1))
    # Strictly increasing, at least one second apart.
    for k in range(1, n):
        if times[k] <= times[k - 1]:
            times[k] = round(times[k - 1] + 1.0, 1)
    return times


def main(samples_path: str) -> None:
    replay = read_json(DATA / "replay.json")
    match_id = replay["match_id"]
    timeline = read_json(DATA / "matches" / match_id / "timeline.json")
    events = timeline["events"]
    order = timeline["match"]["batting_order"]
    # Scoreboard codes can differ from ours (Denmark is "DNM" on screen).
    codes = {code: k + 1 for k, code in enumerate(order)}
    codes.update({alias: codes[ours] for alias, ours in replay["video"].get("scoreboard_codes", {}).items()})
    readings = [json.loads(line) for line in Path(samples_path).read_text().splitlines() if line.strip()]
    anchors, unresolved = anchors_from(readings, events, codes)
    times = ball_times(len(events), anchors)
    exact = {i for i, _ in anchors}
    write_json(
        DATA / "matches" / match_id / "video_sync.json",
        {
            "youtube_id": replay["video"]["youtube_id"],
            "method": "scoreboard read from the embedded video; a ball's time is when the scoreboard first shows it; balls between anchors spread evenly",
            "readings": len(readings),
            "anchored_balls": len(exact),
            "unresolved_readings": unresolved,
            "anchors": [{"i": i, "t": t} for i, t in anchors],
            "ball_times": times,
        },
    )
    print(f"{len(readings)} readings, {len(exact)} anchored balls of {len(events)}, {len(unresolved)} unresolved")


if __name__ == "__main__":
    main(sys.argv[1])
