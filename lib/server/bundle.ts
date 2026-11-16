/**
 * The replay match as one object for the pages. Read from static files once and cached:
 * it is the same for every request until the next deploy.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  loadMatch,
  loadModelInfo,
  loadPulsePromise,
  replayMatchId,
} from "@/lib/adapters/cricket/load";
import { CardsFileSchema, type CardsFile } from "@/lib/cards/schema";
import type { MatchBundle } from "@/components/MatchProvider";

async function loadCards(matchId: string): Promise<CardsFile> {
  try {
    const file = path.join(process.cwd(), "data", "matches", matchId, "cards.json");
    return CardsFileSchema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch {
    return {}; // not generated yet: the app falls back to templates
  }
}

export async function getBundle(): Promise<MatchBundle> {
  "use cache";
  const id = await replayMatchId();
  const [data, cards, promise, model] = await Promise.all([
    loadMatch(id),
    loadCards(id),
    loadPulsePromise(),
    loadModelInfo(),
  ]);
  return { ...data, cards, promise, model };
}
