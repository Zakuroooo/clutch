/** What the score card shows for a cricket state. Every value comes from the tick. */
import type { MatchInfo, ScoreboardView } from "@/lib/engine/types";
import type { CricketEvent, CricketState, CricketTick } from "./types";

export function teamName(match: MatchInfo, code: string): string {
  return match.teams.find((t) => t.code === code)?.name ?? code;
}

/** The name when it fits on the chase strip's one line, otherwise the code. */
export function shortName(match: MatchInfo, code: string): string {
  const name = teamName(match, code);
  return name.length <= 12 ? name : code;
}

/** "16.1": the over (0-based) and the ball's number in it. */
export function overLabel(event: CricketEvent): string {
  return `${event.over}.${event.ball}`;
}

/** Overs bowled as cricket writes them: 16.1 means 16 overs and 1 ball. */
export function oversBowled(balls: number): string {
  return balls % 6 === 0 ? `${balls / 6}` : `${Math.floor(balls / 6)}.${balls % 6}`;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * The scoreboard after tick `i` (or before the first ball when i is -1). It needs the
 * ticks, not only the state, because the first innings' final score lives in an earlier tick.
 */
export function scoreboardAt(
  ticks: readonly CricketTick[],
  i: number,
  match: MatchInfo,
): ScoreboardView {
  const [first, second] = match.batting_order;
  if (i < 0) {
    return {
      rows: [
        { team: first, main: "0", sub: "/0", side: "batting first", batting: true },
        { team: second, main: "–", sub: "", side: "yet to bat", batting: false },
      ],
    };
  }
  const state = ticks[i].state;
  const chasing = state.batting === second;
  const lastOfFirst = chasing ? lastTickOfInnings(ticks, 1) : null;
  const inningsOver = !chasing && ticks[i + 1]?.event.innings === 2;

  const firstState = chasing ? lastOfFirst!.state : state;
  const rows: ScoreboardView["rows"] = [
    {
      team: first,
      main: `${firstState.score}`,
      sub: `/${firstState.wickets}`,
      side: chasing || inningsOver ? `${oversBowled(firstState.balls_bowled)} overs` : "batting",
      batting: !chasing && !inningsOver,
    },
    chasing
      ? {
          team: second,
          main: `${state.score}`,
          sub: `/${state.wickets}`,
          side: "batting",
          batting: true,
        }
      : { team: second, main: "–", sub: "", side: "yet to bat", batting: false },
  ];

  const finished = i === ticks.length - 1;
  if (finished) {
    return {
      rows: rows.map((r) => ({ ...r, batting: false, side: sideWhenDone(r) })),
      chase: resultStrip(match),
    };
  }
  if (inningsOver) {
    return {
      rows,
      chase: {
        left: `${shortName(match, second)} need ${state.score + 1} to win`,
        right: "Innings break",
      },
    };
  }
  if (chasing && state.needed !== null) {
    return {
      rows,
      chase: {
        left: `${shortName(match, second)} need ${state.needed} from ${plural(state.balls_left, "ball")}`,
        right: `${10 - state.wickets} wkts left`,
      },
    };
  }
  // Innings 1: the strip is there from the first ball, so the screen does not jump later.
  return {
    rows,
    chase: {
      left: `${shortName(match, first)} are batting first`,
      right: `${plural(state.balls_left, "ball")} left`,
    },
  };
}

function sideWhenDone(row: ScoreboardView["rows"][number]): string {
  return row.side === "batting" ? "chased" : row.side;
}

export function resultStrip(match: MatchInfo): { left: string; right: string } {
  return { left: `${shortName(match, match.result.winner)} won`, right: `by ${margin(match)}` };
}

/** "7 runs" or "4 wickets", from the recorded result. */
export function margin(match: MatchInfo): string {
  const by = match.result.by ?? {};
  const [unit, n] = Object.entries(by)[0] ?? ["", 0];
  if (!unit) return "";
  const word = unit.replace(/s$/, "");
  return plural(n, word);
}

export function lastTickOfInnings(ticks: readonly CricketTick[], innings: 1 | 2): CricketTick {
  for (let k = ticks.length - 1; k >= 0; k--)
    if (ticks[k].event.innings === innings) return ticks[k];
  throw new Error(`no ball in innings ${innings}`);
}

/** The scoreboard for a state alone, when the first-innings row is not needed. */
export function scoreLine(state: CricketState): string {
  return `${state.score}/${state.wickets}`;
}

/** One character for a ball chip: "W", "6", "4", "1", "•", or an extra like "1wd". */
export function eventGlyph(event: CricketEvent): string {
  if (event.wicket) return "W";
  if (event.extras_kind === "wides") return event.runs.total > 1 ? `${event.runs.total}wd` : "wd";
  if (event.extras_kind === "noballs") return event.runs.bat ? `${event.runs.bat}nb` : "nb";
  if (event.runs.total === 0) return "•";
  return `${event.runs.total}`;
}

export type SegmentCell = {
  glyph: string;
  tone: "plain" | "four" | "six" | "wicket" | "extra" | "next";
};

export function cellTone(event: CricketEvent): SegmentCell["tone"] {
  if (event.wicket) return "wicket";
  if (!event.legal) return "extra";
  if (event.runs.bat === 6) return "six";
  if (event.runs.bat === 4) return "four";
  return "plain";
}

/**
 * The "this over" strip at tick i: the balls bowled so far in the current over, then
 * dashed placeholders for the legal balls still to come.
 */
export function segment(
  ticks: readonly CricketTick[],
  i: number,
): { label: string; cells: SegmentCell[]; spoken: string } {
  if (i < 0) {
    return { label: "Over 1", cells: placeholders(1), spoken: "Over 1 has not started" };
  }
  const here = ticks[i].event;
  const overDone = here.legal && here.ball === 6;
  const next = ticks[i + 1]?.event;
  // Between overs, show the over that is about to start, empty.
  if (overDone && next && next.innings === here.innings) {
    return {
      label: `Over ${next.over + 1}`,
      cells: placeholders(1),
      spoken: `Over ${next.over + 1} is about to start`,
    };
  }
  const bowled = [];
  for (let k = i; k >= 0; k--) {
    const e = ticks[k].event;
    if (e.over !== here.over || e.innings !== here.innings) break;
    bowled.unshift(e);
  }
  const legal = bowled.filter((e) => e.legal).length;
  const cells: SegmentCell[] = [
    ...bowled.map((e) => ({ glyph: eventGlyph(e), tone: cellTone(e) })),
    ...placeholders(legal + 1),
  ];
  const spoken = bowled.map((e) => spokenBall(e)).join(", ");
  return {
    label: `Over ${here.over + 1}`,
    cells,
    spoken: `Over ${here.over + 1} so far: ${spoken}`,
  };
}

function placeholders(from: number): SegmentCell[] {
  const out: SegmentCell[] = [];
  for (let n = from; n <= 6; n++) out.push({ glyph: `${n}`, tone: "next" });
  return out;
}

function spokenBall(e: CricketEvent): string {
  if (e.wicket) return "wicket";
  if (e.extras_kind === "wides") return "wide";
  if (e.extras_kind === "noballs") return "no-ball";
  if (e.runs.total === 0) return "dot";
  return plural(e.runs.total, "run");
}
