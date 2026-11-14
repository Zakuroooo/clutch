/**
 * A small match for unit tests: 2 innings of 3 overs, written by hand so every value can
 * be checked by eye. Win chances and stakes are made up; they are not model output.
 *
 * Alphas (AAA) bat first: 30/2.  Bravos (BBB) chase 31 and win off the last ball.
 */
import type { Alert, MatchInfo, Thresholds } from "@/lib/engine/types";
import type { CricketEvent, CricketTick } from "@/lib/adapters/cricket/types";

type Ball = {
  bat?: number;
  /** A wide: one extra run, not a legal ball. */
  wide?: boolean;
  out?: { kind: string; who: string; fielders?: string[] };
  /** Win chance of AAA after the ball. */
  wp: number;
  /** stakes.pct of the ball; 20 unless set. */
  pct?: number;
  batter: string;
};

const BALLS_PER_INNINGS = 18;

// prettier-ignore
const INNINGS_1: Ball[][] = [
  [
    { batter: "A Arlow", bat: 1, wp: 0.51 },
    { batter: "A Bexley", bat: 4, wp: 0.55 },
    { batter: "A Bexley", wide: true, wp: 0.55 },
    { batter: "A Bexley", bat: 0, wp: 0.54 },
    { batter: "A Bexley", out: { kind: "bowled", who: "A Bexley" }, wp: 0.42, pct: 75 },
    { batter: "A Catto", bat: 6, wp: 0.5, pct: 60 },
    { batter: "A Catto", bat: 2, wp: 0.51 },
  ],
  [
    { batter: "A Arlow", bat: 0, wp: 0.5 },
    { batter: "A Arlow", bat: 1, wp: 0.47 },
    { batter: "A Catto", bat: 1, wp: 0.44 },
    { batter: "A Arlow", bat: 0, wp: 0.42 },
    { batter: "A Arlow", bat: 4, wp: 0.38 },
    { batter: "A Arlow", bat: 0, wp: 0.35 },
  ],
  [
    { batter: "A Catto", bat: 6, wp: 0.42 },
    { batter: "A Catto", bat: 1, wp: 0.42 },
    { batter: "A Arlow", out: { kind: "caught", who: "A Arlow", fielders: ["B Glover"] }, wp: 0.3 },
    { batter: "A Dovey", bat: 0, wp: 0.29, pct: 10 },
    { batter: "A Dovey", bat: 2, wp: 0.3 },
    { batter: "A Catto", bat: 1, wp: 0.3 },
  ],
];

// prettier-ignore
const INNINGS_2: Ball[][] = [
  [
    { batter: "B Kemble", bat: 4, wp: 0.24 },
    { batter: "B Kemble", bat: 0, wp: 0.25 },
    { batter: "B Kemble", bat: 1, wp: 0.25 },
    { batter: "B Lomax", bat: 6, wp: 0.13 },
    { batter: "B Lomax", bat: 0, wp: 0.14 },
    { batter: "B Lomax", bat: 1, wp: 0.14 },
  ],
  [
    { batter: "B Lomax", out: { kind: "lbw", who: "B Lomax" }, wp: 0.28, pct: 80 },
    { batter: "B Marlow", bat: 0, wp: 0.3, pct: 72 },
    { batter: "B Marlow", bat: 2, wp: 0.28 },
    { batter: "B Marlow", bat: 1, wp: 0.27 },
    { batter: "B Kemble", bat: 0, wp: 0.3 },
    { batter: "B Kemble", bat: 4, wp: 0.24 },
  ],
  [
    { batter: "B Marlow", bat: 1, wp: 0.22, pct: 95 },
    { batter: "B Kemble", bat: 6, wp: 0.08, pct: 95 },
    { batter: "B Kemble", out: { kind: "run out", who: "B Kemble" }, wp: 0.26, pct: 95 },
    { batter: "B Nesbit", bat: 2, wp: 0.22, pct: 95 },
    { batter: "B Nesbit", bat: 1, wp: 0.2, pct: 95 },
    { batter: "B Marlow", bat: 4, wp: 0, pct: 100 },
  ],
];

