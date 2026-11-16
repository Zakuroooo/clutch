"use client";
import { isHot, type PulseView } from "@/lib/engine/pulse";
import { Badge } from "./Badge";
import { Ring } from "./Ring";

/**
 * The main element: the ring with its word and reason, and "Stakes N of 100". The card
 * glows only when the state is high or decider. State changes are announced politely.
 */
export function PulseCard({
  pulse,
  lookUp,
  right,
  layout = "stack",
  children,
}: {
  pulse: PulseView;
  /** A call-back is on: say "Look up" whatever the ring's own word is. */
  lookUp?: string | null;
  /** Shown on the right of the header, in place of the stakes number. */
  right?: string;
  /** "row": the compact phone layout, ring on the left with the stakes in it. */
  layout?: "stack" | "row";
  children?: React.ReactNode;
}) {
  const hot = isHot(pulse.state) && !pulse.still;
  const word = pulse.word;
  const reason = lookUp ?? pulse.reason;
  const stakes = pulse.still ? null : Math.round(pulse.pct);
  return (
    <section
      className={`card pulse-card${hot ? " hot" : ""}${layout === "row" ? " pulse-row" : ""}`}
      aria-label="The Pulse"
      data-testid="pulse-card"
      data-hot={hot}
    >
      {layout === "row" ? (
        <div className="pulse-row-main">
          <Ring
            state={pulse.state}
            pct={pulse.pct}
            still={pulse.still}
            word={word}
            reason={reason}
            size="sm"
            label={`${word}. ${reason}.${stakes === null ? "" : ` Stakes ${stakes} of 100.`}`}
            centre={
              stakes === null ? (
                <div className="ring-num-word">{pulse.still ? "Done" : "–"}</div>
              ) : (
                <div className="ring-num">
                  <b className="num">{stakes}</b>
                  <span>stakes</span>
                </div>
              )
            }
          />
          <div className="pulse-row-text">
            <Badge kind={hot ? "hot" : "neutral"}>The Pulse</Badge>
            <div key={word} className="pulse-row-word">
              {word}
            </div>
            <div className="pulse-row-reason">{reason}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="row between" style={{ marginBottom: "var(--s-3)" }}>
            <Badge kind={hot ? "hot" : "neutral"}>The Pulse</Badge>
            <span className="small muted num">
              {right ?? (stakes === null ? "" : `Stakes ${stakes} of 100`)}
            </span>
          </div>
          <Ring
            state={pulse.state}
            pct={pulse.pct}
            still={pulse.still}
            word={word}
            reason={reason}
            label={`${word}. ${reason}.${stakes === null ? "" : ` Stakes ${stakes} of 100.`}`}
          />
        </>
      )}
      {/* Announced once per change: the text only changes when the word does. */}
      <p className="sr-only" aria-live="polite" data-testid="pulse-live">
        {word}
      </p>
      {children}
    </section>
  );
}
