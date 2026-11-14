/** Two big percentages with an arrow. The "after" number is green or red by direction. */
export function BeforeAfter({
  team,
  before,
  after,
  span,
}: {
  team: string;
  before: number;
  after: number;
  span: string;
}) {
  const dir = after > before ? "up" : after < before ? "down" : "";
  return (
    <div>
      <div className="small muted" style={{ marginBottom: "var(--s-2)" }}>
        {team.endsWith("s") ? `${team}'` : `${team}'s`} chance to win
      </div>
      <div
        className="ba"
        role="img"
        aria-label={`${team}: ${before} percent before, ${after} percent after`}
      >
        <div>
          <b>{before}%</b>
          <div className="micro muted">before {span}</div>
        </div>
        <span className="to" aria-hidden="true">
          →
        </span>
        <div className={`after ${dir}`}>
          <b>{after}%</b>
          <div className="micro muted">after</div>
        </div>
      </div>
    </div>
  );
}
