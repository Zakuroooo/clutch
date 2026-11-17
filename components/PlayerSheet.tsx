"use client";
import Link from "next/link";
import { useEffect } from "react";
import { achievements, isPlayer, knownFor, roleOf } from "@/lib/adapters/cricket/profile";
import { Button } from "./Button";
import { useMatch } from "./MatchProvider";
import { PlayerPhoto, useFullName } from "./PlayerPhoto";
import { StatTile } from "./StatTile";

/** "Who's this?": one player, in plain words, from their record before this match. */
export function PlayerSheet({ name, onClose }: { name: string; onClose: () => void }) {
  const { data } = useMatch();
  const full = useFullName();
  const p = isPlayer(data.players, name) ? data.players[name] : undefined;
  const photo = data.people[name]?.photo;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!p) return null;
  const tiles = achievements(p).slice(0, 6);
  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="player-h" data-testid="player-sheet">
        <div className="grabber" aria-hidden="true" />
        <div className="player-head">
          <PlayerPhoto name={name} size="lg" />
          <div>
            <span className="badge">{p.team} · {roleOf(p)}</span>
            <h2 id="player-h" className="player-name">{full(name)}</h2>
          </div>
        </div>
        <div className="card-body stack">
          <section>
            <h3 className="mini-h">Known for</h3>
            <ul className="known">
              {knownFor(name, data.players).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
          {tiles.length > 0 ? (
            <div className="tiles three">
              {tiles.map((t) => (
                <StatTile key={t.label} value={t.value} label={t.label} />
              ))}
            </div>
          ) : null}
          <p className="micro faint">
            Every number is from T20 matches before this one (Cricsheet records, IPL included).
            {photo ? ` Photo: ${photo.author}, ${photo.licence}, via Wikimedia Commons.` : ""}
          </p>
        </div>
        <div className="sheet-actions">
          <div className="row">
            <Link href={`/match/players?p=${encodeURIComponent(name)}`} className="btn" style={{ flex: 1 }} onClick={onClose}>
              Back them in a debate
            </Link>
            <Button kind="go" onClick={onClose} style={{ flex: 1 }}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    </>
  );
} // prettier-ignore
