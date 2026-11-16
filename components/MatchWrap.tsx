"use client";
import { margin, teamName } from "@/lib/adapters/cricket/scoreboard";
import { cardKey } from "@/lib/cards/schema";
import { useSettings } from "@/lib/client/settings";
import { AppBar } from "./AppBar";
import { Badge } from "./Badge";
import { Crest } from "./Crest";
import { useMatch, useMatchView } from "./MatchProvider";
import { MomentCard } from "./MomentCard";
import { StatTile } from "./StatTile";

/**
 * The wrap: the match in one screen once it is over (or so far, before the end). The
 * turning point is the moment with the biggest move in win chance; every number is read
 * from the match data and the fan's own session.
 */
export function MatchWrap() {
  const { data, snap, factsFor, wordsFor, open } = useMatch();
  const view = useMatchView();
  const settings = useSettings();
  const { match, ticks } = data;
  const finished = view.phase === "finished";
  const index = Math.min(snap.index, ticks.length - 1);
  const happened = data.moments.filter(
    (m) => m.i <= index && m.kind !== "result" && m.kind !== "innings_end",
  );
  const ranked = [...happened].sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing));
  const turning = ranked[0];
  const top = ranked.slice(0, 3).sort((a, b) => a.i - b.i);
  const marks = snap.session.marks;
  const seen = happened.filter((m) => marks[m.id] === "seen").length;
  const missed = happened.filter((m) => marks[m.id] === "missed").length;
  const [a, b] = match.teams;
  const world = settings.world ?? "plain";

  const card = (id: string, label?: string) => {
    const m = data.moments.find((x) => x.id === id)!;
    const words = wordsFor(id);
    const f = factsFor(id);
    if (!words || !f) return null;
    const code = match.teams.find((t) => t.name === f.chance_team)?.code ?? f.chance_team;
    return (
      <MomentCard
        key={id}
        moment={m}
        badge={label ?? words.badge}
        title={data.cards[cardKey(id, world)]?.headline.replace(/\.$/, "") ?? words.title}
        line={words.line}
        swing={{ code, points: f.chance_after - f.chance_before }}
        mark={marks[id]}
        onOpen={() => open(id)}
      />
    );
  };

  return (
    <main>
      <AppBar />
      <div className="wrap stack">
        <section className="card hero teams-wash pad wrap-hero" data-testid="wrap">
          <div className="row between">
            <Badge kind={finished ? "neutral" : "hot"}>{finished ? "Full time" : "So far"}</Badge>
            <span className="small muted">
              {[match.event.name, match.event.stage].filter(Boolean).join(" · ")}
            </span>
          </div>
          <div className="wrap-teams">
            <Crest code={a.code} side="a" size="lg" />
            <div className="wrap-result">
              <h1>
                {finished ? `${teamName(match, match.result.winner)} won` : "The story so far"}
              </h1>
              {finished ? <p className="muted">by {margin(match)}</p> : null}
            </div>
            <Crest code={b.code} side="b" size="lg" />
          </div>
        </section>

        <div className="tiles">
          <StatTile value={happened.length} label="big moments" />
          <StatTile value={seen} label="you saw live" />
          <StatTile value={missed} label="you missed" stake={missed > 0} />
        </div>

        {turning ? (
          <>
            <h2 className="sec-inline">The turning point</h2>
            {card(turning.id, "Turning point")}
          </>
        ) : (
          <p className="muted">Nothing big has happened yet.</p>
        )}

        {top.length > 1 ? (
          <>
            <h2 className="sec-inline">The three biggest moments</h2>
            {top.map((m) => card(m.id))}
          </>
        ) : null}
        <p className="note">
          Turning point: the moment that moved the win chance most. Tap any card to see why.
        </p>
      </div>
    </main>
  );
}
