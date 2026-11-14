"use client";
import Link from "next/link";
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
      <button type="button" className="btn ghost wide" disabled aria-describedby="rooms-note">
        Watch with friends
      </button>
      <p id="rooms-note" className="micro faint" style={{ textAlign: "center" }}>
        Rooms are designed but not built yet. You can watch alone now.
      </p>
      <p style={{ textAlign: "center" }}>
        <Link href="/match?demo=1" className="demo-link">
          Show me in 2 minutes
        </Link>
      </p>
    </section>
  );
}
