/**
 * Facts in, one checked card out. The LLM (if there is one) gets two tries; a card that
 * fails the check is never returned. The fallback is the template, which is also checked.
 */
import type { LlmProvider } from "@/lib/llm";
import type { World } from "@/lib/engine/types";
import type { Anchors } from "./anchors";
import { check } from "./check";
import { CARD_JSON_SCHEMA, CARD_PARAMS, systemPrompt, userPrompt } from "./prompt";
import type { Card, CardText, Facts } from "./schema";
import { plainTemplate, templateCard } from "./templates";

export type Attempt = { ok: boolean; rule?: string; detail?: string };
export type Made = { card: Card; attempts: Attempt[]; outcome: "first_try" | "retry" | "template" };

function stored(text: CardText, facts: Facts, world: World, source: Card["source"]): Card {
  return {
    moment_id: facts.moment_id,
    world,
    kind: facts.kind,
    headline: text.headline,
    what: text.what,
    why: text.why,
    watch: text.watch,
    source,
    checked: true,
    over_label: facts.over_label,
    chance_team: facts.chance_team,
    chance_before: facts.chance_before,
    chance_after: facts.chance_after,
  };
}

/** The template for this world, checked. Falls back to the plain one, which must pass. */
export function templateFor(
  facts: Facts,
  world: World,
  anchors: Anchors,
  matchNames: readonly string[],
): Card {
  const t = templateCard(facts, world, anchors);
  if (check(t.card, facts, t.world === "plain" ? {} : anchors, t.world, matchNames).ok) {
    return stored(t.card, facts, t.world, "template");
  }
  const plain = plainTemplate(facts);
  const result = check(plain, facts, {}, "plain", matchNames);
  if (!result.ok)
    throw new Error(
      `plain template failed the check for ${facts.moment_id}: ${result.rule} ${result.detail}`,
    );
  return stored(plain, facts, "plain", "template");
}

export async function makeCard(args: {
  facts: Facts;
  world: World;
  anchors: Anchors;
  matchNames: readonly string[];
  sport: string;
  provider: LlmProvider | null;
  /** "pregen" when run by the script, "live" when run by the route. */
  source?: "pregen" | "live";
}): Promise<Made> {
  const { facts, world, anchors, matchNames, provider } = args;
  const attempts: Attempt[] = [];
  if (provider) {
    for (let k = 0; k < 2; k++) {
      try {
        const raw = await provider.generateJson({
          system: systemPrompt(args.sport),
          user: userPrompt(world, anchors, facts),
          schema: CARD_JSON_SCHEMA,
          ...CARD_PARAMS,
        });
        const result = check(raw, facts, anchors, world, matchNames);
        if (result.ok) {
          attempts.push({ ok: true });
          return {
            card: stored(raw as CardText, facts, world, args.source ?? "live"),
            attempts,
            outcome: k === 0 ? "first_try" : "retry",
          };
        }
        attempts.push({ ok: false, rule: result.rule, detail: result.detail });
      } catch (err) {
        attempts.push({
          ok: false,
          rule: "error",
          detail: err instanceof Error ? err.message : "unknown error",
        });
      }
    }
  }
  return { card: templateFor(facts, world, anchors, matchNames), attempts, outcome: "template" };
}
