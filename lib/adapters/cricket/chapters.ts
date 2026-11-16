/**
 * Chapters to jump to, named so they give nothing away: where each part of the match
 * starts, never what happens in it.
 */
import type { MatchInfo } from "@/lib/engine/types";
import { shortName } from "./scoreboard";
import type { CricketTick } from "./types";

export type Chapter = { label: string; sub: string; i: number };

/** Jump this long before the chapter's first ball, so the fan sees it start. */
export const CHAPTER_LEAD_MS = 20_000;

export function chapters(ticks: readonly CricketTick[], match: MatchInfo): Chapter[] {
  const [first, second] = match.batting_order;
  const out: Chapter[] = [];
  const start1 = ticks.findIndex((t) => t.event.innings === 1);
  if (start1 >= 0)
    out.push({ label: "The start", sub: `${shortName(match, first)} bat first`, i: start1 });
  const start2 = ticks.findIndex((t) => t.event.innings === 2);
  if (start2 >= 0)
    out.push({
      label: "The chase",
      sub: `${shortName(match, second)} go after the target`,
      i: start2,
    });
  const death = ticks.findIndex((t) => t.event.innings === 2 && t.event.over === 15);
  if (death >= 0)
    out.push({ label: "The last five overs", sub: "Where T20 matches are usually won", i: death });
  return out;
}
