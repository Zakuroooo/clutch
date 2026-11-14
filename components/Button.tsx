import Link from "next/link";

type Common = { kind?: "go" | "ghost"; wide?: boolean; children: React.ReactNode };

/** Go: the one green button on a screen. Ghost: everything else. */
export function Button({
  kind = "ghost",
  wide,
  children,
  ...rest
}: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`btn ${kind}${wide ? " wide" : ""}`} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({ kind = "ghost", wide, children, href }: Common & { href: string }) {
  return (
    <Link href={href} className={`btn ${kind}${wide ? " wide" : ""}`}>
      {children}
    </Link>
  );
}
