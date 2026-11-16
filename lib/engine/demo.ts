/**
 * The two-minute demo only moves the clock; it uses the same code paths as the product.
 * This picks where it starts: a moment the Pulse rises into, the calm ball the demo opens
 * on, and an earlier moment the demo skips over so the shelf has one missed moment to show.
 */
import { isHot, pulseState } from "./pulse";
import type { Moment, Thresholds } from "./types";

export type DemoPlan = {
  /** The moment the fan watches arrive. */
  targetId: string;
  targetIndex: number;
  /** The demo opens just before this ball, while the Pulse is still calm. */
  startIndex: number;
  /** An earlier moment the demo jumps over, so it lands on the shelf as missed. */
  missId: string | null;
  missIndex: number | null;
};

/** The demo opens this long before its first ball. */
export const DEMO_LEAD_MS = 8_000;
/** How many balls before the target the Pulse may still be calm. */
const RISE_WINDOW = 2;

type TickLike = { stakes: { pct: number } };

export function pickDemo(
  ticks: readonly TickLike[],
  moments: readonly Moment[],
  thresholds: Pick<Thresholds, "pulse">,
): DemoPlan | null {
  const single = moments.filter((m) => m.replay_kind !== "none" && m.i >= 3);
  if (single.length === 0) return null;
  const hotAt = (i: number) => isHot(pulseState(ticks[i].stakes.pct, thresholds));
  /** The latest calm ball within RISE_WINDOW before the target, or null if none. */
  const calmBefore = (m: Moment) => {
    for (let k = 1; k <= RISE_WINDOW; k++) if (!hotAt(m.i - k)) return m.i - k;
    return null;
  };
  const hasEarlier = (t: Moment) => moments.some((m) => m.i < t.i - 3 && m.replay_kind !== "none");
  const rising = single.filter((m) => hotAt(m.i) && calmBefore(m) !== null);
  // A rise into the moment, with a moment before it to miss, beats a rise without one,
  // which beats no rise at all. Within a tier, the biggest swing wins.
  const tiers = [rising.filter(hasEarlier), single.filter(hasEarlier), rising, single];
  const pool = tiers.find((t) => t.length > 0)!;
  const target = pool.reduce((best, m) => (Math.abs(m.swing) > Math.abs(best.swing) ? m : best));
  const earlier = moments.filter((m) => m.i < target.i - 3 && m.replay_kind !== "none");
  const miss = earlier[earlier.length - 1] ?? null;
  return {
    targetId: target.id,
    targetIndex: target.i,
    startIndex: calmBefore(target) ?? Math.max(0, target.i - 1),
    missId: miss?.id ?? null,
    missIndex: miss?.i ?? null,
  };
}
