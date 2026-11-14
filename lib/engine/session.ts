/**
 * One fan's session, as plain data, and the single function that moves it forward.
 * `step` is pure: it takes the time and whether the page is hidden, and returns the new
 * session plus the one call-back (if any) the fan should be interrupted with.
 */
import { elapsed, type Anchor } from "@/lib/clock/anchor";
import { indexAt, isFinished } from "@/lib/clock/indexAt";
import { dueAlerts, pickNotification } from "./alerts";
import { markPassed, type Marks } from "./shelf";
import type { Alert, Bar, Moment } from "./types";

export type Session = {
  anchor: Anchor;
  /** Focus mode: stay quiet, call me back at or above `bar`. */
  focus: boolean;
  bar: Bar;
  /** Seen or missed, by moment id. */
  marks: Marks;
  /** Event index of every call-back already handled, so none fires twice. */
  fired: number[];
  /** The last event index this session processed; -1 before the first ball. */
  lastIndex: number;
  /** Call-backs delivered to this fan so far (shown on the Focus screen). */
  callbacks: number;
};

export type MatchPlan = {
  times: readonly number[];
  alerts: readonly Alert[];
  moments: readonly Moment[];
};

export type Step = {
  session: Session;
  index: number;
  elapsedMs: number;
  finished: boolean;
  /** The call-back to interrupt the fan with now, if any. Only in Focus mode. */
  notify: Alert | null;
};

export function newSession(anchor: Anchor, bar: Bar = "big"): Session {
  return { anchor, focus: false, bar, marks: {}, fired: [], lastIndex: -1, callbacks: 0 };
}

export function step(
  session: Session,
  plan: MatchPlan,
  now: number,
  ctx: { hidden: boolean },
): Step {
  const elapsedMs = elapsed(session.anchor, now);
  const index = indexAt(plan.times, elapsedMs);
  const finished = isFinished(plan.times, elapsedMs);
  let next = session;
  let notify: Alert | null = null;

  // Every event the clock passed is processed in order, so no moment is lost in a jump.
  if (index > session.lastIndex) {
    const marks = markPassed(plan.moments, session.marks, session.lastIndex, index, {
      hidden: ctx.hidden,
      focus: session.focus,
    });
    next = { ...next, marks, lastIndex: index };
  } else if (index < session.lastIndex) {
    next = { ...next, lastIndex: index }; // the clock was moved back (restart)
  }

  const due = dueAlerts(plan.alerts, plan.times, elapsedMs, session.bar, new Set(session.fired));
  if (due.length > 0) {
    const fresh = session.focus ? pickNotification(due, plan.times, elapsedMs) : null;
    notify = fresh;
    next = {
      ...next,
      fired: [...next.fired, ...due.map((a) => a.i)],
      callbacks: next.callbacks + (fresh ? 1 : 0),
    };
  }
  return { session: next, index, elapsedMs, finished, notify };
}

/** Start again from the first ball, keeping the fan's choices. */
export function restart(session: Session, anchor: Anchor): Session {
  return { ...session, anchor, marks: {}, fired: [], lastIndex: -1, callbacks: 0 };
}
