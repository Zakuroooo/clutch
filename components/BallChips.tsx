export type Cell = { glyph: string; tone: "plain" | "four" | "six" | "wicket" | "extra" | "next" };

/** "This over": bowled balls, then dashed placeholders. Display only. */
export function BallChips({ cells, spoken }: { cells: Cell[]; spoken: string }) {
  const lastBowled = cells.reduce((at, c, k) => (c.tone === "next" ? at : k), -1);
  return (
    <div className="wrap balls" role="img" aria-label={spoken}>
      {cells.map((c, k) => (
        <span
          key={k}
          className={`ball${c.tone === "plain" ? "" : ` ${c.tone}`}${k === lastBowled ? " latest" : ""}`}
          aria-hidden="true"
        >
          {c.glyph}
        </span>
      ))}
    </div>
  );
}
