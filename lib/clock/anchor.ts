/**
 * The match clock (docs/TRD.md section 3). A session's clock is three numbers. Every
 * change (skip, speed, pause) writes a new anchor; there is never a second code path.
 * All functions are pure: `now` is always a parameter.
 */
export type Anchor = {
  /** Server time in ms when the anchor was set. */
  anchor_at: number;
  /** Match time at that instant. */
  anchor_elapsed_ms: number;
  /** 1 = real time, 0 = paused. */
  speed: number;
};

/** How far before a moment "skip" lands, so the fan sees the Pulse rise first. */
export const SKIP_LEAD_MS = 8_000;

export function elapsed(anchor: Anchor, now: number): number {
  return anchor.anchor_elapsed_ms + (now - anchor.anchor_at) * anchor.speed;
}

export function startAnchor(now: number, elapsedMs = 0, speed = 1): Anchor {
  return { anchor_at: now, anchor_elapsed_ms: elapsedMs, speed };
}

/** Jump to a match time, keeping the speed. */
export function skipTo(anchor: Anchor, now: number, elapsedMs: number): Anchor {
  return { anchor_at: now, anchor_elapsed_ms: elapsedMs, speed: anchor.speed };
}

/** Change speed from now on. Time before the change is unaffected. */
export function setSpeed(anchor: Anchor, now: number, speed: number): Anchor {
  return { anchor_at: now, anchor_elapsed_ms: elapsed(anchor, now), speed };
}

export function pause(anchor: Anchor, now: number): Anchor {
  return setSpeed(anchor, now, 0);
}

/**
 * The anchor that lands SKIP_LEAD_MS before the next moment after `elapsedMs`,
 * or null when there is none left. `momentTimes` are the moments' t_ms, ascending.
 */
export function nextMomentAnchor(
  anchor: Anchor,
  now: number,
  momentTimes: readonly number[],
): Anchor | null {
  const at = elapsed(anchor, now);
  const next = momentTimes.find((t) => t - SKIP_LEAD_MS > at);
  if (next === undefined) return null;
  return { anchor_at: now, anchor_elapsed_ms: next - SKIP_LEAD_MS, speed: anchor.speed || 1 };
}
