export function StatTile({
  value,
  label,
  stake,
}: {
  value: React.ReactNode;
  label: string;
  stake?: boolean;
}) {
  return (
    <div className="tile">
      <b className={stake ? "stake" : undefined}>{value}</b>
      <span>{label}</span>
    </div>
  );
}
