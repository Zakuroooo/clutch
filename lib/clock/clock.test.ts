import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
  elapsed,
  nextMomentAnchor,
  pause,
  setSpeed,
  skipTo,
  startAnchor,
  type Anchor,
} from "./anchor";
import { indexAt, isFinished } from "./indexAt";
import { estimateOffset, measureOffset, offsetOf } from "./serverTime";

const T = Date.UTC(2026, 10, 14, 19, 0, 0); // 19:00:00.000
const s = (seconds: number) => Math.round(seconds * 1000);
// First over at 0, 30 ... 150 s; the next over starts at 225 s (TRD 3.5).
const TIMES = [0, 30, 60, 90, 120, 150, 225, 255].map(s);

describe("indexAt", () => {
  test("is -1 before the first ball", () => {
    expect(indexAt(TIMES, -1)).toBe(-1);
    expect(indexAt([], 1000)).toBe(-1);
  });
  test("is exact at t_ms boundaries", () => {
    expect(indexAt(TIMES, 0)).toBe(0);
    expect(indexAt(TIMES, s(30) - 1)).toBe(0);
    expect(indexAt(TIMES, s(30))).toBe(1);
    expect(indexAt(TIMES, s(224.999))).toBe(5);
    expect(indexAt(TIMES, s(225))).toBe(6);
  });
  test("is the last index after the end", () => {
    expect(indexAt(TIMES, s(10_000))).toBe(TIMES.length - 1);
  });
  test("is monotonic in now, for any anchor", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100_000, max: 400_000 }),
        fc.double({ min: 0, max: 16, noNaN: true }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (start, speed, a, b) => {
          const anchor: Anchor = { anchor_at: T, anchor_elapsed_ms: start, speed };
          const [early, late] = a < b ? [a, b] : [b, a];
          return (
            indexAt(TIMES, elapsed(anchor, T + early)) <= indexAt(TIMES, elapsed(anchor, T + late))
          );
        },
      ),
    );
  });
});

describe("the worked examples in TRD 3.5", () => {
  const room: Anchor = { anchor_at: T, anchor_elapsed_ms: 0, speed: 1 };

  test("A: a phone 2.4 s fast agrees with a correct one", () => {
    const offset = offsetOf({ t0: T + s(12.4), server: T + s(10.05), t1: T + s(12.5) });
    expect(offset).toBe(-2400);
    const phoneClock = T + s(182.4);
    const serverNow = phoneClock + offset;
    expect(elapsed(room, serverNow)).toBe(180_000);
    expect(indexAt(TIMES, elapsed(room, serverNow))).toBe(5);
    expect(indexAt(TIMES, elapsed(room, T + s(180)))).toBe(5); // the phone with a correct clock
  });

  test("B: a refresh lands on the same ball", () => {
    expect(elapsed(room, T + s(190))).toBe(190_000);
    expect(indexAt(TIMES, 190_000)).toBe(5);
  });

  test("C: skip lands 8 s before the next moment", () => {
    const now = T + s(180);
    const next = nextMomentAnchor(room, now, [s(150), 1_935_000, 2_500_000]);
    expect(next).toEqual({ anchor_at: now, anchor_elapsed_ms: 1_927_000, speed: 1 });
    expect(nextMomentAnchor(room, T + s(3000), [s(150), 1_935_000, 2_500_000])).toBeNull();
  });

  test("D: a speed change re-bases the anchor", () => {
    const at600 = T + 600_000;
    const fast = setSpeed(room, at600, 4);
    expect(fast).toEqual({ anchor_at: at600, anchor_elapsed_ms: 600_000, speed: 4 });
    expect(elapsed(fast, at600 + 30_000)).toBe(720_000);
  });

  test("E: before the start and after the end", () => {
    const countdown = startAnchor(T, -5000);
    expect(indexAt(TIMES, elapsed(countdown, T))).toBe(-1);
    const last = TIMES[TIMES.length - 1];
    expect(isFinished(TIMES, last + 30_000)).toBe(false);
    expect(isFinished(TIMES, last + 30_001)).toBe(true);
  });
});

describe("re-anchoring keeps elapsed continuous", () => {
  const a = startAnchor(T, 40_000);
  const now = T + 12_345;
  test("speed change", () => {
    expect(elapsed(setSpeed(a, now, 8), now)).toBe(elapsed(a, now));
  });
  test("pause holds the match time", () => {
    const held = pause(a, now);
    expect(elapsed(held, now)).toBe(elapsed(a, now));
    expect(elapsed(held, now + 60_000)).toBe(elapsed(a, now));
    expect(elapsed(setSpeed(held, now + 60_000, 1), now + 61_000)).toBe(elapsed(a, now) + 1000);
  });
  test("skip sets the new match time and keeps the speed", () => {
    const fast = setSpeed(a, now, 2);
    const jumped = skipTo(fast, now, 500_000);
    expect(elapsed(jumped, now)).toBe(500_000);
    expect(jumped.speed).toBe(2);
  });
});

describe("server time", () => {
  test("estimateOffset uses the sample with the smallest round trip", () => {
    const samples = [
      { t0: 1000, server: 5400, t1: 1800 }, // 800 ms round trip
      { t0: 2000, server: 6040, t1: 2080 }, // 80 ms: the best
      { t0: 3000, server: 7300, t1: 3400 },
    ];
    expect(estimateOffset(samples)).toBe(6040 - 2040);
    expect(estimateOffset([])).toBe(0);
  });
  test("measureOffset survives failed requests", async () => {
    let clock = 0;
    let call = 0;
    const offset = await measureOffset(
      async () => {
        call += 1;
        clock += 10;
        if (call === 2) throw new Error("offline");
        return clock + 500;
      },
      () => clock,
    );
    expect(offset).toBe(505);
  });
});
