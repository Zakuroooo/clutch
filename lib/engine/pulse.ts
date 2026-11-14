import type { Thresholds } from "./types";

export type PulseState = "calm" | "building" | "high" | "decider";

/** The Pulse state is a pure function of stakes.pct and the thresholds file. */
export function pulseState(pct: number, thresholds: Pick<Thresholds, "pulse">): PulseState {
  const { building, high, decider } = thresholds.pulse;
  if (pct >= decider) return "decider";
  if (pct >= high) return "high";
  if (pct >= building) return "building";
  return "calm";
}

export const PULSE_WORD: Record<PulseState, string> = {
  calm: "Calm",
  building: "Building",
  high: "Look up",
  decider: "This is it",
};

export const PULSE_REASON: Record<PulseState, string> = {
  calm: "Keep working",
  building: "Something's starting",
  high: "This could change it",
  decider: "This over can decide it",
};

/** The card glows only when the fan should look up. */
export function isHot(state: PulseState): boolean {
  return state === "high" || state === "decider";
}

export type PulseView = {
  state: PulseState;
  /** No motion: before the start, at a break, or when the match is over. */
  still: boolean;
  word: string;
  reason: string;
  /** How much of the ring is filled, 0 to 100. */
  pct: number;
};

/**
 * What the Pulse shows right now. The Pulse is about the NEXT event: `nextPct` is the
 * stakes of the event about to happen, which is known as soon as the last one ends.
 */
export function pulseView(input: {
  thresholds: Pick<Thresholds, "pulse">;
  /** stakes.pct of the next event, or null when there is none. */
  nextPct: number | null;
  phase: "soon" | "play" | "break" | "finished";
  /** Words the adapter supplies for the phases that are not "play". */
  soonReason?: string;
  breakReason?: string;
  resultWord?: string;
  resultReason?: string;
}): PulseView {
  const { phase } = input;
  if (phase === "finished") {
    return {
      state: "calm",
      still: true,
      word: input.resultWord ?? "Finished",
      reason: input.resultReason ?? "",
      pct: 100,
    };
  }
  if (phase === "soon") {
    return { state: "calm", still: true, word: "Soon", reason: input.soonReason ?? "", pct: 0 };
  }
  if (phase === "break") {
    return { state: "calm", still: true, word: "Break", reason: input.breakReason ?? "", pct: 0 };
  }
  const pct = input.nextPct ?? 0;
  const state = pulseState(pct, input.thresholds);
  return { state, still: false, word: PULSE_WORD[state], reason: PULSE_REASON[state], pct };
}
