# 0006. Sport-agnostic engine, demonstrated on cricket

**Date:** 13 Nov 2026 · **Status:** accepted

## Context
"When does this matter, what did I miss, and why?" applies to every live sport. Building several sports in three days would mean none done properly.

## Decision
The engine works on a stream of `{state, event, stakes}` ticks and never mentions cricket. One adapter module per sport turns raw data into ticks and supplies the scoreboard text, the moment rules and the facts. Only the cricket adapter is built. The claim is exactly: "built for any live sport, demonstrated on cricket."

## Why
- The dial, call-backs, shelf, cards and room all sit on "stakes" and "moments", which every sport has.
- The boundary is cheap to keep now and expensive to add later.
- One sport done fully is a stronger demonstration than three half-working.

## Cost
- The interface has only been proven against one sport. A second sport will probably force changes to it.
- Each new sport still needs its own data, its own win-probability model and its own analogy anchors. That is most of the work.
