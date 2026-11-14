import { useId } from "react";

/**
 * Player art: a shirt in team colours with the player's number, or their initials when
 * we have no number. Never a face, photograph or silhouette.
 */
export function Jersey({
  side,
  number,
  name,
}: {
  side: "a" | "b";
  number: number | null;
  name: string;
}) {
  const id = useId();
  const main = side === "a" ? "var(--team-a)" : "var(--team-b)";
  const dark = side === "a" ? "var(--team-a-2)" : "var(--team-b-2)";
  const label = number ?? initials(name);
  return (
    <svg
      className="jersey"
      viewBox="0 0 120 112"
      role="img"
      aria-label={number === null ? `Jersey for ${name}` : `Jersey number ${number}, ${name}`}
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: main }} />
          <stop offset="1" style={{ stopColor: dark }} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d="M42 8 L22 16 L4 40 L22 54 L30 46 L30 106 L90 106 L90 46 L98 54 L116 40 L98 16 L78 8 Q60 24 42 8 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="120" height="112" fill={`url(#${id}-body)`} />
        {/* a lighter sash and darker side panels give the shirt some cut */}
        <path
          d="M-10 70 L70 -10 L92 -10 L12 70 Z"
          style={{ fill: "var(--floodlight)" }}
          opacity="0.1"
        />
        <path
          d="M30 46 L30 106 L38 106 L38 40 Z M90 46 L90 106 L82 106 L82 40 Z"
          style={{ fill: dark }}
          opacity="0.55"
        />
        <path
          d="M4 40 L22 54 L26 49 L9 34 Z M116 40 L98 54 L94 49 L111 34 Z"
          style={{ fill: "var(--floodlight)" }}
          opacity="0.32"
        />
        <rect x="30" y="100" width="60" height="6" style={{ fill: dark }} opacity="0.6" />
      </g>
      <path
        d="M42 8 L22 16 L4 40 L22 54 L30 46 L30 106 L90 106 L90 46 L98 54 L116 40 L98 16 L78 8 Q60 24 42 8 Z"
        fill="none"
        style={{ stroke: "var(--floodlight)" }}
        strokeOpacity="0.24"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M42 8 Q60 24 78 8"
        fill="none"
        style={{ stroke: "var(--floodlight)" }}
        strokeOpacity="0.7"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M52 17 L60 30 L68 17"
        fill="none"
        style={{ stroke: dark }}
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text
        x="60"
        y={typeof label === "number" ? 80 : 76}
        textAnchor="middle"
        fontWeight="800"
        fontSize={typeof label === "number" ? 40 : 28}
        style={{ fill: "var(--on-color)", fontFamily: "var(--font-head)" }}
      >
        {label}
      </text>
    </svg>
  );
}

/** "V Kohli" -> "VK", "Rasikh Salam" -> "RS", "JJ Bumrah" -> "JB" */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
