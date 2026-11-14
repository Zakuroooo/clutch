"use client";
import type { Moment } from "@/lib/engine/types";
import type { Mark } from "@/lib/engine/shelf";
import { Badge } from "./Badge";
import { MiniReplay, ThumbChart } from "./MiniReplay";
import { SwingChip } from "./SwingChip";

/** A moment on the shelf or under "Just happened". The whole card is a button. */
export function MomentCard({
  moment,
  badge,
  title,
  line,
  swing,
  mark,
  arrive,
  onOpen,
}: {
  moment: Moment;
  /** The kind in words ("Wicket"); joined by a Missed badge when the fan missed it. */
  badge: string;
  title: string;
  line: string;
  /** Team code and whole-point change in its win chance. */
  swing: { code: string; points: number };
  mark?: Mark;
  arrive?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`card moment${arrive ? " arrive" : ""}`}
      onClick={onOpen}
      data-testid="moment-card"
      data-moment={moment.id}
    >
      <span className="thumb">
        {moment.replay_kind === "none" ? (
          <ThumbChart up={swing.points >= 0} />
        ) : (
          <MiniReplay kind={moment.replay_kind} />
        )}
      </span>
      <span>
        <span className="row" style={{ gap: "var(--s-2)", flexWrap: "wrap" }}>
          {mark === "missed" ? <Badge kind="missed">Missed</Badge> : null}
          <Badge kind={mark ? "neutral" : "hot"}>{badge}</Badge>
          <SwingChip code={swing.code} points={swing.points} />
        </span>
        <h3>{title}</h3>
        <span className="small muted">{line}</span>
      </span>
    </button>
  );
}
