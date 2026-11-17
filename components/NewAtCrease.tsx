"use client";
import { useState } from "react";
import { arrivals, roleOf, type Arrival } from "@/lib/adapters/cricket/profile";
import { useMatch } from "./MatchProvider";
import { PlayerPhoto, useFullName } from "./PlayerPhoto";
import { PlayerSheet } from "./PlayerSheet";

/** How long, in balls, a new batter stays on the strip. */
export const FRESH_BALLS = 12;

/** The player who arrived most recently, while they are still new; else null. */
export function freshArrival(events: readonly Arrival[], index: number): Arrival | null {
  let last: Arrival | null = null;
  // Later in the list wins a tie (the bowler of the first ball after the openers).
  for (const e of events) if (e.i <= index && (!last || e.i >= last.i)) last = e;
  return last && index - last.i < FRESH_BALLS ? last : null;
}

/** "New at the crease: Hardik Pandya. Who's this?" Tap to see who they are. */
export function NewAtCrease() {
  const { data, snap } = useMatch();
  const full = useFullName();
  const [open, setOpen] = useState<string | null>(null);
  const fresh = freshArrival(arrivals(data.ticks), snap.index);
  const name = fresh?.name ?? null;
  const p = name ? data.players[name] : undefined;
  return (
    <>
      {name && p ? (
        <button type="button" className="card crease" onClick={() => setOpen(name)} data-testid="new-at-crease">
          <PlayerPhoto name={name} size="md" />
          <span className="grow">
            <span className="micro muted">{fresh?.as === "bowler" ? "New bowler" : "New at the crease"}</span>
            <b>{full(name)}</b>
            <span className="small muted">{p.team} · {roleOf(p)}</span>
          </span>
          <span className="chip">Who&apos;s this?</span>
        </button>
      ) : null}
      {open ? <PlayerSheet name={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
} // prettier-ignore
