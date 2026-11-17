/**
 * Who a player is, in plain words, from their record before this match (players.json).
 * Every line is built by code from that record; nothing is written by a model, so every
 * number on a player profile is a number in the data.
 */
import type { Player, Players } from "./types";

export type Tile = { value: number | string; label: string };
export type CompareRow = {
  label: string;
  a: number | string;
  b: number | string;
  lead: "a" | "b" | "tie";
};

const ALL_ROUND_RUNS = 300;
const BOWLER_WICKETS = 10;

export function roleOf(p: Player): "Batter" | "Bowler" | "All-rounder" | "New face" {
  if (p.matches === 0) return "New face";
  const bowls = p.bowling.wickets >= BOWLER_WICKETS;
  if (bowls && p.batting.runs >= ALL_ROUND_RUNS) return "All-rounder";
  if (bowls) return "Bowler";
  return "Batter";
}

/** Rank of a player within their own team in this match, by a stat (1 is best). */
function rankInTeam(name: string, players: Players, stat: (p: Player) => number): number {
  const me = players[name];
  const mine = stat(me);
  return 1 + Object.values(players).filter((p) => p.team === me.team && stat(p) > mine).length;
}

const runs = (p: Player) => p.batting.runs;
const wickets = (p: Player) => p.bowling.wickets;

/** All true claims about a player, strongest first. */
function claims(name: string, players: Players): string[] {
  const p = players[name];
  if (!p || p.matches === 0) return ["No T20 matches in our records before this one"];
  const out: string[] = [];
  if (p.batting.runs > 0 && rankInTeam(name, players, runs) === 1)
    out.push(`${p.team}'s top run-scorer in this line-up: ${p.batting.runs} runs`);
  if (p.bowling.wickets > 0 && rankInTeam(name, players, wickets) === 1)
    out.push(`${p.team}'s top wicket-taker in this line-up: ${p.bowling.wickets} wickets`);
  if (p.player_of_match > 1) out.push(`Player of the match ${p.player_of_match} times`);
  else if (p.player_of_match === 1) out.push("Player of the match once");
  if (p.batting.hundreds > 0 && p.batting.highest)
    out.push(`Has a T20 hundred: best score ${p.batting.highest}`);
  else if (p.batting.fifties > 0) out.push(`${p.batting.fifties} T20 fifties`);
  if (p.bowling.best && p.bowling.wickets >= 5) out.push(`Best bowling ${p.bowling.best}`);
  if (out.length === 0) out.push(`${p.matches} T20 matches in our records`);
  return out;
}

/** "Why should I know this player?" in up to three lines. */
export function knownFor(name: string, players: Players): string[] {
  return claims(name, players).slice(0, 3);
}

/** Headline numbers, skipping ones that would be zero or empty. */
export function achievements(p: Player): Tile[] {
  const tiles: (Tile | null)[] = [
    { value: p.matches, label: "matches" },
    p.batting.runs > 0 ? { value: p.batting.runs, label: "runs" } : null,
    p.batting.highest ? { value: p.batting.highest, label: "best score" } : null,
    p.batting.hundreds > 0 ? { value: p.batting.hundreds, label: "hundreds" } : null,
    p.batting.fifties > 0 ? { value: p.batting.fifties, label: "fifties" } : null,
    p.bowling.wickets > 0 ? { value: p.bowling.wickets, label: "wickets" } : null,
    p.bowling.best && p.bowling.wickets > 0
      ? { value: p.bowling.best, label: "best bowling" }
      : null,
    p.player_of_match > 0 ? { value: p.player_of_match, label: "player of the match" } : null,
  ];
  return tiles.filter((t): t is Tile => t !== null);
}

/** Points to make in a debate about this player: true, short, strongest first. */
export function debatePoints(name: string, players: Players): string[] {
  const p = players[name];
  if (!p) return [];
  const out = claims(name, players);
  if (p.batting.strike_rate !== null && p.batting.strike_rate >= 130)
    out.push(`Scores ${p.batting.strike_rate} runs per 100 balls`);
  if (p.bowling.economy !== null && p.bowling.economy <= 7)
    out.push(`Gives away only ${p.bowling.economy} runs an over`);
  return out.slice(0, 4);
}

const highNum = (s: string | null) => (s ? parseInt(s, 10) : 0);

/** Side by side, row by row, with who leads. A row neither player has is left out. */
export function compare(a: string, b: string, players: Players): CompareRow[] {
  const pa = players[a];
  const pb = players[b];
  if (!pa || !pb) return [];
  const rows: {
    label: string;
    get: (p: Player) => number;
    show?: (p: Player) => string | number;
  }[] = [
    { label: "Matches", get: (p) => p.matches },
    { label: "Runs", get: runs },
    {
      label: "Best score",
      get: (p) => highNum(p.batting.highest),
      show: (p) => p.batting.highest ?? "–",
    },
    { label: "Hundreds", get: (p) => p.batting.hundreds },
    { label: "Fifties", get: (p) => p.batting.fifties },
    { label: "Sixes", get: (p) => p.batting.sixes },
    { label: "Wickets", get: wickets },
    { label: "Player of the match", get: (p) => p.player_of_match },
  ];
  return rows
    .filter((r) => r.get(pa) > 0 || r.get(pb) > 0)
    .map((r) => {
      const x = r.get(pa);
      const y = r.get(pb);
      return {
        label: r.label,
        a: r.show ? r.show(pa) : x,
        b: r.show ? r.show(pb) : y,
        lead: x === y ? "tie" : x > y ? "a" : "b",
      };
    });
}

export type Arrival = { i: number; name: string; as: "batter" | "bowler" };

/** The ball at which each player first takes part: walking in to bat, or a first over. */
export function arrivals(
  ticks: readonly { i: number; event: { batter: string; non_striker: string; bowler: string } }[],
): Arrival[] {
  const seen = new Set<string>();
  const out: Arrival[] = [];
  const add = (i: number, name: string, as: Arrival["as"]) => {
    if (seen.has(name)) return;
    seen.add(name);
    out.push({ i, name, as });
  };
  for (const t of ticks) {
    add(t.i, t.event.batter, "batter");
    add(t.i, t.event.non_striker, "batter");
    add(t.i, t.event.bowler, "bowler");
  }
  return out;
}
