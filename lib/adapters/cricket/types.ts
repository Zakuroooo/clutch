/** The cricket-specific parts of a tick (docs/TRD.md section 2). */
import { z } from "zod";
import { MatchInfoSchema, StakesSchema, WinChanceSchema, type Tick } from "@/lib/engine/types";

export const WicketSchema = z.object({
  kind: z.string(),
  player_out: z.string(),
  fielders: z.array(z.string()),
});

export const CricketEventSchema = z.object({
  innings: z.union([z.literal(1), z.literal(2)]),
  over: z.number().int().min(0),
  ball: z.number().int().min(1),
  legal: z.boolean(),
  batter: z.string(),
  bowler: z.string(),
  non_striker: z.string(),
  runs: z.object({ bat: z.number(), extras: z.number(), total: z.number() }),
  extras_kind: z.string().nullable(),
  wicket: WicketSchema.nullable(),
});
export type CricketEvent = z.infer<typeof CricketEventSchema>;

export const CricketStateSchema = z.object({
  batting: z.string(),
  score: z.number().int(),
  wickets: z.number().int(),
  balls_bowled: z.number().int(),
  balls_left: z.number().int(),
  target: z.number().nullable(),
  needed: z.number().nullable(),
  crr: z.number(),
  rrr: z.number().nullable(),
});
export type CricketState = z.infer<typeof CricketStateSchema>;

export const CricketTickSchema = z.object({
  i: z.number().int(),
  t_ms: z.number(),
  event: CricketEventSchema,
  state: CricketStateSchema,
  wp: WinChanceSchema,
  stakes: StakesSchema,
});
export type CricketTick = Tick<CricketState, CricketEvent>;

export const TimelineSchema = z.object({
  match: MatchInfoSchema,
  events: z.array(CricketTickSchema),
});
export type Timeline = z.infer<typeof TimelineSchema>;

const Nullable = z.number().nullable();
export const PlayerSchema = z.object({
  id: z.string(),
  team: z.string(),
  jersey: z.number().nullable(),
  matches: z.number(),
  /** Player-of-the-match awards before this match. */
  player_of_match: z.number().default(0),
  batting: z.object({
    innings: z.number(),
    runs: z.number(),
    average: Nullable,
    strike_rate: Nullable,
    fifties: z.number(),
    hundreds: z.number().default(0),
    /** "63*" means not out. */
    highest: z.string().nullable().default(null),
    sixes: z.number(),
    chase_innings: z.number(),
    chase_average: Nullable,
    chase_fifties: z.number(),
    chase_not_outs: z.number(),
    death_strike_rate: Nullable,
  }),
  bowling: z.object({
    innings: z.number(),
    wickets: z.number(),
    /** Best figures in one innings, "4/19". */
    best: z.string().nullable().default(null),
    economy: Nullable,
    death_economy: Nullable,
  }),
});
export type Player = z.infer<typeof PlayerSchema>;

/** A player's full name and, when one is freely licensed, a photo with its credit. */
export const PersonSchema = z.object({
  full_name: z.string(),
  photo: z
    .object({ src: z.string(), author: z.string(), licence: z.string(), page: z.string() })
    .nullable(),
});
export type Person = z.infer<typeof PersonSchema>;
export const PeopleSchema = z.record(z.string(), PersonSchema);
export type People = z.infer<typeof PeopleSchema>;
export const PlayersSchema = z.record(z.string(), PlayerSchema);
export type Players = z.infer<typeof PlayersSchema>;
