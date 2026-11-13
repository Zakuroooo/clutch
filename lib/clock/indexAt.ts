/** After the last event, the match counts as finished once this much time has passed. */
export const FINISH_AFTER_MS = 30_000;

/**
 * The largest i with times[i] <= elapsedMs, or -1 before the first event.
 * `times` is every event's t_ms, ascending. Binary search.
 */
export function indexAt(times: readonly number[], elapsedMs: number): number {
  let lo = 0;
  let hi = times.length - 1;
  let answer = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= elapsedMs) {
      answer = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return answer;
}

export function isFinished(times: readonly number[], elapsedMs: number): boolean {
  if (times.length === 0) return false;
  return elapsedMs > times[times.length - 1] + FINISH_AFTER_MS;
}
