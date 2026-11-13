# 0009. A match-centre interface in the style of the sports apps fans already use

**Date:** 13 Nov 2026 · **Status:** accepted, still being improved · **Decided by Pranay**

## Context
Three directions were mocked up in one evening.

1. **Broadcast scoreboard** (condensed type, hairline grid, score bug, meter, over strip). Pranay: cluttered and boring.
2. **One dial on an empty screen** (a watch-face dial, serif italic type, no cards). Pranay: looks like a plain page with big fonts, not a professional app; 0 out of 10.
3. **Match centre** (dark surfaces, rounded cards, crests, jerseys, ball chips, stat tiles, a tab bar, and a glowing Pulse ring). Pranay: go ahead and build, but it is not yet the best it can be; keep improving it while building.

His reference points are the Dream11 and JioHotstar apps: pictures, precise cards, familiar patterns.

## Decision
Build direction 3. Use the conventions of mainstream sports apps for everything ordinary (score card, chips, tiles, tabs), and keep one element that is distinctly Clutch: the Pulse ring and its pink-to-orange gradient, reserved for stakes.

The mock-ups in `design/screens/` are the floor, not the ceiling. The design is improved alongside the build and reviewed on a real phone at each checkpoint.

## Why
- Casual fans already know how these apps work. Familiar patterns cost them nothing to learn.
- Reviewers at a sports-app company will read a familiar, polished match centre as professional.
- The earlier directions were distinctive but did not look like a product someone would install.

## Cost
- It is less distinctive. The Pulse has to carry the identity on its own.
- Those apps get their life from licensed player photographs. We cannot use them (decision 0003), so jerseys, crests and a drawn floodlit hero stand in. This is the main gap between our screens and theirs, and it is a legal limit, not a design choice.
- Two rounds of design and document work were discarded on the first evening.

## Lesson recorded
The first two directions followed a written brief ("must not look AI-generated", then "classy, minimal") further than the person wanted. Showing a rough screenshot earlier, before writing the design documents, would have saved both rounds.
