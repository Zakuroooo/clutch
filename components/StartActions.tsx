"use client";
import { ROOMS_ENABLED } from "@/lib/client/room";
import { useSettings } from "@/lib/client/settings";
import { LinkButton } from "./Button";

/** The start screen's buttons. First-time fans pick a world on the way in. */
export function StartActions() {
  const settings = useSettings();
  return (
    <section className="wrap stack" style={{ marginTop: "var(--s-4)" }}>
      <LinkButton kind="go" wide href={settings.world ? "/match" : "/world?next=match"}>
        Watch now
      </LinkButton>
      {ROOMS_ENABLED ? (
        <LinkButton wide href="/match/room">
          Watch with friends
        </LinkButton>
      ) : null}
      <LinkButton wide href="/match?demo=1">
        Show me in 2 minutes
      </LinkButton>
    </section>
  );
}
