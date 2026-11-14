/**
 * The facts builder for cricket (docs/CARDS.md section 2). One object per moment, built
 * from the timeline. If a field cannot be computed it is null, never a guess.
 */
import type { MatchInfo, Moment } from "@/lib/engine/types";
import type { FactKind, Facts, Progress } from "@/lib/cards/schema";
import type { NewBatterEvent } from "./moments";
import { margin, overLabel, teamName } from "./scoreboard";
import type { CricketTick, Players } from "./types";

type Subject = { id: string; i: number; kind: FactKind };

export function subjectOf(m: Moment | NewBatterEvent): Subject {
  return "kind" in m
    ? { id: m.id, i: m.i, kind: m.kind }
    : { id: m.id, i: m.i, kind: "new_batter" };
}

const pct = (wp: number) => Math.round(wp * 100);
const round1 = (n: number) => Math.round(n * 10) / 10;

function overStart(ticks: readonly CricketTick[], i: number): number {
  let k = i;
  while (
    k > 0 &&
    ticks[k - 1].event.over === ticks[i].event.over &&
    ticks[k - 1].event.innings === ticks[i].event.innings
  )
    k--;
  return k;
}

/** The score just before ball i, as "151/4". */
function scoreBefore(ticks: readonly CricketTick[], i: number): string {
  const prev = ticks[i - 1];
  if (!prev || prev.event.innings !== ticks[i].event.innings) return "0/0";
  return `${prev.state.score}/${prev.state.wickets}`;
}

/** Runs and balls faced by a batter in this innings, up to and including ball i. */
export function batterInnings(
  ticks: readonly CricketTick[],
  i: number,
  name: string,
): { runs: number; balls: number } {
  let runs = 0;
  let balls = 0;
  for (let k = i; k >= 0 && ticks[k].event.innings === ticks[i].event.innings; k--) {
    const e = ticks[k].event;
    if (e.batter !== name) continue;
    runs += e.runs.bat;
    if (e.extras_kind !== "wides") balls += 1;
  }
  return { runs, balls };
}

function collectNumbers(value: unknown, out: Set<number>) {
  if (typeof value === "number") out.add(value);
  else if (typeof value === "string")
    for (const m of value.matchAll(/\d+(?:\.\d+)?/g)) out.add(Number(m[0]));
  else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => collectNumbers(v, out));
}

function withSurnames(names: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const n of names) {
    if (!n) continue;
    out.add(n);
    const words = n.split(/\s+/);
    if (words.length > 1) out.add(words[words.length - 1]);
  }
  return [...out];
}

export function facts(
  moment: Moment | NewBatterEvent,
  ticks: readonly CricketTick[],
  match: MatchInfo,
  players: Players = {},
): Facts {
  const { id, i, kind } = subjectOf(moment);
  const t = ticks[i];
  const e = t.event;
  const [first, second] = match.batting_order;
  const chase = e.innings === 2;
  const battingCode = t.state.batting;
  const bowlingCode = battingCode === first ? second : first;
  const batting_team = teamName(match, battingCode);
  const bowling_team = teamName(match, bowlingCode);
  const from = kind === "over_big" ? overStart(ticks, i) : i;

  // Win chance is stored for the first team; say it for the side the sentence is about.
  const chanceCode = chase ? second : first;
  const forTeam = (wp: number) => (chanceCode === first ? pct(wp) : 100 - pct(wp));
  const chance_before = forTeam(ticks[from].wp.before);
  const chance_after = forTeam(t.wp.after);
  const firstGained = t.wp.after - ticks[from].wp.before > 0;
  const gainedCode =
    t.wp.after === ticks[from].wp.before ? battingCode : firstGained ? first : second;

  const who = e.wicket ? e.wicket.player_out : e.batter;
  const innings = batterInnings(ticks, i, who);
  const whole = kind === "over_big" || kind === "innings_end" || kind === "result";

  let needed: number | null = chase ? t.state.needed : null;
  let balls_left: number | null = chase ? t.state.balls_left : null;
  if (kind === "innings_end") {
    // What the other side now has to chase.
    needed = t.state.score + 1;
    balls_left = t.state.balls_bowled + t.state.balls_left;
  }

  const entering = kind === "new_batter" ? e.batter : null;
  const p = entering ? players[entering] : undefined;

  const base = {
    moment_id: id,
    kind,
    over_label: overLabel(e),
    batting_team,
    bowling_team,
    score_before: scoreBefore(ticks, from),
    score_after: `${t.state.score}/${t.state.wickets}`,
    needed,
    balls_left,
    wickets_left: 10 - t.state.wickets,
    batter: whole ? null : e.batter,
    bowler: whole ? null : e.bowler,
    runs_off_ball: e.runs.total,
    wicket:
      e.wicket && !whole
        ? {
            kind: e.wicket.kind,
            player_out: e.wicket.player_out,
            fielder: e.wicket.fielders[0] ?? null,
          }
        : null,
    batter_runs: whole ? null : innings.runs,
    batter_balls: whole ? null : innings.balls,
    over_runs:
      kind === "over_big"
        ? ticks.slice(from, i + 1).reduce((sum, x) => sum + x.event.runs.total, 0)
        : null,
    chance_team: teamName(match, chanceCode),
    chance_before,
    chance_after,
    who_gained: teamName(match, gainedCode),
    result:
      kind === "result"
        ? { winner: teamName(match, match.result.winner), margin: margin(match) }
        : null,
    new_batter: entering
      ? {
          name: entering,
          matches: p?.matches ?? 0,
          strike_rate: p?.batting.strike_rate ?? null,
          average: p?.batting.average ?? null,
        }
      : null,
  };

  const numbers = new Set<number>();
  collectNumbers(base, numbers);
  const names = withSurnames([
    batting_team,
    bowling_team,
    base.batter,
    base.bowler,
    base.wicket?.player_out,
    base.wicket?.fielder,
    base.result?.winner,
    base.new_batter?.name,
  ]);
  // Team names are also allowed word by word ("Royal Challengers Bengaluru" -> "Bengaluru").
  for (const team of [batting_team, bowling_team])
    names.push(...team.split(/\s+/).filter((w) => !names.includes(w)));

  return { ...base, numbers: [...numbers].sort((a, b) => a - b), names: [...new Set(names)] };
}

/** How far through the match ball i is: p over both innings, q within this one. */
export function progress(ticks: readonly CricketTick[], i: number): Progress {
  const s = ticks[i].state;
  const perInnings = s.balls_bowled + s.balls_left;
  const part = ticks[i].event.innings;
  const q = s.balls_bowled / perInnings;
  return { p: round1(((part - 1 + q) / 2) * 1000) / 1000, q: round1(q * 1000) / 1000, part };
}

/** Every player and team name in the match: the list rule R3 checks a card against. */
export function allNames(ticks: readonly CricketTick[], match: MatchInfo): string[] {
  const people = new Set<string>();
  for (const squad of Object.values(match.squads)) squad.forEach((n) => people.add(n));
  for (const t of ticks) {
    people.add(t.event.batter);
    people.add(t.event.bowler);
    people.add(t.event.non_striker);
    t.event.wicket?.fielders.forEach((f) => people.add(f));
  }
  const out = new Set<string>();
  for (const n of people) {
    out.add(n);
    const words = n.split(/\s+/);
    const last = words[words.length - 1];
    if (words.length > 1 && last.length >= 4) out.add(last);
  }
  for (const team of match.teams) {
    out.add(team.name);
    out.add(team.code);
  }
  return [...out];
}
