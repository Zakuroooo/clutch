"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isHot } from "@/lib/engine/pulse";
import { useMatch, useMatchView } from "./MatchProvider";

const STEPS = 5;

/**
 * The reviewer demo: a coach card with one sentence per step. It only moves the clock
 * and opens screens; everything shown is the real product on the real data.
 */
export function DemoGuide() {
  const { store, snap, open, openId } = useMatch();
  const view = useMatchView();
  const router = useRouter();
  const path = usePathname();
  const [step, setStep] = useState(0);
  const demo = snap.demo;
  const hot = isHot(view.pulse.state) && !view.pulse.still;
  const arrived = demo !== null && snap.index >= demo.targetIndex;

  // The demo follows the match: the Pulse rising and the ball arriving move it on.
  useEffect(() => {
    if (!demo) return;
    if (step === 0 && hot) queueMicrotask(() => setStep(1));
    if (step <= 1 && arrived) {
      queueMicrotask(() => {
        setStep(2);
        open(demo.targetId);
      });
    }
  }, [demo, step, hot, arrived, open]);

  if (!demo) return null;
  if (openId && step !== 2) return null; // never cover a card the fan opened themselves

  const end = () => {
    store.endDemo();
    open(null);
    if (path !== "/match") router.push("/match");
  };
  const next = () => {
    if (step <= 1) {
      // Do not make the reviewer wait: bring the ball close.
      store.skipAhead();
      setStep(1);
    } else if (step === 2) {
      open(null);
      router.push("/match/moments");
      setStep(3);
    } else if (step === 3) {
      router.push("/match");
      setStep(4);
    } else end();
  };

  const text = [
    view.pulse.state === "calm"
      ? "This ring is all you need to watch. It's calm, so you can look away."
      : "This ring is all you need to watch. It fills when a ball could change the match.",
    "This is the call-back. In Focus mode your phone would buzz now.",
    "Same facts, your language. Try Say it plainly.",
    "Everything you missed is kept here, with a drawing of what was recorded.",
    "That's Clutch. Try Focus, or Skip ahead to the next big moment.",
  ][step];

  return (
    <aside
      className={`coach${step === 2 ? " over-sheet" : ""}`}
      aria-label="Demo guide"
      data-testid="coach"
      data-step={step}
    >
      <p>{text}</p>
      <div className="row between" style={{ marginTop: "var(--s-2)" }}>
        <span className="steps" aria-label={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, k) => (
            <i key={k} className={k <= step ? "on" : undefined} />
          ))}
        </span>
        <span className="row" style={{ gap: "var(--s-1)" }}>
          {step < STEPS - 1 ? (
            <button type="button" onClick={end}>
              Skip demo
            </button>
          ) : null}
          <button type="button" className="next" onClick={next}>
            {step === STEPS - 1 ? "Done" : step <= 1 && !arrived ? "Skip to the ball" : "Next"}
          </button>
        </span>
      </div>
    </aside>
  );
}
