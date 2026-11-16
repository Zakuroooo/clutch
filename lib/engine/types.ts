/**
 * Shapes shared by the engine and every sport adapter (docs/TRD.md sections 2 and 4).
 * Nothing here knows which sport is being played: `state` and `event` belong to the adapter.
 */
import { z } from "zod";

export const StakesSchema = z.object({ raw: z.number(), pct: z.number().min(0).max(100) });
export type Stakes = z.infer<typeof StakesSchema>;

export const WinChanceSchema = z.object({
  team: z.string(),
  before: z.number().min(0).max(1),
  after: z.number().min(0).max(1),
});
export type WinChance = z.infer<typeof WinChanceSchema>;

export type Tick<S, E> = {
  i: number;
  t_ms: number;
  /** After the event. */
  state: S;
  event: E;
  /** What was at risk on this event, computed from the state before it. */
  stakes: Stakes;
  /** Win chance of the team that went first, before and after the event. */
  wp: WinChance;
};

/** The parts of a tick the engine itself reads. */
export type AnyTick = Tick<unknown, unknown>;

export const TeamSchema = z.object({
  code: z.string(),
  name: z.string(),
  colors: z.tuple([z.string(), z.string()]),
});
export type Team = z.infer<typeof TeamSchema>;

export const MatchInfoSchema = z.object({
  id: z.string(),
  sport: z.string(),
  format: z.string(),
  date: z.string(),
  venue: z.string().nullable(),
  city: z.string().nullable().optional(),
  event: z.object({ name: z.string().nullable(), stage: z.string().nullable() }),
  teams: z.tuple([TeamSchema, TeamSchema]),
  batting_order: z.tuple([z.string(), z.string()]),
  result: z.object({ winner: z.string(), by: z.record(z.string(), z.number()).nullable() }),
  squads: z.record(z.string(), z.array(z.string())),
  source: z.string(),
  licence: z.string(),
});
export type MatchInfo = z.infer<typeof MatchInfoSchema>;

export const ThresholdsSchema = z.object({
  fitted_on: z.literal("train"),
  fitted_at: z.string(),
  pulse: z.object({ building: z.number(), high: z.number(), decider: z.number() }),
  alert: z.object({
    notable: z.number(),
    big: z.number(),
    decider: z.number(),
    cooldown_balls: z.number(),
  }),
  moment: z.object({ min_swing: z.number() }),
});
export type Thresholds = z.infer<typeof ThresholdsSchema>;

export const BARS = ["notable", "big", "decider"] as const;
export const BarSchema = z.enum(BARS);
export type Bar = z.infer<typeof BarSchema>;

export const AlertSchema = z.object({ i: z.number().int(), bar: BarSchema, line: z.string() });
export type Alert = z.infer<typeof AlertSchema>;

export const REPLAY_KINDS = [
  "dot",
  "runs",
  "four",
  "six",
  "bowled",
  "caught",
  "lbw",
  "run_out",
  "stumped",
  "wide",
  "no_ball",
  "none",
] as const;
export const ReplayKindSchema = z.enum(REPLAY_KINDS);
export type ReplayKind = z.infer<typeof ReplayKindSchema>;

export const MOMENT_KINDS = [
  "result",
  "innings_end",
  "wicket_big",
  "over_big",
  "swing",
  "milestone",
] as const;
export const MomentKindSchema = z.enum(MOMENT_KINDS);
export type MomentKind = z.infer<typeof MomentKindSchema>;

export const MomentSchema = z.object({
  id: z.string(),
  i: z.number().int(),
  kind: MomentKindSchema,
  level: BarSchema,
  over_label: z.string(),
  /** wp.after - wp.before for the team that went first. */
  swing: z.number(),
  replay_kind: ReplayKindSchema,
});
export type Moment = z.infer<typeof MomentSchema>;

export const WORLDS = [
  "football",
  "f1",
  "chess",
  "bollywood",
  "gaming",
  "hinglish",
  "plain",
] as const;

/** Worlds with no analogy: the card says it straight, in English or in Hinglish. */
export const PLAIN_WORLDS: readonly string[] = ["plain", "hinglish"];
export const WorldSchema = z.enum(WORLDS);
export type World = z.infer<typeof WorldSchema>;

export type ScoreboardView = {
  rows: { team: string; main: string; sub: string; side: string; batting: boolean }[];
  /** "26 runs needed from 23 balls" / "5 wickets left" */
  chase?: { left: string; right: string };
};
