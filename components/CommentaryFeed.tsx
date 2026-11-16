"use client";
import { useState } from "react";
import { commentary } from "@/lib/adapters/cricket/commentary";
import { useMatch } from "./MatchProvider";

/**
 * Ball by ball, newest first, like a match centre's commentary tab. Written by code from
 * the recorded data; a ball that made a moment links to its card.
 */
export function CommentaryFeed() {
  const { data, snap, open } = useMatch();
  const [count, setCount] = useState(12);
  const index = Math.min(snap.index, data.ticks.length - 1);
  const lines = commentary(data.ticks, index, data.match, count);
  const momentAt = new Map(data.moments.map((m) => [m.i, m]));

  return (
    <section className="card feed" aria-label="Ball by ball" data-testid="commentary">
      <div className="feed-head">
        <h2 className="card-title">Ball by ball</h2>
        <span className="small muted">Newest first</span>
      </div>
      {lines.length === 0 ? (
        <p className="small muted feed-empty">The first ball is on its way.</p>
      ) : (
        <ol className="feed-list">
          {lines.map((l) => {
            const m = momentAt.get(l.i);
            return (
              <li key={l.i} className={m ? "has-moment" : undefined}>
                <span className="feed-over num">{l.over}</span>
                <span className={`feed-ball ${l.tone}`} aria-hidden="true">
                  {l.tone === "wicket"
                    ? "W"
                    : l.tone === "six"
                      ? "6"
                      : l.tone === "four"
                        ? "4"
                        : l.result === "no run"
                          ? "•"
                          : l.tone === "extra"
                            ? "+"
                            : l.result.split(" ")[0]}
                </span>
                <span className="feed-text">
                  <span className="feed-who">{l.who}</span>
                  <span className={`feed-result ${l.tone}`}>{l.result}</span>
                  {m ? (
                    <button type="button" className="feed-why" onClick={() => open(m.id)}>
                      Why it mattered
                    </button>
                  ) : null}
                </span>
                <span className="feed-score num">{l.score}</span>
              </li>
            );
          })}
        </ol>
      )}
      {index + 1 > count ? (
        <button
          type="button"
          className="btn ghost wide feed-more"
          onClick={() => setCount((c) => c + 24)}
        >
          Earlier balls
        </button>
      ) : null}
    </section>
  );
}
