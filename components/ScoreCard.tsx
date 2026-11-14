import type { ScoreboardView } from "@/lib/engine/types";
import { Crest } from "./Crest";

/** Wrap every number in a sentence in <b>, so "need 26 from 23 balls" reads at a glance. */
export function BoldNumbers({ text }: { text: string }) {
  return (
    <>{text.split(/(\d+)/).map((part, k) => (/^\d+$/.test(part) ? <b key={k}>{part}</b> : part))}</>
  );
}

export function ScoreCard({
  title,
  right,
  view,
  progress,
}: {
  /** Competition and stage. */
  title: string;
  /** The over, or a state word. */
  right: string;
  view: ScoreboardView;
  /** Share of each innings bowled, 0 to 1. */
  progress: [number, number];
}) {
  const [a, b] = view.rows;
  return (
    <section className="card hero teams-wash score" aria-label="Score">
      <div className="row between small muted">
        <span
          className="grow"
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {title}
        </span>
        <span className="num" style={{ color: "var(--text)", fontWeight: 600 }}>
          {right}
        </span>
      </div>
      <div className="teams">
        <TeamScore row={a} side="a" />
        <span className="vs" aria-hidden="true">
          VS
        </span>
        <TeamScore row={b} side="b" />
      </div>
      {view.chase ? (
        <div className="chase" data-testid="chase">
          <span>
            <BoldNumbers text={view.chase.left} />
          </span>
          <span className="muted" style={{ whiteSpace: "nowrap" }}>
            {view.chase.right}
          </span>
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

function TeamScore({ row, side }: { row: ScoreboardView["rows"][number]; side: "a" | "b" }) {
  return (
    <div
      className={`team${side === "b" ? " r" : ""}${row.batting ? "" : " dim"}`}
      data-testid={`team-${side}`}
    >
      <Crest code={row.team} side={side} />
      <div>
        <div
          className="runs"
          aria-label={`${row.team} ${row.main}${row.sub.replace("/", " for ")}`}
        >
          {row.main}
          <small>{row.sub}</small>
        </div>
        <div className={`ov${row.batting ? " live" : ""}`}>{row.side}</div>
      </div>
    </div>
  );
}
