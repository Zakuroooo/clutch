"use client";
import { useEffect, useState } from "react";
import { plural } from "@/lib/adapters/cricket/scoreboard";
import { cardKey } from "@/lib/cards/schema";
import { useSettings } from "@/lib/client/settings";
import { AppBar } from "./AppBar";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { CATCH_UP_SECONDS, CatchMeUp } from "./CatchMeUp";
import { IconPlay } from "./Icons";
import { useMatch, useMatchView } from "./MatchProvider";
import { MomentCard } from "./MomentCard";

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n: number) => WORDS[n] ?? `${n}`;

export function MomentsScreen() {
  const { data, snap, wordsFor, factsFor, open } = useMatch();
  const view = useMatchView();
  const settings = useSettings();
  const [playing, setPlaying] = useState<string[] | null>(null);
  const missed = view.missed;
  const now = snap.index >= 0 ? data.ticks[Math.min(snap.index, data.ticks.length - 1)] : null;

  useEffect(() => {
    // "I'm back. Catch me up" on the Focus screen lands here with ?catchup=1.
    if (!snap.ready || !new URLSearchParams(window.location.search).has("catchup")) return;
    window.history.replaceState(null, "", window.location.pathname);
    const ids = missed.map((m) => m.id);
    if (ids.length > 0) queueMicrotask(() => setPlaying(ids));
  }, [snap.ready, missed]);

  return (
    <main>
      <AppBar />
      <div className="wrap">
        <section className="card hero pad" aria-label="What you missed">
          <div className="row between">
            {missed.length > 0 ? (
              <Badge kind="missed">{missed.length} missed</Badge>
            ) : (
              <Badge>{view.shelf.length === 0 ? "Nothing yet" : "All seen"}</Badge>
            )}
            <span className="small muted num">
              {now
                ? `${now.state.batting} ${now.state.score}/${now.state.wickets}, over ${now.event.over}.${now.event.ball}`
                : ""}
            </span>
          </div>
          <h1 className="shelf-title" data-testid="shelf-title">
            {view.shelf.length === 0
              ? "Nothing big yet."
              : missed.length === 0
                ? "You've seen it all."
                : `You missed ${count(missed.length)} big ${missed.length === 1 ? "moment" : "moments"}`}
          </h1>
          <p className="small muted" style={{ marginTop: "var(--s-2)" }}>
            {view.shelf.length === 0
              ? "When something happens, it's kept here so you can't miss it."
              : missed.length === 0
                ? "Every moment so far is below. Tap one to see why it mattered."
                : "They're kept here so you can't lose them."}
          </p>
          {missed.length > 0 ? (
            <div style={{ marginTop: "var(--s-4)" }}>
              <Button kind="go" wide onClick={() => setPlaying(missed.map((m) => m.id))}>
                <IconPlay />
                Catch me up in {plural(missed.length * CATCH_UP_SECONDS, "second")}
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      {view.shelf.length > 0 ? (
        <>
          <div className="sec">
            <h2>Moments</h2>
            <span className="small muted">Newest first</span>
          </div>
          <div className="wrap stack">
            {view.shelf.map((m) => {
              const words = wordsFor(m.id);
              const f = factsFor(m.id);
              if (!words || !f) return null;
              const code =
                data.match.teams.find((t) => t.name === f.chance_team)?.code ?? f.chance_team;
              return (
                <MomentCard
                  key={m.id}
                  moment={m}
                  badge={words.badge}
                  title={
                    data.cards[cardKey(m.id, settings.world ?? "plain")]?.headline.replace(
                      /\.$/,
                      "",
                    ) ?? words.title
                  }
                  line={words.line}
                  swing={{ code, points: f.chance_after - f.chance_before }}
                  mark={snap.session.marks[m.id] ?? "seen"}
                  onOpen={() => open(m.id)}
                />
              );
            })}
          </div>
          <p className="note">Drawings show what was recorded, not the ball&apos;s real path.</p>
        </>
      ) : null}
      {playing ? <CatchMeUp ids={playing} onDone={() => setPlaying(null)} /> : null}
    </main>
  );
}
