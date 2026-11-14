/** A round badge in team colours with the team code. Never an official logo. */
export function Crest({ code, side, size }: { code: string; side: "a" | "b"; size?: "sm" | "lg" }) {
  const cls = ["crest", side === "b" ? "b" : "", size ?? "", code.length > 3 ? "long" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} aria-hidden="true">
      {code}
    </span>
  );
}
