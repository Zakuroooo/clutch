# 0001. Replay a real past match instead of using a live API

**Date:** 13 Nov 2026 · **Status:** accepted

## Context
The assignment asks for a working link a reviewer can open at any time. Free live cricket APIs are tightly limited (the plan found one at 100 requests a day, minutes behind), and there may be no match on when the reviewer opens the link.

## Decision
Replay one real past match, ball by ball, on a shared clock, from Cricsheet's open data. Say so on every screen: "Replay of a real match, running as live."

## Why
- The demo works whenever it is opened, and works the same every time.
- The data is open and its licence allows this use (docs/DATA.md).
- It lets us evaluate honestly: the replay match is held out from model training.
- A deterministic match makes two-browser tests possible.

## Cost
- It is not live. Nothing here proves the system copes with a real feed's delays, corrections and outages.
- Ball timing is synthetic, because the data has no timestamps.
- A live feed would need a new adapter input and a paid data source.
