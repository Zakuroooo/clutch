# 0009. One object on an empty screen

**Date:** 13 Nov 2026 · **Status:** accepted · **Decided by Pranay**

## Context
The first mock-ups followed a "broadcast scoreboard" brief: a two-row score bug, a stakes meter, an over-by-over strip, a card preview and a row of reaction buttons, set in a condensed scoreboard typeface. Pranay reviewed them and rejected the direction: too cluttered, too much like every other sports app, boring. He asked for something classy and minimal.

## Decision
The room screen is one dial, one line of score, and three words at the bottom. The dial carries the match's progress (one tick per ball), the stakes (a breathing halo and a word) and the fan's missed moments (longer, coloured ticks). Cards take the whole screen when they appear and then leave. Type is a high-contrast serif (Bodoni Moda) with a quiet grotesk for small text. No boxes, panels or rounded rectangles.

## Why
- The user is doing something else. Every extra element competes with the one answer they need: look up, or not.
- Putting progress, stakes and missed moments into one object removed three separate components.
- It does not look like a score app, which is the point: it is for people score apps were not made for.

## Cost
- Less information at a glance for a fan who does want detail (the other team's score, the over so far). It is one tap away, not on the screen.
- A thin serif is harder to read small; the display face is never used below 22 px.
- The condensed "scoreboard" feel in the original brief is gone.
