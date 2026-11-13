"""The call-back rule (docs/MODEL.md section 6.3), used by thresholds, the Pulse
evaluation and the export, so all three agree.

Walk the match ball by ball. A ball's level is the highest bar whose cut-off its
stakes.pct reaches. It fires a call-back unless one of the same or a higher level fired
within the last `cooldown` legal balls of the same innings. A fan at bar b receives
every call-back at level b or above.
"""

from __future__ import annotations

BARS = ["notable", "big", "decider"]  # low to high
LINES = {
    "decider": "This over can decide it",
    "big": "Big moment coming",
    "notable": "Worth a look",
}


def level_of(pct: float, cutoffs: dict[str, float]) -> int:
    """-1 for none, else the index into BARS."""
    level = -1
    for k, bar in enumerate(BARS):
        if bar in cutoffs and pct >= cutoffs[bar]:
            level = k
    return level


def walk(innings, legal_before, pct, cutoffs: dict[str, float], cooldown: int) -> list[tuple[int, int]]:
    """One match. innings[i], legal_before[i] (legal balls bowled in the innings before
    ball i) and pct[i] are per ball, in order. Returns [(ball index, level)]."""
    fired: list[tuple[int, int]] = []
    last_at = [None, None, None]  # legal_before of the last call-back at each level
    current = None
    for i in range(len(pct)):
        if innings[i] != current:
            current = innings[i]
            last_at = [None, None, None]
        level = level_of(pct[i], cutoffs)
        if level < 0:
            continue
        recent = any(
            last_at[k] is not None and legal_before[i] - last_at[k] < cooldown
            for k in range(level, len(BARS))
        )
        if not recent:
            fired.append((i, level))
            last_at[level] = legal_before[i]
    return fired


def count_at_bar(fired: list[tuple[int, int]], bar: str) -> int:
    k = BARS.index(bar)
    return sum(1 for _, level in fired if level >= k)
