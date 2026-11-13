/**
 * Call-backs (docs/TRD.md section 8, docs/MODEL.md 6.3). The alert list is written by the
 * offline pipeline; the engine only decides which entries are due for this fan, and
 * which one of them is still fresh enough to interrupt with.
 */
import { BARS, type Alert, type Bar } from "./types";

/** A call-back fires this long before its event, so the fan looks up in time. */
export const ALERT_LEAD_MS = 10_000;
/** A call-back older than this is not sent as a notification; it only reaches the shelf. */
export const ALERT_STALE_MS = 20_000;

export function barRank(bar: Bar): number {
  return BARS.indexOf(bar);
}

/** When the call-back for this alert is due on the match clock. */
export function alertDueAt(alert: Alert, times: readonly number[]): number {
  return times[alert.i] - ALERT_LEAD_MS;
}

/**
 * Alerts that are due at `elapsedMs`, at or above the fan's bar, and not fired before.
 * Oldest first. `fired` holds the event index of every alert already handled.
 */
export function dueAlerts(
  alerts: readonly Alert[],
  times: readonly number[],
  elapsedMs: number,
  bar: Bar,
  fired: ReadonlySet<number>,
): Alert[] {
  const min = barRank(bar);
  return alerts.filter(
    (a) => barRank(a.bar) >= min && !fired.has(a.i) && alertDueAt(a, times) <= elapsedMs,
  );
}

/**
 * Of the due alerts, the one to interrupt the fan with: only the newest, and only if it
 * is not stale. After a long jump the rest are recorded without a notification.
 */
export function pickNotification(
  due: readonly Alert[],
  times: readonly number[],
  elapsedMs: number,
): Alert | null {
  const newest = due[due.length - 1];
  if (!newest) return null;
  return elapsedMs - alertDueAt(newest, times) <= ALERT_STALE_MS ? newest : null;
}

/** The alert whose lead window covers this moment in time, if any: "a call-back is on". */
export function activeAlert(
  alerts: readonly Alert[],
  times: readonly number[],
  elapsedMs: number,
  bar: Bar,
): Alert | null {
  const min = barRank(bar);
  for (let k = alerts.length - 1; k >= 0; k--) {
    const a = alerts[k];
    if (barRank(a.bar) < min) continue;
    if (alertDueAt(a, times) <= elapsedMs && elapsedMs <= times[a.i]) return a;
  }
  return null;
}
