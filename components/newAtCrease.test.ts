import { describe, expect, it } from "vitest";
import { FRESH_BALLS, freshArrival } from "./NewAtCrease";

const events = [
  { i: 10, name: "A", as: "batter" as const },
  { i: 40, name: "B", as: "batter" as const },
  { i: 40, name: "Z", as: "bowler" as const },
];

describe("freshArrival", () => {
  it("is nobody before anyone arrives", () => {
    expect(freshArrival(events, 5)).toBeNull();
  });
  it("is the player who just arrived", () => {
    expect(freshArrival(events, 10)?.name).toBe("A");
  });
  it("on a tie, shows the later one in the list", () => {
    expect(freshArrival(events, 41)?.name).toBe("Z");
  });
  it("lets them go once they are no longer new", () => {
    expect(freshArrival(events, 10 + FRESH_BALLS)).toBeNull();
  });
  it("never shows a player who has not arrived yet", () => {
    expect(freshArrival(events, 39)).toBeNull();
  });
});
