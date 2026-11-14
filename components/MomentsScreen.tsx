"use client";
import { AppBar } from "./AppBar";
import { useMatch, useMatchView } from "./MatchProvider";
import { MomentCard } from "./MomentCard";

export function MomentsScreen() {
  const { data, snap, wordsFor, factsFor, open } = useMatch();
  const view = useMatchView();
  return (
    <main>
      <AppBar />
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
              title={words.title}
              line={words.line}
              swing={{ code, points: f.chance_after - f.chance_before }}
              mark={snap.session.marks[m.id] ?? "seen"}
              onOpen={() => open(m.id)}
            />
          );
        })}
      </div>
    </main>
  );
}
