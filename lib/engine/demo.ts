/**
 * The two-minute demo only moves the clock; it uses the same code paths as the product.
 * This picks where it starts: a moment the Pulse rises into, and the moment before it,
 * which the demo skips over so the shelf has one missed moment to show.
 */
import { isHot, pulseState } from "./pulse";
import type { Moment, Thresholds } from "./types";

export type DemoPlan = {
  /** The moment the fan watches arrive. */
  targetId: string;
  targetIndex: number;
  /** An earlier moment the demo jumps over, so it lands on the shelf as missed. */
  missId: string | null;
  missIndex: number | null;
};

/** The demo opens this long before the target moment's ball. */
export const DEMO_LEAD_MS = 50_000;

type TickLike = { stakes: { pct: number } };

export function pickDemo(
  ticks: readonly TickLike[],
  moments: readonly Moment[],
  thresholds: Pick<Thresholds, "pulse">,
): DemoPlan | null {
  const single = moments.filter((m) => m.replay_kind !== "none" && m.i >= 3);
  if (single.length === 0) return null;
  const hotAt = (i: number) => isHot(pulseState(ticks[i].stakes.pct, thresholds));
  // Best: the Pulse is quiet for the two balls before and hot on the ball itself, so the
  // fan sees it rise about one ball ahead.
  const rising = single.filter((m) => hotAt(m.i) && !hotAt(m.i - 1) && !hotAt(m.i - 2));
  const pool = rising.length > 0 ? rising : single;
  const target = pool.reduce((best, m) => (Math.abs(m.swing) > Math.abs(best.swing) ? m : best));
  const earlier = moments.filter((m) => m.i < target.i - 3 && m.replay_kind !== "none");
  const miss = earlier[earlier.length - 1] ?? null;
  return {
    targetId: target.id,
    targetIndex: target.i,
    missId: miss?.id ?? null,
    missIndex: miss?.i ?? null,
  };
}
