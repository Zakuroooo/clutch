"use client";
import { useEffect, useState } from "react";
import { ExplanationCard } from "./ExplanationCard";
import { useMatch } from "./MatchProvider";

/** How long each moment stays up before the next one, when the fan does nothing. */
export const CATCH_UP_SECONDS = 8;

/**
 * Plays missed moments oldest first, one explanation card at a time, and marks each
 * seen as it is shown. Can be stopped at any point.
 */
export function CatchMeUp({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { store } = useMatch();
  const [at, setAt] = useState(0);
  const id = ids[at];

  useEffect(() => {
    if (!id) return;
    store.markSeen([id]);
    const timer = setTimeout(
      () => (at + 1 < ids.length ? setAt(at + 1) : onDone()),
      CATCH_UP_SECONDS * 1000,
    );
    return () => clearTimeout(timer);
  }, [id, at, ids.length, onDone, store]);

  if (!id) return null;
  return (
    <ExplanationCard
      key={id}
      momentId={id}
      onClose={() => (at + 1 < ids.length ? setAt(at + 1) : onDone())}
      footer={
        <div data-testid="catch-up">
          <div
            className="steps-bar"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={ids.length}
            aria-valuenow={at + 1}
            aria-label="Catch me up progress"
          >
            {ids.map((x, k) => (
              <i key={x} className={k <= at ? "on" : undefined} />
            ))}
          </div>
          <div className="row between" style={{ padding: "var(--s-2) var(--s-4)" }}>
            <span className="small muted num">
              {at + 1} of {ids.length}
            </span>
            <button type="button" className="chip" onClick={onDone}>
              Stop
            </button>
          </div>
        </div>
      }
    />
  );
}
