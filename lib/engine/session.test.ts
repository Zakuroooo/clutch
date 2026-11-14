import { describe, expect, test } from "vitest";
import { startAnchor } from "@/lib/clock/anchor";
import { detectMoments } from "@/lib/adapters/cricket/moments";
import {
  fixtureAlerts,
  fixtureThresholds,
  fixtureTicks,
  fixtureTimes,
} from "@/lib/testing/fixture-match";
import { ALERT_LEAD_MS } from "./alerts";
import { newSession, restart, step, type MatchPlan } from "./session";

const plan: MatchPlan = {
  times: fixtureTimes,
  alerts: fixtureAlerts,
  moments: detectMoments(fixtureTicks, fixtureThresholds),
};
const T = 1_000_000;
const watching = { hidden: false };

describe("session step", () => {
  test("in Focus, a call-back at my bar notifies once, 10 s before its ball", () => {
    let s = { ...newSession(startAnchor(T), "big"), focus: true };
    const due = fixtureTimes[4] - ALERT_LEAD_MS;
    let r = step(s, plan, T + due - 250, watching);
    expect(r.notify).toBeNull();
    r = step(r.session, plan, T + due, watching);
    expect(r.notify?.i).toBe(4);
    expect(r.session.callbacks).toBe(1);
    s = r.session;
    r = step(s, plan, T + due + 250, watching);
    expect(r.notify).toBeNull(); // never twice
    expect(r.session.callbacks).toBe(1);
  });

  test("nothing below my bar", () => {
    const s = { ...newSession(startAnchor(T), "decider"), focus: true };
    const r = step(s, plan, T + fixtureTimes[30], watching);
    expect(r.notify).toBeNull();
    expect(r.session.fired).toEqual([]);
  });

  test("outside Focus, call-backs are recorded but do not interrupt", () => {
    const s = newSession(startAnchor(T), "notable");
    const r = step(s, plan, T + fixtureTimes[4] - 5_000, watching);
    expect(r.notify).toBeNull();
    expect(r.session.fired).toEqual([4]);
    expect(r.session.callbacks).toBe(0);
  });

  test("a jump over several alerts notifies only the newest, and marks moments missed", () => {
    const s = { ...newSession(startAnchor(T), "notable"), focus: true };
    const r = step(s, plan, T + fixtureTimes[31] - 5_000, watching);
    expect(r.notify?.i).toBe(31);
    expect(r.session.fired).toEqual([4, 5, 25, 31]);
    expect(r.session.callbacks).toBe(1);
    expect(r.index).toBe(30);
    expect(Object.values(r.session.marks).every((m) => m === "missed")).toBe(true);
    expect(Object.keys(r.session.marks)).toEqual(["m_4", "m_12", "m_15", "m_18", "m_22", "m_25"]);
  });

  test("a hidden page marks the moment missed; a visible one marks it seen", () => {
    const at = T + fixtureTimes[4];
    const before = step(newSession(startAnchor(T)), plan, at - 1000, watching).session;
    expect(step(before, plan, at, { hidden: true }).session.marks).toEqual({ m_4: "missed" });
    expect(step(before, plan, at, watching).session.marks).toEqual({ m_4: "seen" });
  });

  test("finished after the last ball plus 30 s", () => {
    const end = fixtureTimes[fixtureTimes.length - 1];
    expect(step(newSession(startAnchor(T)), plan, T + end + 29_000, watching).finished).toBe(false);
    const done = step(newSession(startAnchor(T)), plan, T + end + 31_000, watching);
    expect(done.finished).toBe(true);
    expect(done.index).toBe(fixtureTimes.length - 1);
  });

  test("restart clears progress and keeps choices", () => {
    const played = step(
      { ...newSession(startAnchor(T), "decider"), focus: true },
      plan,
      T + fixtureTimes[33],
      watching,
    );
    const again = restart(played.session, startAnchor(T + 5));
    expect(again).toMatchObject({
      bar: "decider",
      focus: true,
      marks: {},
      fired: [],
      lastIndex: -1,
      callbacks: 0,
    });
  });
});
