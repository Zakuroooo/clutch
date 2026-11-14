import { describe, expect, test } from "vitest";
import { detectMoments } from "@/lib/adapters/cricket/moments";
import { nextMomentAnchor, startAnchor, SKIP_LEAD_MS } from "@/lib/clock/anchor";
import { fixtureThresholds, fixtureTicks, fixtureTimes } from "@/lib/testing/fixture-match";
import { pickDemo } from "./demo";

const moments = detectMoments(fixtureTicks, fixtureThresholds);

describe("demo", () => {
  test("nextMomentAnchor lands 8 s before the next moment, and is null after the last", () => {
    const times = moments.map((m) => fixtureTimes[m.i]);
    const a = startAnchor(1000, 0);
    const next = nextMomentAnchor(a, 1000, times)!;
    expect(next.anchor_elapsed_ms).toBe(fixtureTimes[4] - SKIP_LEAD_MS);
    // From just after one moment, it goes to the one after.
    const later = nextMomentAnchor(startAnchor(1000, fixtureTimes[4] + 1), 1000, times)!;
    expect(later.anchor_elapsed_ms).toBe(fixtureTimes[12] - SKIP_LEAD_MS);
    expect(nextMomentAnchor(startAnchor(1000, fixtureTimes[36]), 1000, times)).toBeNull();
  });

  test("the demo picks a moment the Pulse rises into, and an earlier one to miss", () => {
    const plan = pickDemo(fixtureTicks, moments, fixtureThresholds)!;
    // Ball 25: stakes 80 on the ball, 20 on the two balls before it. Swing 0.14.
    expect(plan).toEqual({ targetId: "m_25", targetIndex: 25, missId: "m_15", missIndex: 15 });
  });

  test("no single-ball moments means no demo plan", () => {
    expect(
      pickDemo(
        fixtureTicks,
        moments.filter((m) => m.replay_kind === "none"),
        fixtureThresholds,
      ),
    ).toBeNull();
  });
});
