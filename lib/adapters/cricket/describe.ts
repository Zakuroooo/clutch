/**
 * Plain words for a moment, from its facts: the title a moment card shows at once,
 * before (or without) an LLM headline. Code only, so it cannot be wrong.
 */
import type { Facts } from "@/lib/cards/schema";

export type MomentWords = { badge: string; title: string; line: string };

export function describeMoment(f: Facts): MomentWords {
  const scoreMove = `${f.score_before} to ${f.score_after}`;
  const line = `Over ${f.over_label}, ${scoreMove}`;
  switch (f.kind) {
    case "wicket_big":
      return { badge: "Wicket", title: `${f.wicket?.player_out ?? f.batter} is out`, line };
    case "swing":
      if (f.runs_off_ball === 6) return { badge: "Six", title: `${f.batter} hits a six`, line };
      if (f.runs_off_ball === 4) return { badge: "Four", title: `${f.batter} hits a four`, line };
      if (f.runs_off_ball === 0) return { badge: "Dot ball", title: "A dot ball that hurts", line };
      return { badge: "Swing", title: `${f.runs_off_ball} off one ball`, line };
    case "over_big":
      return { badge: "Big over", title: `${f.over_runs} runs in one over`, line };
    case "milestone":
      return { badge: "Milestone", title: `${f.batter} reaches ${f.batter_runs}`, line };
    case "innings_end":
      return {
        badge: "Innings break",
        title: `${f.bowling_team} need ${f.needed}`,
        line: `${f.batting_team} finish on ${f.score_after}`,
      };
    case "result":
      return { badge: "Result", title: `${f.result?.winner} win`, line: `by ${f.result?.margin}` };
    case "new_batter":
      return {
        badge: "New batter",
        title: `${f.new_batter?.name} walks in`,
        line: `${f.batting_team} ${f.score_after}`,
      };
  }
}
