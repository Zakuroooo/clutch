"use client";
import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { BallChips } from "@/components/BallChips";
import { EngineLog } from "@/components/EngineLog";
import { CHAPTER_LEAD_MS, chapters } from "@/lib/adapters/cricket/chapters";
import { IconRestart, IconSkip, IconSpeed, IconTrophy, IconWorld } from "@/components/Icons";
import { useMatch, useMatchView } from "@/components/MatchProvider";
import { MatchVideo } from "@/components/MatchVideo";
import { MomentCard } from "@/components/MomentCard";
import { PulseCard } from "@/components/PulseCard";
import { ScoreStrip } from "@/components/ScoreStrip";
import { CommentaryFeed } from "@/components/CommentaryFeed";
import { WinBar, WinWorm } from "@/components/WinBar";
import { useSettings, WORLD_LABEL } from "@/lib/client/settings";
import { useWide } from "@/lib/client/useWide";

const CLOCK_SPEEDS = [1, 4, 16];
const VIDEO_SPEEDS = [1, 2];

export default function MatchPage() {
  const { data, store, snap, wordsFor, factsFor, open } = useMatch();
  const view = useMatchView();
  const settings = useSettings();
  const wide = useWide();
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
  const matchChapters = chapters(ticks, match);

  // One block per part of the screen, placed differently on a phone and a laptop.
  const pulse = (
    <PulseCard
      pulse={view.pulse}
      lookUp={view.callback?.line ?? null}
      layout={wide ? "stack" : "row"}
    >
      {wide ? <WinWorm points={worm} /> : null}
      <WinBar a={a} b={b} chanceA={view.chanceA} />
    </PulseCard>
  );

  if (!snap.ready) return <MatchSkeleton />;

  const video = data.video ? (
    <div className="wrap">
      <MatchVideo video={data.video} />
    </div>
  ) : null;

  const score = (
    <div className="wrap">
      <ScoreStrip
        title={title}
        right={view.overText}
        view={view.scoreboard}
        progress={view.progress}
      />
    </div>
  );

  const thisOver = (
    <section className="wrap over-block" aria-label="This over">
      <div className="over-head">
        <h2>This over</h2>
        <span className="small muted num">
          {view.over.label}
          {view.phase === "play" && view.nextBallIn !== null && !data.video
            ? ` · next ball in ${view.nextBallIn}s`
            : ""}
        </span>
      </div>
      <BallChips cells={view.over.cells} spoken={view.over.spoken} />
    </section>
  );

  const controls = (
    <div className="chiprow controls">
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
        onClick={() => {
          const speeds = store.hasVideo() ? VIDEO_SPEEDS : CLOCK_SPEEDS;
          store.setSpeed(speeds[(speeds.indexOf(speed) + 1) % speeds.length] ?? 1);
        }}
        aria-label={`Replay speed ${speed} times. Tap to change.`}
      >
        <IconSpeed />
        <span className="num">{speed === 0 ? "Paused" : `${speed}×`}</span>
      </button>
      <Link href="/world" className="chip">
        <IconWorld />
        {settings.world
          ? WORLD_LABEL[settings.world].replace("Keep it plain", "Plain")
          : "Your world"}
      </Link>
    </div>
  );

  const justHappened = (
    <section aria-label={view.phase === "finished" ? "Match summary" : "Just happened"}>
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
            title={words.title}
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
          <Link href="/match/wrap" className="btn ghost wide" style={{ marginTop: "var(--s-3)" }}>
            <IconTrophy />
            See the match wrap
          </Link>
        ) : null}
      </div>
    </section>
  );

  const jumpTo = (
    <section aria-label="Jump to">
      <div className="sec">
        <h2>Jump to</h2>
      </div>
      <div className="chiprow chapters">
        {matchChapters.map((c) => (
          <button
            key={c.label}
            type="button"
            className="chapter"
            onClick={() => store.jumpTo(Math.max(0, data.ticks[c.i].t_ms - CHAPTER_LEAD_MS))}
          >
            <b>{c.label}</b>
            <span>{c.sub}</span>
          </button>
        ))}
      </div>
    </section>
  );

  const feed = (
    <div className="wrap block-gap">
      <CommentaryFeed />
    </div>
  );
  const engine = (
    <div className="wrap block-gap">
      <EngineLog />
    </div>
  );

  return (
    <main>
      <AppBar />
      {wide ? (
        <div className="match-grid">
          <div className="stage">
            {video}
            {score}
            {controls}
            {thisOver}
            {jumpTo}
            {feed}
          </div>
          <div className="side">
            <div className="wrap side-pulse">{pulse}</div>
            {justHappened}
            {engine}
          </div>
        </div>
      ) : (
        <div className="phone-stack">
          {video}
          {score}
          <div className="wrap">{pulse}</div>
          {thisOver}
          {controls}
          {justHappened}
          {feed}
          {jumpTo}
          {engine}
        </div>
      )}
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
