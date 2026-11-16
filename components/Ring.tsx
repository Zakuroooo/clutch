import { useId } from "react";
import type { PulseState } from "@/lib/engine/pulse";

const R = 84;
const C = 2 * Math.PI * R;
const TICKS = 60;
/** Rounded so the server and the browser print the same coordinate. */
const at = (offset: number) => (100 + offset).toFixed(2);

/** Length of the lit arc for a stakes percentile, in SVG units. Exported for the test. */
export function arcLength(pct: number): number {
  return (Math.max(0, Math.min(100, pct)) / 100) * C;
}

/**
 * The Pulse ring. The arc fills to stakes.pct; two waves breathe faster as the stakes
 * rise. The pulse gradient is used here because this is stakes, and nowhere else.
 */
export function Ring({
  state,
  pct,
  still = false,
  word,
  reason,
  size = "lg",
  label,
  centre,
}: {
  state: PulseState;
  pct: number;
  still?: boolean;
  word: string;
  reason?: string;
  size?: "lg" | "sm";
  /** The full sentence a screen reader hears. */
  label: string;
  /** Replaces the word in the middle (the compact Pulse shows the stakes number there). */
  centre?: React.ReactNode;
}) {
  const id = useId();
  const hot = state === "high" || state === "decider";
  const calm = state === "calm";
  const lit = Math.round((Math.max(0, Math.min(100, pct)) / 100) * TICKS);
  const cls = [
    "pulse-ring",
    size === "sm" ? "sm" : "",
    state,
    hot ? "hot" : "",
    still ? "still" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} role="img" aria-label={label} data-state={state} data-testid="ring">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--pulse)" }} />
            <stop offset="1" style={{ stopColor: "var(--pulse-2)" }} />
          </linearGradient>
          <radialGradient id={`${id}-disc`} cx="50%" cy="38%" r="70%">
            <stop offset="0" style={{ stopColor: "var(--surface-3)" }} stopOpacity="0.75" />
            <stop offset="1" style={{ stopColor: "var(--bg)" }} stopOpacity="0.6" />
          </radialGradient>
        </defs>
        {/* a dial of ticks around the ring, lit up to the same point as the arc */}
        <g>
          {Array.from({ length: TICKS }, (_, k) => {
            const a = (k / TICKS) * 2 * Math.PI - Math.PI / 2;
            const major = k % 5 === 0;
            const r1 = major ? 93 : 95;
            return (
              <line
                key={k}
                className={`tick${k < lit ? " lit" : ""}${major ? " major" : ""}`}
                x1={at(r1 * Math.cos(a))}
                y1={at(r1 * Math.sin(a))}
                x2={at(98 * Math.cos(a))}
                y2={at(98 * Math.sin(a))}
                strokeWidth={major ? 2 : 1.2}
                strokeLinecap="round"
              />
            );
          })}
        </g>
        <circle cx="100" cy="100" r="74" fill={`url(#${id}-disc)`} />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          style={{ stroke: "var(--surface-3)" }}
          strokeWidth="9"
        />
        <g transform="rotate(-90 100 100)" className="arc-glow">
          <circle
            className="arc"
            data-testid="ring-arc"
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={calm ? undefined : `url(#${id}-g)`}
            style={calm ? { stroke: "var(--calm)" } : undefined}
            strokeWidth={state === "decider" ? 12 : 9}
            strokeLinecap="round"
            strokeDasharray={`${arcLength(pct).toFixed(1)} ${C.toFixed(1)}`}
          />
        </g>
      </svg>
      <span className="wave" />
      <span className="wave w2" />
      <div className="centre">
        {centre ?? (
          <>
            <div key={word} className={`word${word.length > 7 ? " long" : ""}`}>
              {word}
            </div>
            {reason && size === "lg" ? <div className="sub">{reason}</div> : null}
          </>
        )}
      </div>
    </div>
  );
}
