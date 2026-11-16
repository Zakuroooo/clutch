/**
 * Who owns the clock when there is a match video (docs/TRD.md section 3.6).
 *
 * - Tab visible and the player is ready: the video leads. The anchor is re-based whenever
 *   the player's time or speed drifts from the clock by more than DRIFT_MS (play, pause,
 *   seek, buffering, a rate change). Not on every tick.
 * - Tab hidden, or the player gone: the clock leads, so Focus call-backs keep coming.
 *   When the fan comes back, the player is moved to the clock (catchUpTarget).
 */
import { elapsed, type Anchor } from "./anchor";

export const DRIFT_MS = 1_000;
export const CATCH_UP_MS = 2_000;

export type PlayerReading = {
  /** Player time in ms on the match timeline. */
  ms: number;
  /** Playing (not paused, buffering or ended). */
  playing: boolean;
  /** Playback rate, 1 = normal. */
  rate: number;
};

/** A new anchor when the video and the clock disagree, or null to keep the anchor. */
export function followPlayer(anchor: Anchor, now: number, reading: PlayerReading): Anchor | null {
  const speed = reading.playing ? reading.rate : 0;
  const drift = Math.abs(elapsed(anchor, now) - reading.ms);
  if (drift <= DRIFT_MS && anchor.speed === speed) return null;
  return { anchor_at: now, anchor_elapsed_ms: reading.ms, speed };
}

/** Where to move the player when the fan returns, or null if it is close enough. */
export function catchUpTarget(anchor: Anchor, now: number, playerMs: number): number | null {
  const clock = elapsed(anchor, now);
  return Math.abs(clock - playerMs) > CATCH_UP_MS ? clock : null;
}
