/**
 * The moment engine for cricket (docs/CARDS.md section 1). Walks the timeline once.
 * A ball that matches several rules gives one moment, with the first matching kind.
 */
import { barRank } from "@/lib/engine/alerts";
import type { Bar, Moment, MomentKind, Thresholds } from "@/lib/engine/types";
import { replayKind } from "./replayKind";
import { overLabel } from "./scoreboard";
import type { CricketTick } from "./types";

export const OVER_BIG_FACTOR = 1.5;

export type NewBatterEvent = { id: string; i: number; batter: string; over_label: string };

function levelOf(pct: number, t: Thresholds): Bar {
  if (pct >= t.alert.decider) return "decider";
  if (pct >= t.alert.big) return "big";
  return "notable";
}

/** Runs each batter has after each ball, so a 50 or 100 can be seen as it happens. */
function batterRunsBefore(ticks: readonly CricketTick[]): number[] {
  const totals = new Map<string, number>();
  return ticks.map((t) => {
    const key = `${t.event.innings}:${t.event.batter}`;
    const before = totals.get(key) ?? 0;
    totals.set(key, before + t.event.runs.bat);
    return before;
  });
}

export function detectMoments(ticks: readonly CricketTick[], thresholds: Thresholds): Moment[] {
  const min = thresholds.moment.min_swing;
  const runsBefore = batterRunsBefore(ticks);
  const moments: Moment[] = [];
  let overStart = 0; // index of the first ball of the current over
  let momentInOver = false;

  ticks.forEach((t, i) => {
    const e = t.event;
    const prev = ticks[i - 1]?.event;
    if (!prev || prev.over !== e.over || prev.innings !== e.innings) {
      overStart = i;
      momentInOver = false;
    }
    const next = ticks[i + 1]?.event;
    const lastOfMatch = !next;
    const lastOfInnings = !!next && next.innings !== e.innings;
    const lastOfOver = lastOfMatch || lastOfInnings || next.over !== e.over;
    const swing = t.wp.after - t.wp.before;
    const overMove = Math.abs(t.wp.after - ticks[overStart].wp.before);
    const after = runsBefore[i] + e.runs.bat;
    const milestone = [50, 100].some((m) => runsBefore[i] < m && after >= m);

    let kind: MomentKind | null = null;
    if (lastOfMatch) kind = "result";
    else if (lastOfInnings) kind = "innings_end";
    else if (e.wicket && (Math.abs(swing) >= min || t.stakes.pct >= thresholds.pulse.high))
      kind = "wicket_big";
    else if (lastOfOver && overMove >= OVER_BIG_FACTOR * min && !momentInOver) kind = "over_big";
    else if (Math.abs(swing) >= min) kind = "swing";
    else if (milestone) kind = "milestone";

    if (kind) {
      momentInOver = true;
      const whole = kind === "over_big" || kind === "innings_end" || kind === "result";
      moments.push({
        id: `m_${i}`,
        i,
        kind,
        level: levelOf(t.stakes.pct, thresholds),
        over_label: overLabel(e),
        swing: round4(kind === "over_big" ? t.wp.after - ticks[overStart].wp.before : swing),
        replay_kind: whole ? "none" : replayKind(e),
      });
    }
  });
  return moments;
}

/**
 * A lighter event that triggers a card but is not a shelf moment: the first ball faced
 * by a batter who came in after a wicket, when the stakes are at least "building".
 * At most one per wicket.
 */
export function detectNewBatters(
  ticks: readonly CricketTick[],
  thresholds: Thresholds,
): NewBatterEvent[] {
  const out: NewBatterEvent[] = [];
  const faced = new Set<string>();
  let wicketPending = false;
  ticks.forEach((t, i) => {
    const e = t.event;
    const key = `${e.innings}:${e.batter}`;
    const prev = ticks[i - 1]?.event;
    if (prev && prev.innings !== e.innings) wicketPending = false;
    if (!faced.has(key)) {
      faced.add(key);
      if (wicketPending) {
        wicketPending = false;
        if (t.stakes.pct >= thresholds.pulse.building) {
          out.push({ id: `nb_${i}`, i, batter: e.batter, over_label: overLabel(e) });
        }
      }
    }
    if (e.wicket) wicketPending = true;
  });
  return out;
}

export function momentRank(m: Moment): number {
  return barRank(m.level);
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
