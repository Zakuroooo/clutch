import type { ReplayKind } from "@/lib/engine/types";

/**
 * A side-on drawing of what was recorded for one ball. One drawing per outcome kind.
 * The only input is the kind: there is no position or direction in the data, so the
 * props have none, and the drawing claims none.
 */
export const REPLAY_CAPTION = "A drawing of what was recorded. Not the ball's real path.";

type Drawing = {
  /** The ball after it reaches the batter, as an SVG path starting at the bat. */
  outcome: string;
  /** Where the ball ends. */
  end: [number, number];
  colour: string;
  /** Extra marks: splayed stumps, a pad, hands, a rope. */
  extra?: React.ReactNode;
  /** The delivery, when it is not the usual one to the bat. */
  delivery?: string;
  stumps?: "standing" | "broken";
  label: string;
};

const GROUND = 76;
const DELIVERY = "M92 34 Q66 50 52 75 Q42 66 35 60";
const white = "var(--floodlight)";

const DRAWINGS: Record<Exclude<ReplayKind, "none">, Drawing> = {
  dot: {
    outcome: "M35 60 Q40 68 46 75",
    end: [46, 74],
    colour: "var(--muted)",
    label: "No run: the ball is played down in front of the batter",
  },
  runs: {
    outcome: "M35 60 Q52 72 70 75 L84 75",
    end: [84, 74],
    colour: "var(--text)",
    label: "Runs: the ball is played along the ground and they run",
  },
  four: {
    outcome: "M35 60 Q58 73 76 75 L96 75",
    end: [96, 74],
    colour: "var(--four)",
    extra: (
      <line
        x1="90"
        y1="70"
        x2="90"
        y2={GROUND}
        style={{ stroke: white }}
        strokeOpacity="0.6"
        strokeWidth="1.6"
      />
    ),
    label: "Four: the ball runs along the ground to the boundary",
  },
  six: {
    outcome: "M35 60 Q56 -14 96 26",
    end: [96, 26],
    colour: "var(--six)",
    extra: (
      <line
        x1="90"
        y1="70"
        x2="90"
        y2={GROUND}
        style={{ stroke: white }}
        strokeOpacity="0.6"
        strokeWidth="1.6"
      />
    ),
    label: "Six: the ball is hit over the boundary without bouncing",
  },
  bowled: {
    delivery: "M92 34 Q66 50 52 75 Q38 68 27 64",
    outcome: "M27 64 L24 62",
    end: [25, 63],
    colour: "var(--wicket)",
    stumps: "broken",
    label: "Bowled: the ball hits the stumps",
  },
  lbw: {
    delivery: "M92 34 Q66 50 52 75 Q42 70 33 67",
    outcome: "M33 67 L32 67",
    end: [33, 67],
    colour: "var(--wicket)",
    extra: (
      <line
        x1="31"
        y1="62"
        x2="31"
        y2={GROUND}
        style={{ stroke: white }}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    ),
    label: "Leg before wicket: the ball hits the batter's pad in front of the stumps",
  },
  caught: {
    outcome: "M35 60 Q52 6 80 36",
    end: [80, 36],
    colour: "var(--pulse)",
    extra: (
      <path
        d="M74 40 Q80 46 86 40"
        fill="none"
        style={{ stroke: white }}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
    label: "Caught: the ball is hit in the air and held by a fielder",
  },
  run_out: {
    outcome: "M35 60 Q52 72 66 75",
    delivery: DELIVERY,
    end: [25, 64],
    colour: "var(--wicket)",
    stumps: "broken",
    extra: (
      <>
        <path
          d="M88 40 Q56 44 25 64"
          fill="none"
          style={{ stroke: "var(--wicket)" }}
          strokeWidth="1.8"
          strokeDasharray="3 3"
        />
        <line
          x1="36"
          y1="72"
          x2="36"
          y2={GROUND + 3}
          style={{ stroke: white }}
          strokeOpacity="0.7"
          strokeWidth="1.4"
        />
        <line
          x1="46"
          y1="62"
          x2="50"
          y2="75"
          style={{ stroke: white }}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </>
    ),
    label: "Run out: a throw hits the stumps before the batter gets home",
  },
  stumped: {
    delivery: "M92 34 Q66 50 52 75 Q36 62 14 58",
    outcome: "M14 58 Q18 60 22 62",
    end: [22, 62],
    colour: "var(--wicket)",
    stumps: "broken",
    extra: (
      <path
        d="M8 54 Q14 62 8 66"
        fill="none"
        style={{ stroke: white }}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
    label: "Stumped: the keeper breaks the stumps with the batter out of the crease",
  },
  wide: {
    delivery: "M92 34 Q60 30 12 40",
    outcome: "M12 40 L10 40",
    end: [10, 40],
    colour: "var(--muted)",
    label: "Wide: the ball passes out of the batter's reach, one extra run",
  },
  no_ball: {
    outcome: "M35 60 Q40 68 46 75",
    end: [46, 74],
    colour: "var(--muted)",
    extra: (
      <>
        <line
          x1="84"
          y1="70"
          x2="84"
          y2={GROUND + 3}
          style={{ stroke: white }}
          strokeOpacity="0.7"
          strokeWidth="1.4"
        />
        <path
          d="M84 72 L92 72"
          style={{ stroke: "var(--wicket)" }}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </>
    ),
    label: "No-ball: the bowler oversteps, one extra run and the ball is bowled again",
  },
};

function Stumps({ broken }: { broken: boolean }) {
  const lines = broken
    ? [
        [19, GROUND, 14, 62],
        [23, GROUND, 23, 60],
        [27, GROUND, 32, 62],
      ]
    : [
        [20, GROUND, 20, 60],
        [23, GROUND, 23, 60],
        [26, GROUND, 26, 60],
      ];
  return (
    <g style={{ stroke: white }} strokeWidth="1.6" strokeLinecap="round">
      {lines.map(([x1, y1, x2, y2], k) => (
        <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
      {broken ? (
        <line x1="20" y1="54" x2="27" y2="51" />
      ) : (
        <line x1="19.5" y1="59.5" x2="26.5" y2="59.5" />
      )}
    </g>
  );
}

export function MiniReplay({
  kind,
  animate = false,
}: {
  kind: Exclude<ReplayKind, "none">;
  animate?: boolean;
}) {
  const d = DRAWINGS[kind];
  const showBat = kind !== "wide";
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={d.label} data-replay={kind}>
      <line x1="4" y1={GROUND} x2="96" y2={GROUND} style={{ stroke: white }} strokeOpacity="0.28" />
      <Stumps broken={d.stumps === "broken"} />
      {showBat ? (
        <line
          x1="31"
          y1="46"
          x2="36"
          y2="62"
          style={{ stroke: white }}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      ) : null}
      <path
        d={d.delivery ?? DELIVERY}
        fill="none"
        style={{ stroke: white }}
        strokeOpacity="0.5"
        strokeDasharray="2 3"
      />
      {d.extra}
      <path
        className={animate ? "travel" : undefined}
        pathLength={animate ? 1 : undefined}
        d={d.outcome}
        fill="none"
        style={{ stroke: d.colour }}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        className={animate ? "ball-end" : undefined}
        cx={d.end[0]}
        cy={d.end[1]}
        r="3.6"
        style={{ fill: d.colour }}
      />
    </svg>
  );
}

/** For moments with no single ball (a big over, the innings end, the result). */
export function ThumbChart({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <line
        x1="10"
        y1="50"
        x2="90"
        y2="50"
        style={{ stroke: white }}
        strokeOpacity="0.28"
        strokeDasharray="3 4"
      />
      <path
        d={
          up
            ? "M12 68 L30 62 L46 66 L62 44 L76 38 L88 26"
            : "M12 32 L30 38 L46 34 L62 56 L76 62 L88 74"
        }
        fill="none"
        style={{ stroke: up ? "var(--up)" : "var(--down)" }}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="88"
        cy={up ? 26 : 74}
        r="4.5"
        style={{ fill: up ? "var(--up)" : "var(--down)" }}
      />
    </svg>
  );
}
