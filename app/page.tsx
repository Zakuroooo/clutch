import { AppBar, REPLAY_NOTE } from "@/components/AppBar";
import { Crest } from "@/components/Crest";
import { Ring } from "@/components/Ring";
import { StartActions } from "@/components/StartActions";
import { teamName } from "@/lib/adapters/cricket/scoreboard";
import { getBundle } from "@/lib/server/bundle";

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
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <main style={vars} className="start">
      <AppBar />
      <section className="wrap start-hero">
        <Ring
          state="high"
          pct={82}
          word="Look up"
          size="sm"
          label="The Pulse: a ring that fills when a ball could change the match"
        />
        <h1>The friend who tells you when to look up.</h1>
        <p className="muted">
          Get on with your work. Clutch calls you back when it matters, and shows you what you
          missed.
        </p>
      </section>

      <section className="wrap">
        <div className="card hero teams-wash match-card">
          <div className="row between small muted">
            <span>{[match.event.name, match.event.stage].filter(Boolean).join(" · ")}</span>
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
          <p className="replay-line">
            <span className="badge replay">{REPLAY_NOTE}</span>
          </p>
          <p className="micro faint" style={{ textAlign: "center", marginTop: "var(--s-2)" }}>
            {match.venue} · {ticks.length} balls
            {video ? ", with the full match video, synced ball by ball" : ", replayed on a clock"}
          </p>
        </div>
      </section>

      <StartActions />

      <p className="note">
        Match data from Cricsheet (cricsheet.org), used under the Open Data Commons Attribution
        License v1.0. Players are shown as jerseys, never faces. No video, no money, no prizes.
      </p>
    </main>
  );
}
