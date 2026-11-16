/**
 * The card prompt (docs/CARDS.md section 4). The version is part of every cache key:
 * any change to the text below bumps it.
 */
import type { World } from "@/lib/engine/types";
import type { Anchors } from "./anchors";
import type { Facts } from "./schema";

export const PROMPT_VERSION = "p2";

export function systemPrompt(sport: string): string {
  return `You write one short explanation card for a casual fan watching a ${sport} match.
You are given FACTS as JSON. The facts are complete and correct.

Rules:
- Use only the FACTS. Do not add any number, name, record or history that is not in FACTS or ANCHORS.
- Every number you write must appear in FACTS.numbers or ANCHORS. Write numbers as digits.
- Name only people and teams in FACTS.names. Never name a real person, club, film or game from the analogy world; use roles ("your best striker").
- Keep the direction right: FACTS.who_gained is the side that is better off after this moment.
- No betting or gambling words. No insults.
- "headline": at most 45 characters. A spoken line that says what it means for the match. End with a full stop.
- "what": one sentence of plain fact, at most 120 characters.
- "why": at most 220 characters. If WORLD is not "plain", explain why this matters as an analogy from WORLD, using ANCHORS where a number helps. If WORLD is "plain", explain it in everyday words with no ${sport} jargon. If WORLD is "hinglish", write every field in natural Hinglish (Hindi and English mixed, Roman script, the way friends talk), with no analogy.
- "watch": one thing to look for next, at most 90 characters, or null.
- "used_facts": the names of the FACTS fields you relied on.
Return only JSON matching the schema.`;
}

export function userPrompt(world: World, anchors: Anchors, facts: Facts): string {
  return `WORLD: ${world}\nANCHORS: ${JSON.stringify(anchors)}\nFACTS: ${JSON.stringify(facts)}`;
}

export const CARD_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "what", "why", "watch", "used_facts"],
  properties: {
    headline: { type: "string", minLength: 3, maxLength: 45 },
    what: { type: "string", minLength: 10, maxLength: 120 },
    why: { type: "string", minLength: 20, maxLength: 220 },
    watch: { type: ["string", "null"], maxLength: 90 },
    used_facts: { type: "array", minItems: 1, items: { type: "string" } },
  },
};

export const CARD_PARAMS = { maxTokens: 300, temperature: 0.7 };
