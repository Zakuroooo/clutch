/**
 * Writes evals/cases/adversarial.jsonl: 30 cards with one planted error each, and 10
 * good cards that must pass, so the check cannot pass by rejecting everything.
 * Built from the hand-written fixture match so the facts are easy to verify by eye.
 * Run: npx tsx evals/make_adversarial.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { allNames, facts as buildFacts, progress } from "@/lib/adapters/cricket/facts";
import { detectMoments, detectNewBatters } from "@/lib/adapters/cricket/moments";
import { anchorsFor } from "@/lib/cards/anchors";
import type { CardText } from "@/lib/cards/schema";
import { plainTemplate, templateCard } from "@/lib/cards/templates";
import type { World } from "@/lib/engine/types";
import { fixtureMatch, fixtureThresholds, fixtureTicks } from "@/lib/testing/fixture-match";

const moments = detectMoments(fixtureTicks, fixtureThresholds);
const newBatters = detectNewBatters(fixtureTicks, fixtureThresholds);
const matchNames = allNames(fixtureTicks, fixtureMatch);
const factsOf = (id: string) => {
  const m = moments.find((x) => x.id === id) ?? newBatters.find((x) => x.id === id)!;
  return { f: buildFacts(m, fixtureTicks, fixtureMatch), i: m.i };
};

// The base case: ball 25, B Lomax lbw in the chase. Bravos 12/0 -> 12/1, need 19 from 11.
// Bravos' chance 86 -> 72. Football anchors: minute 62.
const { f: F, i } = factsOf("m_25");
const A = anchorsFor("football", progress(fixtureTicks, i));
const GOOD: CardText = {
  headline: "Bravos lose their opener.",
  what: "B Lomax is out lbw for 7 off 4 balls. Bravos are 12/1.",
  why: "It is like losing your striker to a red card at minute 62. Bravos still lead, but Alphas have the momentum.",
  watch: "Bravos need 19 from 11 balls.",
  used_facts: ["wicket", "batter_runs", "needed"],
};

type Case = {
  id: string;
  must_fail: string | null;
  note: string;
  world: World;
  facts: unknown;
  anchors: unknown;
  match_names: string[];
  card: unknown;
};
const cases: Case[] = [];
let n = 0;
const bad = (
  rule: string,
  note: string,
  change: Partial<Record<keyof CardText, unknown>>,
  world: World = "football",
) =>
  cases.push({
    id: `a${String(++n).padStart(2, "0")}`,
    must_fail: rule,
    note,
    world,
    facts: F,
    anchors: world === "football" ? A : {},
    match_names: matchNames,
    card: { ...GOOD, ...change },
  });

// R1: shape
bad("R1", "headline over 45 characters", {
  headline: "Bravos lose their opener at the worst possible time.",
});
bad("R1", "why under 20 characters", { why: "A red card." });
bad("R1", "used_facts is empty", { used_facts: [] });
// R2: numbers
bad("R2", "a wrong score", { what: "B Lomax is out lbw for 7 off 4 balls. Bravos are 13/1." });
bad("R2", "a number off by one", { watch: "Bravos need 20 from 11 balls." });
bad("R2", "a number written as a word", { watch: "Bravos need nineteen from just eight balls." });
bad("R2", "an invented minute", {
  why: "It is like losing your striker to a red card at minute 88. Alphas have the momentum.",
});
bad("R2", "a wrong percentage", {
  why: "It is like a red card for your striker. Bravos fell from 90 to 72 out of 100.",
});
// R3: names from this match
bad("R3", "a different player from the same match", {
  what: "B Kemble is out lbw for 7 off 4 balls. Bravos are 12/1.",
});
bad("R3", "another player's surname", { headline: "Marlow falls, Bravos wobble." });
bad("R3", "a player from the other side", {
  why: "It is like a red card for your striker at minute 62, and A Catto made it happen for Alphas.",
});
// R4: real people and unknown names from the world
bad("R4", "a famous footballer", {
  why: "It is like losing Messi to a red card at minute 62. Alphas have the momentum.",
});
bad("R4", "a real club", {
  why: "It is like Real Madrid losing a striker to a red card at minute 62.",
});
bad("R4", "an unknown capitalised name", {
  why: "It is like a red card for your striker at Wembley in minute 62. Alphas gain.",
});
bad("R4", "a real team from another world", {
  why: "It is like a striker sent off at minute 62, or Ferrari losing a wheel.",
});
// R5: direction
bad("R5", "the side that lost ground is 'in control'", {
  why: "A red card for the other striker at minute 62. Bravos are in control now.",
});
bad("R5", "the side that lost ground is 'cruising'", {
  headline: "Bravos are cruising.",
  why: "Like a red card for the other striker at minute 62 of a football game.",
});
bad("R5", "the side that gained is 'in trouble'", {
  why: "A red card for a striker at minute 62. Alphas are in trouble after this.",
});
// R6: result before the end
bad("R6", "'have won' before the end", {
  why: "A red card for your striker at minute 62. Alphas have won this one already.",
});
bad("R6", "'wins the match'", {
  headline: "This wins the match.",
  why: "Like a red card for your striker at minute 62 of a football game.",
});
bad("R6", "'won'", { watch: "Bravos need 19 from 11 balls, or it is won." });
// R7: banned words
bad("R7", "a betting word", {
  why: "A red card for your striker at minute 62. The odds have moved to Alphas.",
});
bad("R7", "another betting word", { watch: "Bravos need 19 from 11 balls. Safe bet?" });
bad("R7", "an insult", {
  why: "A red card for your striker at minute 62. Bravos batted like idiots there.",
});
// R8: used facts
bad("R8", "a field that does not exist", { used_facts: ["wicket", "career_average"] });
bad("R8", "a field that is null for this moment", { used_facts: ["result"] });
bad("R8", "another null field", { used_facts: ["wicket", "new_batter"] });
// R9: the analogy is one
bad("R9", "a football card with no football in it", {
  why: "Bravos still lead on the day, but Alphas have the momentum after that ball.",
});
bad(
  "R9",
  "a plain card using football words",
  { why: "It is like losing your striker to a red card. Alphas have the momentum." },
  "plain",
);
bad(
  "R9",
  "a plain card using a racing phrase",
  { why: "It is like a slow pit stop at the worst time. Alphas have the momentum." },
  "plain",
);

// Ten good cards.
const good = (
  note: string,
  world: World,
  id: string,
  card: CardText,
  anchors: unknown,
  facts: unknown,
) =>
  cases.push({
    id: `g${String(cases.filter((c) => !c.must_fail).length + 1).padStart(2, "0")}`,
    must_fail: null,
    note: `${note} (${id})`,
    world,
    facts,
    anchors,
    match_names: matchNames,
    card,
  });
good("hand-written football card", "football", "m_25", GOOD, A, F);
good(
  "hand-written plain card",
  "plain",
  "m_25",
  {
    headline: "Bravos lose a wicket.",
    what: "B Lomax is out lbw. Bravos are 12/1 and still need 19.",
    why: "Bravos were well ahead. Their chance of winning drops from 86 to 72 out of 100 because a batter is gone.",
    watch: null,
    used_facts: ["wicket", "needed", "chance_before", "chance_after"],
  },
  {},
  F,
);
const picks: [string, World][] = [
  ["m_4", "plain"], ["m_12", "f1"], ["m_18", "bollywood"], ["m_22", "chess"],
  ["m_32", "gaming"], ["m_33", "football"], ["m_36", "f1"], ["nb_26", "plain"],
]; // prettier-ignore
for (const [id, world] of picks) {
  const { f, i: at } = factsOf(id);
  const anchors = anchorsFor(world, progress(fixtureTicks, at));
  const t = world === "plain" ? { card: plainTemplate(f), world } : templateCard(f, world, anchors);
  good("template", t.world, id, t.card, t.world === "plain" ? {} : anchors, f);
}

const file = path.join(process.cwd(), "evals", "cases", "adversarial.jsonl");
writeFileSync(file, cases.map((c) => JSON.stringify(c)).join("\n") + "\n");
console.log(
  `wrote ${cases.length} cases (${cases.filter((c) => c.must_fail).length} planted errors, ${cases.filter((c) => !c.must_fail).length} good)`,
);
