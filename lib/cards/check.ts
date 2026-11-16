/**
 * The faithfulness check (docs/CARDS.md section 6). Runs on every card before anyone
 * sees it, templates included. It fails on the first rule broken. It is strict on
 * purpose: a false failure costs nothing (the fan gets a correct template); a false
 * pass shows a wrong fact.
 */
import { WORLDS, type World } from "@/lib/engine/types";
import type { Anchors } from "./anchors";
import { ABUSE, BANNED, DENY, FIXED_PHRASES, ORDINARY_CAPITALS, VOCAB } from "./lists";
import { CardTextSchema, FACT_FIELDS, type CardText, type Facts } from "./schema";

export type CheckResult = { ok: true } | { ok: false; rule: string; detail: string };

const fail = (rule: string, detail: string): CheckResult => ({ ok: false, rule, detail });
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A whole word or phrase, case-insensitive. */
export const wholeWord = (phrase: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escape(phrase)}(?![\\p{L}\\p{N}])`, "iu");

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100,
}; // prettier-ignore

const RESULT_WORDS = /\b(won|wins the match|have won|has won|victory is theirs)\b/i;
const AHEAD = ["on top", "in control", "favourites", "cruising", "ahead now", "take charge"];
const BEHIND = ["in trouble", "collapsing", "slipping", "lose their grip"];

function joined(card: CardText): string {
  return [card.headline, card.what, card.why, card.watch ?? ""].join(" ");
}

/** R2. Every number in the text must be in the facts or the anchors. */
function checkNumbers(text: string, facts: Facts, anchors: Anchors): CheckResult {
  const allowed = [...facts.numbers, ...Object.values(anchors)];
  const isAllowed = (n: number) => allowed.some((a) => Math.abs(a - n) <= 0.05);

  // A score such as "151/5" must be one of the two scores in the facts.
  for (const m of text.matchAll(/\d+\/\d+/g)) {
    if (m[0] !== facts.score_before && m[0] !== facts.score_after)
      return fail("R2", `score ${m[0]} is not in the facts`);
  }
  let rest = text.replace(/\d+\/\d+/g, " ");
  for (const phrase of FIXED_PHRASES)
    rest = rest.replace(new RegExp(wholeWord(phrase).source, "giu"), " ");

  for (const m of rest.matchAll(/\d+(?:\.\d+)?/g)) {
    if (!isAllowed(Number(m[0])))
      return fail("R2", `number ${m[0]} is not in the facts or anchors`);
  }
  // A name is not a number ("Six" as a surname), so names are set aside first.
  for (const name of facts.names)
    rest = rest.replace(new RegExp(wholeWord(name).source, "giu"), " ");
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (wholeWord(word).test(rest) && !isAllowed(value))
      return fail("R2", `"${word}" (${value}) is not in the facts or anchors`);
  }
  return { ok: true };
}

/** R3. A player or team from this match may be named only if the facts name them. */
function checkMatchNames(text: string, facts: Facts, matchNames: readonly string[]): CheckResult {
  const allowed = new Set(facts.names.map((n) => n.toLowerCase()));
  for (const name of matchNames) {
    if (allowed.has(name.toLowerCase())) continue;
    if (wholeWord(name).test(text)) return fail("R3", `${name} is not in this moment's facts`);
  }
  return { ok: true };
}

/** R4. No real people, clubs, films or games from the analogy world. */
function checkWorldNames(text: string, facts: Facts, world: World): CheckResult {
  // A deny-listed word that is also a person or team in this moment's facts is that
  // person, not the famous one ("Anand" can be a player in the match).
  const ownWords = new Set(facts.names.flatMap((n) => n.toLowerCase().split(/\s+/)));
  for (const w of WORLDS) {
    for (const entry of DENY[w]) {
      if (ownWords.has(entry.toLowerCase())) continue;
      if (wholeWord(entry).test(text)) return fail("R4", `"${entry}" is a real name from ${w}`);
    }
  }
  const known = new Set<string>(ORDINARY_CAPITALS.map((w) => w.toLowerCase()));
  for (const name of facts.names)
    for (const word of name.split(/\s+/)) known.add(word.toLowerCase());
  for (const entry of VOCAB[world])
    for (const word of entry.split(/\s+/)) known.add(word.toLowerCase());

  // Capitalised words that do not start a sentence.
  const sentences = text.split(/(?<=[.!?:])\s+/);
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).slice(1);
    for (const raw of words) {
      const word = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "").replace(/['’]s$/u, "");
      if (!word || !/^\p{Lu}/u.test(word)) continue;
      if (!known.has(word.toLowerCase()))
        return fail("R4", `"${word}" is a name that is not in the facts`);
    }
  }
  return { ok: true };
}

/** R5. A narrow, mechanical check that the direction is not reversed. */
function checkDirection(text: string, facts: Facts): CheckResult {
  const gained = facts.who_gained;
  const lost = gained === facts.batting_team ? facts.bowling_team : facts.batting_team;
  const near = (team: string, phrases: string[]) =>
    phrases.find((p) => new RegExp(`${escape(team)}.{0,40}?${escape(p)}`, "is").test(text));
  const wrongAhead = near(lost, AHEAD);
  if (wrongAhead) return fail("R5", `${lost} lost ground but the text says "${wrongAhead}"`);
  const wrongBehind = near(gained, BEHIND);
  if (wrongBehind) return fail("R5", `${gained} gained but the text says "${wrongBehind}"`);
  return { ok: true };
}

export function check(
  card: unknown,
  facts: Facts,
  anchors: Anchors,
  world: World,
  matchNames: readonly string[],
): CheckResult {
  // R1. Shape.
  const parsed = CardTextSchema.safeParse(card);
  if (!parsed.success) return fail("R1", parsed.error.issues[0]?.message ?? "wrong shape");
  const text = joined(parsed.data);

  const steps: (() => CheckResult)[] = [
    () => checkNumbers(text, facts, anchors),
    () => checkMatchNames(text, facts, matchNames),
    () => checkWorldNames(text, facts, world),
    () => checkDirection(text, facts),
    // R6. No result unless it is one.
    () =>
      facts.result === null && RESULT_WORDS.test(text)
        ? fail("R6", "says the match is won before it is")
        : { ok: true },
    // R7. Banned and abusive words.
    () => {
      const hit = [...BANNED, ...ABUSE].find((w) => wholeWord(w).test(text));
      return hit ? fail("R7", `banned word "${hit}"`) : { ok: true };
    },
    // R8. Used facts are real fields with a value.
    () => {
      const bad = parsed.data.used_facts.find(
        (f) => !FACT_FIELDS.includes(f as keyof Facts) || facts[f as keyof Facts] === null,
      );
      return bad
        ? fail("R8", `used_facts names "${bad}", which is not a fact with a value`)
        : { ok: true };
    },
    // R9. The analogy is one; a plain card is plain.
    () => {
      const why = parsed.data.why;
      if (world !== "plain") {
        return VOCAB[world].some((w) => wholeWord(w).test(why))
          ? { ok: true }
          : fail("R9", `the why line has no ${world} word`);
      }
      for (const other of WORLDS) {
        const hit = VOCAB[other].find((w) => wholeWord(w).test(why));
        if (hit) return fail("R9", `a plain card uses the ${other} word "${hit}"`);
      }
      return { ok: true };
    },
  ];
  for (const step of steps) {
    const result = step();
    if (!result.ok) return result;
  }
  return { ok: true };
}
