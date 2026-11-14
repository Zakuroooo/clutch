"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setWorld, useSettings, WORLD_LABEL } from "@/lib/client/settings";
import { WORLDS, type World } from "@/lib/engine/types";
import { AppBar } from "./AppBar";
import { Button } from "./Button";
import { IconCheck } from "./Icons";

/** One line of how each world sounds. Samples of tone, not match facts. */
const SAMPLE: Record<World, string> = {
  football: "Like losing your striker with the game level.",
  f1: "Like a pit stop that drops you behind.",
  chess: "Like giving up your queen in the endgame.",
  bollywood: "Like the twist right before the interval.",
  gaming: "Like the final boss with one life left.",
  plain: "No comparisons. Just what happened and why it matters.",
};

const ICON: Record<World, React.ReactNode> = {
  football: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.500l4 3-1.500 4.500h-5L8 10.500l4-3Z" />
      <path d="M12 3v4.500M20.500 10l-4.500.500M17.500 19l-3-4M6.500 19l3-4M3.500 10l4.500.500" />
    </>
  ),
  f1: (
    <>
      <path d="M5 21V4" />
      <path d="M5 5h14v9H5" />
      <path d="M9.500 5v9M14.500 5v9M5 9.500h14" />
    </>
  ),
  chess: (
    <>
      <path d="M8 21h8M9 21c0-4 1-5 1-8H8l2-3c-1-3 1-6 4-6 0 2 3 3 3 7l-3 2c0 3 1 4 1 8" />
    </>
  ),
  bollywood: (
    <>
      <rect x="3" y="9" width="18" height="11" rx="2" />
      <path d="M3 9l17-4 .800 3.200L4 12M8 8l2 3.500M13 6.800l2 3.500" />
    </>
  ),
  gaming: (
    <>
      <path d="M7 8h10a4 4 0 0 1 4 4v3a2.500 2.500 0 0 1-4.600 1.400L15 15H9l-1.400 1.400A2.500 2.500 0 0 1 3 15v-3a4 4 0 0 1 4-4Z" />
      <path d="M7.500 10.500v3M6 12h3M16 11.500h.010M18 13h.010" />
    </>
  ),
  plain: (
    <>
      <path d="M5 7h14M5 12h14M5 17h9" />
    </>
  ),
};

export function WorldPicker() {
  const settings = useSettings();
  const router = useRouter();
  const [picked, setPicked] = useState<World | null>(null);
  const choice = picked ?? settings.world;
  const returning = settings.world !== null && choice === settings.world;

  const go = () => {
    if (!choice) return;
    setWorld(choice);
    router.push("/match");
  };

  return (
    <main className="screen">
      <AppBar />
      <section className="wrap">
        <h1 className="page-title">What do you already love?</h1>
        <p className="muted" style={{ marginTop: "var(--s-2)" }}>
          Clutch explains each big moment in those terms. You can change it any time.
        </p>
        <div
          className="worlds"
          style={{ marginTop: "var(--s-4)" }}
          role="group"
          aria-label="Your world"
        >
          {WORLDS.map((w) => (
            <button
              key={w}
              type="button"
              className="world-card"
              aria-pressed={choice === w}
              onClick={() => setPicked(w)}
            >
              <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                {ICON[w]}
              </svg>
              <b>{WORLD_LABEL[w]}</b>
              <span className="small muted">{SAMPLE[w]}</span>
              {choice === w ? (
                <span className="tick-mark" aria-hidden="true">
                  <IconCheck />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </section>
      <div className="cta-bar" style={{ bottom: 0 }}>
        <Button kind="go" wide onClick={go} disabled={!choice}>
          {returning && choice
            ? `Keep ${WORLD_LABEL[choice].replace("Keep it plain", "it plain").toLowerCase()}`
            : "Continue"}
        </Button>
      </div>
    </main>
  );
}
