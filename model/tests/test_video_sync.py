"""The video sync: scoreboard readings -> ball times."""

from src.video_sync import anchors_from, ball_times, parse_reading

CODES = {"DNM": 1, "GRM": 2}


def test_reads_the_main_box_not_the_ticker():
    text = "0.014 0.036\tDNM 116/9 OVERS 20.0\n0.431 0.564\tGRM\n0.511 0.541\t39/3\n0.505 0.341\tOVERS 9.0\n"
    assert parse_reading(text, CODES) == (2, 39, 3, 54)


def test_incomplete_readings_are_skipped():
    assert parse_reading("0.4 0.5\tDNM\n0.5 0.5\t104/6\n0.5 0.3\tOVERS\n", CODES) is None
    assert parse_reading("", CODES) is None


def events(states):
    return [{"i": k, "event": {"innings": inn}, "state": {"score": s, "wickets": w, "balls_bowled": b}} for k, (inn, s, w, b) in enumerate(states)]


def test_anchors_use_the_first_time_a_state_is_shown_and_report_the_rest():
    ev = events([(1, 1, 0, 1), (1, 1, 0, 2), (1, 5, 0, 3), (2, 0, 0, 1), (2, 6, 0, 2)])
    line = lambda team, sc, ov: f"x\t{team}\nx\t{sc}\nx\tOVERS {ov}\n"
    readings = [
        {"now": 40.0, "text": line("DNM", "1/0", "0.2")},
        {"now": 10.0, "text": line("DNM", "1/0", "0.1")},
        {"now": 70.0, "text": line("DNM", "5/0", "0.3")},
        {"now": 75.0, "text": line("DNM", "5/0", "0.3")},
        {"now": 99.0, "text": line("DNM", "9/9", "0.3")},
        {"now": 300.0, "text": line("GRM", "6/0", "0.2")},
    ]
    anchors, unresolved = anchors_from(readings, ev, CODES)
    assert anchors == [(0, 10.0), (1, 40.0), (2, 70.0), (4, 300.0)]
    assert unresolved == [{"t": 99.0, "reading": (1, 9, 9, 3)}]


def test_ball_times_fill_gaps_evenly_and_increase():
    times = ball_times(6, [(0, 100.0), (4, 220.0), (5, 250.0)])
    assert times == [100.0, 130.0, 160.0, 190.0, 220.0, 250.0]
    assert all(b > a for a, b in zip(times, times[1:]))
