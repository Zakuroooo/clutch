/**
 * Pre-generates every card for the replay match (docs/CARDS.md section 5): each moment
 * and new-batter event x 6 worlds. Writes data/matches/<id>/cards.json and a log of how
 * each card was made. With LLM_PROVIDER=none it writes template cards and still succeeds.
 * It can resume: cards already written by the LLM for this prompt version are kept.
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { allNames, facts as buildFacts, progress } from "@/lib/adapters/cricket/facts";
import { loadMatch, replayMatchId } from "@/lib/adapters/cricket/load";
import { anchorsFor } from "@/lib/cards/anchors";
import { makeCard } from "@/lib/cards/generate";
import { PROMPT_VERSION } from "@/lib/cards/prompt";
import { cardKey, CardsFileSchema, type CardsFile } from "@/lib/cards/schema";
import { WORLDS } from "@/lib/engine/types";
import { getProvider } from "@/lib/llm";

const SLEEP_MS = Number(process.env.PREGEN_SLEEP_MS ?? 4500); // stay under a free-tier rate limit

async function main() {
  // tsx does not read .env.local; load it if present, without printing anything from it.
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const provider = getProvider();
  const id = await replayMatchId();
  const { match, ticks, moments, newBatters, players } = await loadMatch(id);
  const file = path.join(process.cwd(), "data", "matches", id, "cards.json");
  const names = allNames(ticks, match);

  let existing: CardsFile = {};
  if (provider && existsSync(file)) {
    const parsed = CardsFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
    if (parsed.success) existing = parsed.data;
  }

  const cards: CardsFile = {};
  const log: { moment_id: string; world: string; outcome: string; failed_rules: string[] }[] = [];
  const subjects = [...moments, ...newBatters].sort((a, b) => a.i - b.i);
  for (const subject of subjects) {
    const facts = buildFacts(subject, ticks, match, players);
    for (const world of WORLDS) {
      const key = cardKey(subject.id, world);
      const kept = existing[key];
      if (kept && kept.source === "pregen") {
        cards[key] = kept;
        log.push({ moment_id: subject.id, world, outcome: "kept", failed_rules: [] });
        continue;
      }
      const made = await makeCard({
        facts,
        world,
        anchors: anchorsFor(world, progress(ticks, subject.i)),
        matchNames: names,
        sport: match.sport,
        provider,
        source: "pregen",
      });
      cards[key] = made.card;
      log.push({
        moment_id: subject.id,
        world,
        outcome: made.outcome,
        failed_rules: made.attempts.filter((a) => !a.ok).map((a) => a.rule ?? "?"),
      });
      if (provider) {
        await writeFile(file, JSON.stringify(cards, null, 1) + "\n"); // so a stop can resume
        await new Promise((r) => setTimeout(r, SLEEP_MS));
      }
    }
  }

  await writeFile(file, JSON.stringify(cards, null, 1) + "\n");
  const count = (o: string) => log.filter((l) => l.outcome === o).length;
  const summary = {
    match_id: id,
    prompt_version: PROMPT_VERSION,
    provider: provider?.name ?? "none",
    cards: log.length,
    passed_first_try: count("first_try"),
    passed_on_retry: count("retry"),
    template: count("template"),
    kept_from_earlier_run: count("kept"),
  };
  await mkdir(path.join(process.cwd(), "evals", "results"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "evals", "results", "pregen_log.json"),
    JSON.stringify({ summary, cards: log }, null, 1) + "\n",
  );
  console.log(summary);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
