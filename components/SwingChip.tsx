/** The team code and the signed change in its win chance. Green when it helped that team. */
export function SwingChip({ code, points }: { code: string; points: number }) {
  const sign = points > 0 ? "+" : points < 0 ? "-" : "";
  return (
    <span className={`swing ${points >= 0 ? "up" : "down"}`}>
      {code} {sign}
      {Math.abs(points)}%
    </span>
  );
}
