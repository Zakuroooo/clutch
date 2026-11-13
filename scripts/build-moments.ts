/**
 * Writes data/matches/<id>/moments.json for the replay match, using the same
 * detectMoments the app and the tests use. Run after `make export`.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadMatch, replayMatchId } from "@/lib/adapters/cricket/load";
import { detectMoments } from "@/lib/adapters/cricket/moments";

async function main() {
  const id = await replayMatchId();
  const { ticks, thresholds } = await loadMatch(id);
  const moments = detectMoments(ticks, thresholds);
  const file = path.join(process.cwd(), "data", "matches", id, "moments.json");
  await writeFile(file, JSON.stringify(moments, null, 2) + "\n");
  const kinds = moments.reduce<Record<string, number>>(
    (n, m) => ({ ...n, [m.kind]: (n[m.kind] ?? 0) + 1 }),
    {},
  );
  console.log(`wrote ${moments.length} moments to ${path.relative(process.cwd(), file)}`, kinds);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
