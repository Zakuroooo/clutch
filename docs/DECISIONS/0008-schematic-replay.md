# 0008. The mini replay draws the kind of outcome, not the ball's path

**Date:** 13 Nov 2026 · **Status:** accepted · **Changes the plan**

## Context
The plan described the mini replay as "where it pitched, where it went, the fielder". Cricsheet's data has none of that: no pitch location, no shot direction, no fielder positions. It records runs, extras, how a batter was out and who caught it.

## Decision
The mini replay is a side-on line drawing chosen by the recorded outcome: dot, runs, four, six, bowled, caught, lbw, run out, stumped, wide, no-ball. It carries a caption: "A drawing of what was recorded. Not the ball's real path." It is side-on because that view implies no direction around the ground.

## Why
- Drawing a shot through cover that actually went over midwicket would be inventing a fact, and breaks the project's first rule.
- An honest, labelled drawing still answers "what happened?" at a glance.

## Cost
- Every six looks the same. The drawing carries less than a real replay.
- With tracking data (which is licensed, not open) this component could show the real path with no other change.
