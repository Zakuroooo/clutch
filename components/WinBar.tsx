import { Crest } from "./Crest";

/** Two segments in the two team colours that meet at the current win chance. */
export function WinBar({
  a,
  b,
  chanceA,
}: {
  a: { code: string; name: string };
  b: { code: string; name: string };
  /** Win chance of team a, 0 to 1. */
  chanceA: number;
}) {
  const pa = Math.round(chanceA * 100);
  const pb = 100 - pa;
  return (
    <div
      className="winbar"
      role="img"
      aria-label={`Chance of winning: ${a.name} ${pa} percent, ${b.name} ${pb} percent`}
    >
      <div className="bar">
        <span className="a" style={{ width: `${pa}%` }} />
        <span className="b" style={{ width: `${pb}%` }} />
      </div>
      <div className="ends" aria-hidden="true">
        <span>
          <Crest code={a.code} side="a" size="sm" />
          {pa}%
        </span>
        <span className="mid">chance to win</span>
        <span>
          {pb}%
          <Crest code={b.code} side="b" size="sm" />
        </span>
      </div>
    </div>
  );
}

/**
 * The win-chance line for the match so far: above the middle is team a's half, below is
 * team b's. Points are (share of the match, chance of team a), both 0 to 1.
 */
export function WinWorm({ points, mark }: { points: { x: number; y: number }[]; mark?: number }) {
  const W = 320;
  const H = 40;
  const px = (x: number) => (x * W).toFixed(1);
  const py = (y: number) => ((1 - y) * (H - 4) + 2).toFixed(1);
  const line = points.map((p, k) => `${k ? "L" : "M"}${px(p.x)} ${py(p.y)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg className="worm" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <line
        x1="0"
        y1={H / 2}
        x2={W}
        y2={H / 2}
        style={{ stroke: "var(--surface-3)" }}
        strokeDasharray="3 4"
      />
      {mark !== undefined ? (
        <line
          x1={px(mark)}
          y1="0"
          x2={px(mark)}
          y2={H}
          style={{ stroke: "var(--faint)" }}
          strokeDasharray="2 3"
        />
      ) : null}
      {points.length > 1 ? (
        <path
          d={line}
          fill="none"
          style={{ stroke: "var(--text)" }}
          strokeWidth="1.8"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {last ? (
        <circle cx={px(last.x)} cy={py(last.y)} r="3" style={{ fill: "var(--text)" }} />
      ) : null}
    </svg>
  );
}
