type Kind = "neutral" | "replay" | "hot" | "missed" | "world";

export function Badge({ kind = "neutral", children }: { kind?: Kind; children: React.ReactNode }) {
  return <span className={`badge${kind === "neutral" ? "" : ` ${kind}`}`}>{children}</span>;
}
