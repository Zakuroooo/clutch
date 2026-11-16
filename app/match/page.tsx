"use client";
import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { BallChips } from "@/components/BallChips";
import { EngineLog } from "@/components/EngineLog";
import { IconRestart, IconSkip, IconSpeed, IconTrophy, IconWorld } from "@/components/Icons";
import { useMatch, useMatchView } from "@/components/MatchProvider";
import { MomentCard } from "@/components/MomentCard";
import { PulseCard } from "@/components/PulseCard";
import { ScoreCard } from "@/components/ScoreCard";
import { WinBar, WinWorm } from "@/components/WinBar";
import { useSettings, WORLD_LABEL } from "@/lib/client/settings";

const SPEEDS = [1, 4, 16];

export default function MatchPage() {
  const { data, store, snap, wordsFor, factsFor, open } = useMatch();
  const view = useMatchView();
  const settings = useSettings();
  const { match, ticks } = data;
  const [a, b] = match.teams;
  const title = [match.event.name, match.event.stage].filter(Boolean).join(" · ");
  const speed = snap.session.anchor.speed;
  const lastT = ticks[ticks.length - 1].t_ms;
  const worm = ticks
    .slice(0, Math.max(0, snap.index) + 1)
    .map((t) => ({ x: t.t_ms / lastT, y: t.wp.after }));
  const latest = view.latest;
  const words = latest ? wordsFor(latest.id) : null;
  const facts = latest ? factsFor(latest.id) : null;
  const moreMoments = data.moments.some((m) => m.i > snap.index);

  if (!snap.ready) return <MatchSkeleton />;

  return (
    <main>
      <AppBar />
      <div className="match-grid">
        <div className="stage">
          <div className="wrap stack">
            <ScoreCard
              title={title}
              right={view.overText}
              view={view.scoreboard}
              progress={view.progress}
            />
            <PulseCard pulse={view.pulse} lookUp={view.callback?.line ?? null}>
              <WinWorm points={worm} />
              <WinBar a={a} b={b} chanceA={view.chanceA} />
            </PulseCard>
          </div>

          <div className="chiprow" style={{ marginTop: "var(--s-3)" }}>
            {view.phase === "finished" ? (
              <button type="button" className="chip" onClick={() => store.restart()}>
                <IconRestart />
                Watch again
              </button>
            ) : (
              <button
                type="button"
                className="chip"
                onClick={() => store.skipAhead()}
                disabled={!moreMoments}
                data-testid="skip"
              >
                <IconSkip />
                Skip ahead
              </button>
            )}
            <button
              type="button"
              className="chip"
              onClick={() =>
                store.setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1)
              }
              aria-label={`Replay speed ${speed} times. Tap to change.`}
            >
              <IconSpeed />
              <span className="num">{speed}×</span>
            </button>
            <Link href="/world" className="chip">
              <IconWorld />
              {settings.world
                ? WORLD_LABEL[settings.world].replace("Keep it plain", "Plain")
                : "Your world"}
            </Link>
          </div>

          <div className="sec">
            <h2>This over</h2>
            <span className="small muted num">
              {view.over.label}
              {view.phase === "play" && view.nextBallIn !== null
                ? ` · next ball in ${view.nextBallIn}s`
                : ""}
            </span>
          </div>
          <BallChips cells={view.over.cells} spoken={view.over.spoken} />
        </div>

        <div className="side">
          <div className="sec">
            <h2>{view.phase === "finished" ? "Match summary" : "Just happened"}</h2>
            <Link href="/match/moments" className="link">
              All moments
            </Link>
          </div>
          <div className="wrap">
            {latest && words && facts ? (
              <MomentCard
                key={latest.id}
                moment={latest}
                badge={words.badge}
                title={
                  data.cards[`${latest.id}:${settings.world ?? "plain"}`]?.headline ?? words.title
                }
                line={words.line}
                swing={{
                  code: codeOf(match, facts.chance_team),
                  points: facts.chance_after - facts.chance_before,
                }}
                arrive
                onOpen={() => open(latest.id)}
              />
            ) : (
              <div className="card pad">
                <p className="card-title">Nothing big yet</p>
                <p className="small muted" style={{ marginTop: "var(--s-1)" }}>
                  When something happens, it lands here and is kept in Moments.
                </p>
              </div>
            )}
            {view.phase === "finished" ? (
              <Link
                href="/match/wrap"
                className="btn ghost wide"
                style={{ marginTop: "var(--s-3)" }}
              >
                <IconTrophy />
                See the match wrap
              </Link>
            ) : null}
          </div>
          <div className="wrap" style={{ marginTop: "var(--s-4)" }}>
            <EngineLog />
          </div>
        </div>
      </div>
      {!snap.durable ? (
        <p className="note">Private mode: progress won&apos;t survive a refresh.</p>
      ) : null}
      <p className="note">
        Replay of a real match, running as live. Match data from Cricsheet, used under the Open Data
        Commons Attribution License v1.0.
      </p>
    </main>
  );
}

function codeOf(match: { teams: { code: string; name: string }[] }, name: string): string {
  return match.teams.find((t) => t.name === name)?.code ?? name;
}

function MatchSkeleton() {
  return (
    <main aria-busy="true">
      <AppBar />
      <div className="wrap stack">
        <div className="card skeleton" style={{ height: 168 }} />
        <div className="card pad" style={{ textAlign: "center" }}>
          <div
            className="skeleton"
            style={{ width: 208, height: 208, borderRadius: "var(--r-full)", margin: "0 auto" }}
          />
          <p className="small muted" style={{ marginTop: "var(--s-3)" }}>
            Loading
          </p>
        </div>
      </div>
    </main>
  );
}
