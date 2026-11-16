import type { ScoreboardView } from "@/lib/engine/types";
import { Crest } from "./Crest";
import { BoldNumbers } from "./ScoreCard";

/**
 * The compact scoreboard: both teams on one row, the chase on the next. The batting side
 * is bright, the other dimmed. Built to sit under the match video like a broadcast strip.
 */
export function ScoreStrip({
  title,
  right,
  view,
  progress,
}: {
  title: string;
  right: string;
  view: ScoreboardView;
  progress: [number, number];
}) {
  const [a, b] = view.rows;
  return (
    <section className="card hero teams-wash strip" aria-label="Score">
      <div className="strip-top">
        <span className="strip-title">{title}</span>
        <span className="strip-over num">{right}</span>
      </div>
      <div className="strip-teams">
        <Side row={a} side="a" />
        <span className="strip-vs" aria-hidden="true">
          v
        </span>
        <Side row={b} side="b" />
      </div>
      {view.chase ? (
        <div className="strip-chase" data-testid="chase">
          <span>
            <BoldNumbers text={view.chase.left} />
          </span>
          <span className="muted">{view.chase.right}</span>
        </div>
      ) : null}
      <div className="progress" aria-hidden="true">
        <i
          style={
            { "--w": `${progress[0] * 100}%`, "--fill": "var(--team-a)" } as React.CSSProperties
          }
        />
        <i
          style={
            { "--w": `${progress[1] * 100}%`, "--fill": "var(--team-b)" } as React.CSSProperties
          }
        />
      </div>
    </section>
  );
}

function Side({ row, side }: { row: ScoreboardView["rows"][number]; side: "a" | "b" }) {
  return (
    <div className={`strip-side ${side}${row.batting ? " on" : ""}`} data-testid={`team-${side}`}>
      <Crest code={row.team} side={side} />
      <div className="strip-score">
        <div
          className="runs num"
          aria-label={`${row.team} ${row.main}${row.sub.replace("/", " for ")}`}
        >
          {row.main}
          <small>{row.sub}</small>
        </div>
        <div className="strip-side-note">
          <b>{row.team}</b> · {row.side}
        </div>
      </div>
    </div>
  );
}
