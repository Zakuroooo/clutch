/**
 * Which mini-replay drawing to use for a ball. It reads only the recorded outcome:
 * runs, extras and the wicket kind. There is no position or direction in the data, so
 * nothing here (or in the drawing) takes one.
 */
import type { ReplayKind } from "@/lib/engine/types";
import type { CricketEvent } from "./types";

export function replayKind(event: CricketEvent): ReplayKind {
  if (event.wicket) {
    switch (event.wicket.kind) {
      case "bowled":
        return "bowled";
      case "lbw":
        return "lbw";
      case "run out":
        return "run_out";
      case "stumped":
        return "stumped";
      default:
        // caught, caught and bowled, hit wicket and the rare kinds
        return event.wicket.kind.startsWith("caught") ? "caught" : "bowled";
    }
  }
  if (event.extras_kind === "wides") return "wide";
  if (event.extras_kind === "noballs") return "no_ball";
  if (event.runs.bat === 6) return "six";
  if (event.runs.bat === 4) return "four";
  if (event.runs.total === 0) return "dot";
  return "runs";
}
