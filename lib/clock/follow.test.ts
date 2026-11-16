import { describe, expect, test } from "vitest";
import { elapsed, startAnchor } from "./anchor";
import { catchUpTarget, followPlayer } from "./follow";

const T = 1_000_000;

describe("followPlayer", () => {
  const a = startAnchor(T, 60_000, 1);

  test("keeps the anchor while video and clock agree", () => {
    expect(followPlayer(a, T + 5_000, { ms: 65_400, playing: true, rate: 1 })).toBeNull();
  });
  test("re-bases on a seek", () => {
    expect(followPlayer(a, T + 5_000, { ms: 200_000, playing: true, rate: 1 })).toEqual({
      anchor_at: T + 5_000,
      anchor_elapsed_ms: 200_000,
      speed: 1,
    });
  });
  test("pausing the video stops the clock", () => {
    const paused = followPlayer(a, T + 5_000, { ms: 65_000, playing: false, rate: 1 })!;
    expect(paused.speed).toBe(0);
    expect(elapsed(paused, T + 60_000)).toBe(65_000);
  });
  test("a rate change re-bases with the new speed", () => {
    expect(followPlayer(a, T + 5_000, { ms: 65_000, playing: true, rate: 2 })?.speed).toBe(2);
  });
  test("buffering counts as not playing", () => {
    expect(followPlayer(a, T + 5_000, { ms: 64_000, playing: false, rate: 1 })?.speed).toBe(0);
  });
});

describe("catchUpTarget", () => {
  test("moves the player to the clock after the tab was hidden", () => {
    const a = startAnchor(T, 60_000, 1);
    expect(catchUpTarget(a, T + 120_000, 65_000)).toBe(180_000);
    expect(catchUpTarget(a, T + 120_000, 179_000)).toBeNull();
  });
});
