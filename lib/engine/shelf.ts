/**
 * The Moment Shelf (PRD F5). Moments are static data; what the fan saw is kept in the
 * browser as a map from moment id to "seen" or "missed".
 */
import type { Moment } from "./types";

export type Mark = "seen" | "missed";
export type Marks = Record<string, Mark>;

/** Moments that have already happened on the clock, newest first. Never a future one. */
export function shelfAt(moments: readonly Moment[], index: number): Moment[] {
  return moments.filter((m) => m.i <= index).sort((a, b) => b.i - a.i);
}

/** A moment is missed if the page was hidden, or Focus was on, when it happened. */
export function markFor(context: { hidden: boolean; focus: boolean; skipped: boolean }): Mark {
  return context.hidden || context.focus || context.skipped ? "missed" : "seen";
}

/**
 * Marks for the moments the clock passed going from prevIndex to index. Moments that
 * already have a mark keep it. `skipped` is true when the clock jumped over them.
 */
export function markPassed(
  moments: readonly Moment[],
  marks: Marks,
  prevIndex: number,
  index: number,
  context: { hidden: boolean; focus: boolean },
): Marks {
  const passed = moments.filter((m) => m.i > prevIndex && m.i <= index && !(m.id in marks));
  if (passed.length === 0) return marks;
  const next = { ...marks };
  for (const m of passed) {
    // Only the moment at the ball we landed on was actually watched.
    next[m.id] = markFor({ ...context, skipped: m.i !== index });
  }
  return next;
}

export function missedMoments(moments: readonly Moment[], marks: Marks, index: number): Moment[] {
  return moments.filter((m) => m.i <= index && marks[m.id] === "missed").sort((a, b) => a.i - b.i);
}

export function markSeen(marks: Marks, ids: readonly string[]): Marks {
  const next = { ...marks };
  for (const id of ids) next[id] = "seen";
  return next;
}
