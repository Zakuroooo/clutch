import { describe, expect, it } from "vitest";
import { level, SPEAKING_LEVEL, shouldOffer, toCall } from "./voice";

describe("who calls whom", () => {
  it("exactly one side of each pair makes the offer", () => {
    expect(shouldOffer("a", "b")).toBe(true);
    expect(shouldOffer("b", "a")).toBe(false);
  });
  it("calls everyone in voice I am not already talking to, never myself", () => {
    const members = [
      { id: "a", voice: true },
      { id: "b", voice: true },
      { id: "c", voice: false },
      { id: "d", voice: true },
    ];
    expect(toCall("a", members, new Set(["d"]))).toEqual(["b"]);
    // b waits for a to call: a has the smaller id.
    expect(toCall("b", members, new Set())).toEqual(["d"]);
  });
});

describe("speaking level", () => {
  it("is zero for silence and high for a loud signal", () => {
    expect(level(new Uint8Array([128, 128, 128, 128]))).toBe(0);
    expect(level(new Uint8Array([0, 255, 0, 255]))).toBeGreaterThan(SPEAKING_LEVEL);
  });
  it("does not count quiet room noise as speech", () => {
    expect(level(new Uint8Array([127, 129, 128, 130]))).toBeLessThan(SPEAKING_LEVEL);
  });
});
