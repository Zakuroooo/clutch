import { AppBar, REPLAY_NOTE } from "@/components/AppBar";
import { Crest } from "@/components/Crest";
import { Ring } from "@/components/Ring";
import { StartActions } from "@/components/StartActions";
import { teamName } from "@/lib/adapters/cricket/scoreboard";
import { getBundle } from "@/lib/server/bundle";

const STEPS = [
  {
    title: "Look up when it matters",
    body: "The Pulse ring fills a few balls before a moment that could change the match, and calls you back.",
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4a8 8 0 0 1 8 8" strokeWidth="3" />
      </>
    ),
  },
  {
    title: "Never lose a moment",
    body: "Anything you missed waits on a shelf, with a drawing of what happened and how far it moved the match.",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="6" rx="2" />
        <rect x="4" y="14" width="16" height="6" rx="2" />
      </>
    ),
  },
  {
    title: "Get why, in your words",
    body: "Each moment explained through something you already love: football, F1, chess, Bollywood, gaming or Hinglish.",
    icon: (
      <>
        <path d="M4 5h16v11H9l-5 4V5Z" />
        <path d="M8 9.5h8M8 12.5h5" />
      </>
    ),
  },
];

export default async function StartPage() {
  const { match, ticks, video } = await getBundle();
  const [a, b] = match.teams;
  const vars = {
    "--team-a": a.colors[0],
    "--team-a-2": a.colors[1],
    "--team-b": b.colors[0],
    "--team-b-2": b.colors[1],
  } as React.CSSProperties;
  const date = new Date(`${match.date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <main style={vars} className="start">
      <AppBar />
      <div className="start-grid">
        <section className="wrap start-hero">
          <span className="badge hot">For fans who watch with one eye</span>
          <h1>The friend who tells you when to look up.</h1>
          <p className="muted start-lead">
            Get on with your work. Clutch calls you back when the match is about to turn, keeps what
            you missed, and tells you why it mattered.
          </p>
          <div className="start-pulse" aria-hidden="true">
            <Ring state="high" pct={82} word="Look up" size="sm" label="" centre={<span className="num">82</span>} />
            <div>
              <b>Look up</b>
              <span>This over can decide it</span>
            </div>
          </div>
        </section>

        <section className="wrap start-side">
          <div className="card hero teams-wash match-card">
            <div className="row between small muted">
              <span className="badge">Tonight&apos;s replay</span>
              <span>{date}</span>
            </div>
            <div className="match-teams">
              <div>
                <Crest code={a.code} side="a" size="lg" />
                <b>{teamName(match, a.code)}</b>
              </div>
              <span className="vs">VS</span>
              <div>
                <Crest code={b.code} side="b" size="lg" />
                <b>{teamName(match, b.code)}</b>
              </div>
            </div>
            <ul className="match-facts">
              <li>{[match.event.name, match.event.stage].filter(Boolean).join(" · ")}</li>
              <li>{match.venue}</li>
              <li>
                {ticks.length} balls
                {video ? ", full match video synced ball by ball" : ", replayed on a clock"}
              </li>
              <li>Result hidden until the last ball</li>
            </ul>
            <p className="replay-line">
              <span className="badge replay">{REPLAY_NOTE}</span>
            </p>
          </div>
          <StartActions />
        </section>
      </div>

      <section className="wrap start-steps" aria-label="How Clutch works">
        {STEPS.map((s) => (
          <div key={s.title} className="card pad step">
            <svg className="step-icon" viewBox="0 0 24 24" aria-hidden="true">
              {s.icon}
            </svg>
            <b>{s.title}</b>
            <p className="small muted">{s.body}</p>
          </div>
        ))}
      </section>

      <p className="note">
        Match data from Cricsheet (cricsheet.org), used under the Open Data Commons Attribution
        License v1.0. Players are drawn as jerseys, never faces. The match video is the original
        stream, played in YouTube&apos;s player with credit. No money, no prizes.
      </p>
    </main>
  );
}
