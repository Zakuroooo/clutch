# Sport adapters: how to add a sport

The engine (`lib/clock`, `lib/engine`, `lib/cards`) never names a sport. It works on
**ticks**: one per event, each with a time, a state, a win chance and a stakes value.
A test (`lib/engine/engine.test.ts`) fails if those folders import an adapter or name a sport.

Only cricket is built. Football is designed, not built. To add a sport you supply three things.

## 1. A pipeline that writes the same files

`data/matches/<id>/timeline.json` in the shape of `docs/TRD.md` section 2:

- `match`: teams, colours, the order they went in, the real result, source and licence.
- `events[]`: `i`, `t_ms`, your own `event` and `state` objects, `wp` (win chance of the
  first team, before and after) and `stakes` (`raw` and a 0 to 100 percentile).

Plus `alerts.json` (call-backs by bar) and `data/thresholds.json`. For cricket this is
`model/` (Python). The win-chance model, the stakes rule and the thresholds are yours to
define; the engine only needs the numbers. Keep the rule that thresholds are fitted on
training matches only.

## 2. An adapter module: `lib/adapters/<sport>/`

| File            | What it does                                                                                                           | Cricket example                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `types.ts`      | Zod schemas for your `state` and `event`                                                                               | score, wickets, balls left, target      |
| `load.ts`       | Read and validate the files                                                                                            | `loadMatch(id)`                         |
| `scoreboard.ts` | State to the score card rows, the "this segment" strip and its glyphs                                                  | "RCB need 26 from 23 balls", ball chips |
| `moments.ts`    | `detectMoments(ticks, thresholds)`: which events go on the shelf                                                       | big wicket, big over, swing, milestone  |
| `replayKind.ts` | Event to one of the mini-replay drawings                                                                               | `caught`, `six`, `bowled`               |
| `facts.ts`      | `facts(moment, ticks, match)`: the only thing the LLM and the check ever see, and `progress()` for the analogy anchors | score before and after, who gained      |

## 3. Drawings and words

- One side-on drawing per replay kind in `components/MiniReplay.tsx`, drawn only from
  what the data records.
- Template sentences for your moment kinds in `lib/cards/templates.ts`.

## What you get for free

The clock and re-anchoring, the Pulse states, Focus call-backs and notifications, the
shelf with seen and missed, Catch me up, card checking and caching, and the demo mode.

## A football sketch (designed, not built)

- `event`: shot, goal, card, substitution, with the minute. `state`: score, minute, red cards.
- Win chance from score difference, minute and red cards; stakes from "what if this
  attack scores" against "what if it is stopped".
- Moments: goal, red card, penalty awarded, a big chance missed late.
- Segment strip: the last five minutes instead of the over.