export const fixtureMatch: MatchInfo = {
  id: "fixture",
  sport: "cricket",
  format: "T3",
  date: "2026-01-01",
  venue: "Fixture Ground",
  city: "Testville",
  event: { name: "Fixture Cup", stage: "Final" },
  teams: [
    { code: "AAA", name: "Alphas", colors: ["#2f6fe0", "#1b3f9c"] },
    { code: "BBB", name: "Bravos", colors: ["#1f9d55", "#0d5c30"] },
  ],
  batting_order: ["AAA", "BBB"],
  result: { winner: "BBB", by: { wickets: 8 } },
  squads: {
    AAA: ["A Arlow", "A Bexley", "A Catto", "A Dovey", "A Zoller"],
    BBB: ["B Kemble", "B Lomax", "B Marlow", "B Nesbit", "B Glover", "B Yarrow"],
  },
  source: "hand-written fixture",
  licence: "none",
};

export const fixtureThresholds: Thresholds = {
  fitted_on: "train",
  fitted_at: "2026-01-01",
  pulse: { building: 50, high: 70, decider: 90 },
  alert: { notable: 50, big: 70, decider: 90, cooldown_balls: 6 },
  moment: { min_swing: 0.1 },
};

/** Replay gaps from docs/TRD.md section 3.1. */
function gapAfter(prev: CricketTick, next: CricketEvent): number {
  if (next.innings !== prev.event.innings) return 120_000;
  let gap = 30_000;
  if (next.over !== prev.event.over) gap += 45_000;
  if (prev.event.wicket) gap += 60_000;
  return gap;
}

function build(): CricketTick[] {
  const ticks: CricketTick[] = [];
  let wp = 0.5;
  let target: number | null = null;
  [INNINGS_1, INNINGS_2].forEach((overs, k) => {
    const innings = (k + 1) as 1 | 2;
    const batting = fixtureMatch.batting_order[k];
    let score = 0;
    let wickets = 0;
    let bowled = 0;
    overs.forEach((balls, over) => {
      let legalInOver = 0;
      for (const b of balls) {
        const legal = !b.wide;
        const total = b.wide ? 1 : (b.bat ?? 0);
        const event: CricketEvent = {
          innings,
          over,
          ball: legalInOver + 1,
          legal,
          batter: b.batter,
          bowler: innings === 1 ? "B Yarrow" : "A Zoller",
          non_striker: "–",
          runs: { bat: b.wide ? 0 : (b.bat ?? 0), extras: b.wide ? 1 : 0, total },
          extras_kind: b.wide ? "wides" : null,
          wicket: b.out
            ? { kind: b.out.kind, player_out: b.out.who, fielders: b.out.fielders ?? [] }
            : null,
        };
        if (legal) legalInOver += 1;
        score += total;
        wickets += b.out ? 1 : 0;
        bowled += legal ? 1 : 0;
        const left = BALLS_PER_INNINGS - bowled;
        const needed = target === null ? null : Math.max(target - score, 0);
        const prev = ticks[ticks.length - 1];
        ticks.push({
          i: ticks.length,
          t_ms: prev ? prev.t_ms + gapAfter(prev, event) : 0,
          event,
          state: {
            batting,
            score,
            wickets,
            balls_bowled: bowled,
            balls_left: left,
            target,
            needed,
            crr: bowled ? Math.round((score * 600) / bowled) / 100 : 0,
            rrr: needed === null || left === 0 ? null : Math.round((needed * 600) / left) / 100,
          },
          wp: { team: "AAA", before: wp, after: b.wp },
          stakes: { raw: (b.pct ?? 20) / 100, pct: b.pct ?? 20 },
        });
        wp = b.wp;
      }
    });
    if (innings === 1) target = score + 1;
  });
  return ticks;
}

export const fixtureTicks: CricketTick[] = build();
export const fixtureTimes: number[] = fixtureTicks.map((t) => t.t_ms);

/** Hand-placed call-backs: one of each bar. */
export const fixtureAlerts: Alert[] = [
  { i: 4, bar: "big", line: "Big moment coming" },
  { i: 5, bar: "notable", line: "Worth a look" },
  { i: 25, bar: "big", line: "Big moment coming" },
  { i: 31, bar: "decider", line: "This over can decide it" },
];
