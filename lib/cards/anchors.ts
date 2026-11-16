/**
 * Analogy anchors (docs/CARDS.md section 3): match progress mapped onto each world's
 * own scale by code, so the LLM never invents "the 88th minute". The 90 minutes, 50
 * laps, 40 moves and 12 rounds are fixed conventions, not claims about a real event.
 */
import type { World } from "@/lib/engine/types";
import type { Progress } from "./schema";

export type Anchors = Record<string, number>;

export function anchorsFor(world: World, progress: Progress): Anchors {
  const { p, part } = progress;
  switch (world) {
    case "football": {
      const minute = Math.round(90 * p);
      return { minute, minutes_left: 90 - minute };
    }
    case "f1": {
      const lap = Math.max(1, Math.round(50 * p));
      return { lap, laps_left: 50 - lap, total_laps: 50 };
    }
    case "chess":
      return { move: Math.max(1, Math.round(40 * p)) };
    case "bollywood":
      return { act: part };
    case "gaming":
      return { round: Math.max(1, Math.round(12 * p)), total_rounds: 12 };
    case "hinglish":
    case "plain":
      return {};
  }
}
