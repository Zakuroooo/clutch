/**
 * Card evals (docs/EVALS.md section 7).
 *
 *   npm run evals:check     no key, no network. Runs the adversarial set and re-checks
 *                           every recorded card for the replay match. Writes
 *                           evals/results/summary.json. Fails if a planted error passes,
 *                           a good card fails, or a recorded card fails the check.
 *   npm run evals:generate  needs an LLM key: this is `npm run pregen`.
 *   npm run evals:judge     the rubric judge. Designed, not built (cut order item 8).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { allNames, facts as buildFacts, progress } from "@/lib/adapters/cricket/facts";
import { loadMatch, replayMatchId } from "@/lib/adapters/cricket/load";
import { anchorsFor } from "@/lib/cards/anchors";
import { check } from "@/lib/cards/check";
import { PROMPT_VERSION } from "@/lib/cards/prompt";
import { cardKey, CardsFileSchema, type Facts } from "@/lib/cards/schema";
import { WORLDS, type World } from "@/lib/engine/types";

type Case = {
  id: string;
  must_fail: string | null;
  world: World;
  facts: Facts;
  anchors: Record<string, number>;
  match_names: string[];
  card: unknown;
};

async function runCheck() {
  const problems: string[] = [];
  const cases: Case[] = readFileSync(path.join("evals", "cases", "adversarial.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  let caught = 0;
  let goodPassed = 0;
  const planted = cases.filter((c) => c.must_fail);
  const good = cases.filter((c) => !c.must_fail);
  for (const c of cases) {
    const r = check(c.card, c.facts, c.anchors, c.world, c.match_names);
    if (c.must_fail) {
      if (!r.ok && r.rule === c.must_fail) caught += 1;
      else
        problems.push(
          `${c.id}: planted ${c.must_fail} error ${r.ok ? "passed the check" : `was caught by ${r.rule} instead`}`,
        );
    } else if (r.ok) goodPassed += 1;
    else problems.push(`${c.id}: a good card failed ${r.rule}: ${r.detail}`);
  }

  // Recorded cards for the replay match: every one must exist and pass the check again.
  const id = await replayMatchId();
  const { match, ticks, moments, newBatters, players } = await loadMatch(id);
  const file = path.join("data", "matches", id, "cards.json");
  const bySource: Record<string, number> = {};
  let checked = 0;
  if (!existsSync(file)) {
    problems.push(`no recorded cards for match ${id}; run \`npm run pregen\``);
  } else {
    const cards = CardsFileSchema.parse(JSON.parse(readFileSync(file, "utf8")));
    const names = allNames(ticks, match);
    for (const subject of [...moments, ...newBatters]) {
      const f = buildFacts(subject, ticks, match, players);
      for (const world of WORLDS) {
        const card = cards[cardKey(subject.id, world)];
        if (!card) {
          problems.push(`missing card ${subject.id}:${world}`);
          continue;
        }
        const anchors =
          card.world === "plain" ? {} : anchorsFor(card.world, progress(ticks, subject.i));
        const text = {
          headline: card.headline,
          what: card.what,
          why: card.why,
          watch: card.watch,
          used_facts: ["over_label"],
        };
        const r = check(text, f, anchors, card.world, names);
        checked += 1;
        bySource[card.source] = (bySource[card.source] ?? 0) + 1;
        if (!r.ok)
          problems.push(`recorded card ${subject.id}:${world} fails ${r.rule}: ${r.detail}`);
      }
    }
  }

  const logFile = path.join("evals", "results", "pregen_log.json");
  const pregen = existsSync(logFile) ? JSON.parse(readFileSync(logFile, "utf8")).summary : null;
  // The first full run against a real model: the honest first-pass rate. Later runs resume
  // and only retry cards that fell back to a template, so their own counts mostly say "kept".
  const runOneFile = path.join("evals", "results", "pregen_log_run1.json");
  const firstRun = existsSync(runOneFile)
    ? JSON.parse(readFileSync(runOneFile, "utf8")).summary
    : null;
  const summary = {
    prompt_version: PROMPT_VERSION,
    adversarial: {
      planted_errors: planted.length,
      caught,
      good_cards: good.length,
      good_passed: goodPassed,
    },
    recorded_cards: {
      match_id: id,
      checked,
      passing: checked - problems.filter((p) => p.startsWith("recorded card")).length,
      by_source: bySource,
    },
    pregen,
    first_run: firstRun,
    rubric: null,
    note:
      pregen?.provider === "none"
        ? "No LLM key was used: every recorded card is a template, so there is no LLM pass rate yet."
        : undefined,
  };
  await mkdir(path.join("evals", "results"), { recursive: true });
  await writeFile(
    path.join("evals", "results", "summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  console.log(JSON.stringify(summary, null, 2));
  if (problems.length) {
    console.error(`evals:check failed with ${problems.length} problem(s):`);
    problems.slice(0, 20).forEach((p) => console.error("  - " + p));
    process.exit(1);
  }
}

const mode = process.argv[2] ?? "check";
if (mode === "check") {
  runCheck().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (mode === "generate") {
  console.log(
    "evals:generate is `npm run pregen` with LLM_PROVIDER and LLM_API_KEY set in .env.local. Then run `npm run evals:check`.",
  );
} else {
  console.log(
    "evals:judge (the rubric judge) is designed in docs/EVALS.md section 5 and not built. Score the sample by hand with evals/rubric.md.",
  );
}
