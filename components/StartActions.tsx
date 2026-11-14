"use client";
import { useSettings } from "@/lib/client/settings";
import { LinkButton } from "./Button";

/** The start screen's buttons. First-time fans pick a world on the way in. */
export function StartActions() {
  const settings = useSettings();
  return (
    <section className="wrap stack" style={{ marginTop: "var(--s-4)" }}>
      <LinkButton kind="go" wide href={settings.world ? "/match" : "/world?next=match"}>
        Watch alone
      </LinkButton>
      <LinkButton wide href="/match?demo=1">
        Show me in 2 minutes
      </LinkButton>
      <p className="micro muted" style={{ textAlign: "center" }}>
        Watching with friends is coming later.
      </p>
    </section>
  );
}
