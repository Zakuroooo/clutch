/**
 * Facts, the LLM's output shape, and a stored card (docs/CARDS.md sections 2 and 4).
 * Facts are built by code from the timeline. Nothing else is given to the LLM, and the
 * check uses the same object.
 */
import { z } from "zod";
import { WorldSchema } from "@/lib/engine/types";

export const FACT_KINDS = [
  "result",
  "innings_end",
  "wicket_big",
  "over_big",
  "swing",
  "milestone",
  "new_batter",
] as const;
export const FactKindSchema = z.enum(FACT_KINDS);
export type FactKind = z.infer<typeof FactKindSchema>;

export const FactsSchema = z.object({
  moment_id: z.string(),
  kind: FactKindSchema,
  over_label: z.string(),
  batting_team: z.string(),
  bowling_team: z.string(),
  score_before: z.string(),
  score_after: z.string(),
  needed: z.number().nullable(),
  balls_left: z.number().nullable(),
  wickets_left: z.number(),
  batter: z.string().nullable(),
  bowler: z.string().nullable(),
  runs_off_ball: z.number(),
  wicket: z
    .object({ kind: z.string(), player_out: z.string(), fielder: z.string().nullable() })
    .nullable(),
  batter_runs: z.number().nullable(),
  batter_balls: z.number().nullable(),
  over_runs: z.number().nullable(),
  chance_team: z.string(),
  chance_before: z.number(),
  chance_after: z.number(),
  who_gained: z.string(),
  result: z.object({ winner: z.string(), margin: z.string() }).nullable(),
  new_batter: z
    .object({
      name: z.string(),
      matches: z.number(),
      strike_rate: z.number().nullable(),
      average: z.number().nullable(),
    })
    .nullable(),
  /** Every number that appears in any field above. */
  numbers: z.array(z.number()),
  /** Every person and team named above, plus surnames. */
  names: z.array(z.string()),
});
export type Facts = z.infer<typeof FactsSchema>;

/** Field names of Facts, for rule R8. */
export const FACT_FIELDS = Object.keys(FactsSchema.shape) as (keyof Facts)[];

/** What the LLM returns. Also the JSON schema in docs/CARDS.md section 4. */
export const CardTextSchema = z
  .object({
    headline: z.string().min(3).max(45),
    what: z.string().min(10).max(120),
    why: z.string().min(20).max(220),
    watch: z.string().max(90).nullable(),
    used_facts: z.array(z.string()).min(1),
  })
  .strict();
export type CardText = z.infer<typeof CardTextSchema>;

export const CARD_SOURCES = ["pregen", "cache", "live", "template"] as const;

/** A stored card: the text plus what code adds. */
export const CardSchema = z.object({
  moment_id: z.string(),
  world: WorldSchema,
  kind: FactKindSchema,
  headline: z.string(),
  what: z.string(),
  why: z.string(),
  watch: z.string().nullable(),
  source: z.enum(CARD_SOURCES),
  checked: z.literal(true),
  over_label: z.string(),
  chance_team: z.string(),
  chance_before: z.number(),
  chance_after: z.number(),
});
export type Card = z.infer<typeof CardSchema>;

export const CardsFileSchema = z.record(z.string(), CardSchema);
export type CardsFile = z.infer<typeof CardsFileSchema>;

export function cardKey(momentId: string, world: string): string {
  return `${momentId}:${world}`;
}

/** Share of the whole match and of the current part completed, for analogy anchors. */
export type Progress = { p: number; q: number; part: 1 | 2 };
