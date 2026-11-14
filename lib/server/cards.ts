/**
 * Card lookup for the route (docs/TRD.md section 5): cards.json, then the in-memory
 * cache, then the LLM plus the check, then the template. Never an unchecked card.
 */
import { allNames, facts as buildFacts, progress } from "@/lib/adapters/cricket/facts";
import { anchorsFor } from "@/lib/cards/anchors";
import { makeCard } from "@/lib/cards/generate";
import { PROMPT_VERSION } from "@/lib/cards/prompt";
import { cardKey, type Card } from "@/lib/cards/schema";
import type { World } from "@/lib/engine/types";
import type { LlmProvider } from "@/lib/llm";
import type { MatchBundle } from "@/components/MatchProvider";

const memory = new Map<string, Card>();

export function clearCardCache() {
  memory.clear();
}

export async function cardFor(
  bundle: MatchBundle,
  momentId: string,
  world: World,
  provider: LlmProvider | null,
): Promise<Card | null> {
  const pregen = bundle.cards[cardKey(momentId, world)];
  if (pregen) return pregen;

  const key = `card:${bundle.match.id}:${momentId}:${world}:${PROMPT_VERSION}`;
  const cached = memory.get(key);
  if (cached) return { ...cached, source: "cache" };

  const subject =
    bundle.moments.find((m) => m.id === momentId) ??
    bundle.newBatters.find((n) => n.id === momentId);
  if (!subject) return null;
  const facts = buildFacts(subject, bundle.ticks, bundle.match, bundle.players);
  const made = await makeCard({
    facts,
    world,
    anchors: anchorsFor(world, progress(bundle.ticks, subject.i)),
    matchNames: allNames(bundle.ticks, bundle.match),
    sport: bundle.match.sport,
    provider,
    source: "live",
  });
  if (made.outcome === "template" && made.attempts.length > 0) {
    // Server log: the moment id and the rule, never a key or a user's text.
    console.warn(
      `card fell back to template: ${momentId} ${world} ${made.attempts.map((a) => a.rule).join(",")}`,
    );
  }
  memory.set(key, made.card);
  return made.card;
}
