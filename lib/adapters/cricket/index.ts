/** The cricket adapter: the only sport-specific code in the app (docs/TRD.md section 4). */
export {
  loadMatch,
  loadPulsePromise,
  replayMatchId,
  type MatchData,
  type PulsePromise,
} from "./load";
export { detectMoments, detectNewBatters, type NewBatterEvent } from "./moments";
export { replayKind } from "./replayKind";
export {
  eventGlyph,
  margin,
  overLabel,
  resultStrip,
  scoreboardAt,
  segment,
  teamName,
} from "./scoreboard";
export type { CricketEvent, CricketState, CricketTick, Player, Players } from "./types";
