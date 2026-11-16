/**
 * Ball-by-ball commentary, written by code from the recorded event. Every word comes from
 * the data: who bowled, who faced, what happened. No adjectives the data cannot support.
 */
import { shortName } from "./scoreboard";
import type { CricketEvent, CricketTick } from "./types";
import type { MatchInfo } from "@/lib/engine/types";

export type CommentaryLine = {
  i: number;
  over: string;
  /** "Kumar to Ahmed" */
  who: string;
  /** "FOUR", "OUT", "1 run", "wide" */
  result: string;
  tone: "plain" | "four" | "six" | "wicket" | "extra";
  /** "Germany 60/3" */
  score: string;
};

const last = (name: string) => name.split(/\s+/).slice(-1)[0];

function wicketText(e: CricketEvent): string {
  const w = e.wicket!;
  const by = w.fielders[0] ? ` by ${last(w.fielders[0])}` : "";
  switch (w.kind) {
    case "caught":
      return `OUT, caught${by}`;
    case "caught and bowled":
      return "OUT, caught and bowled";
    case "run out":
      return `OUT, run out${by}`;
    case "stumped":
      return `OUT, stumped${by}`;
    default:
      return `OUT, ${w.kind}`;
  }
}

export function commentaryLine(t: CricketTick, match: MatchInfo): CommentaryLine {
  const e = t.event;
  let result: string;
  let tone: CommentaryLine["tone"] = "plain";
  if (e.wicket) {
    result = wicketText(e);
    tone = "wicket";
  } else if (e.extras_kind === "wides") {
    result = e.runs.total > 1 ? `wide, ${e.runs.total} runs` : "wide";
    tone = "extra";
  } else if (e.extras_kind === "noballs") {
    result = e.runs.bat ? `no-ball, ${e.runs.bat} off the bat` : "no-ball";
    tone = "extra";
  } else if (e.runs.bat === 6) {
    result = "SIX";
    tone = "six";
  } else if (e.runs.bat === 4) {
    result = "FOUR";
    tone = "four";
  } else if (e.runs.total === 0) {
    result = "no run";
  } else if (e.extras_kind === "legbyes" || e.extras_kind === "byes") {
    result = `${e.runs.total} ${e.extras_kind === "byes" ? "bye" : "leg-bye"}${e.runs.total > 1 ? "s" : ""}`;
    tone = "extra";
  } else {
    result = `${e.runs.total} run${e.runs.total > 1 ? "s" : ""}`;
  }
  return {
    i: t.i,
    over: `${e.over}.${e.ball}`,
    who: `${last(e.bowler)} to ${last(e.batter)}`,
    result,
    tone,
    score: `${shortName(match, t.state.batting)} ${t.state.score}/${t.state.wickets}`,
  };
}

/** The last `count` balls up to index i, newest first. */
export function commentary(
  ticks: readonly CricketTick[],
  i: number,
  match: MatchInfo,
  count = 12,
): CommentaryLine[] {
  const out: CommentaryLine[] = [];
  for (let k = Math.min(i, ticks.length - 1); k >= 0 && out.length < count; k--)
    out.push(commentaryLine(ticks[k], match));
  return out;
}
