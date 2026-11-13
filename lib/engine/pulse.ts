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
