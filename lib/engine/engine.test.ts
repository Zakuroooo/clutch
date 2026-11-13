import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { detectMoments } from "@/lib/adapters/cricket/moments";
import {
  fixtureAlerts,
  fixtureThresholds,
  fixtureTicks,
  fixtureTimes,
} from "@/lib/testing/fixture-match";
import { ALERT_LEAD_MS, activeAlert, dueAlerts, pickNotification } from "./alerts";
import { isHot, pulseState } from "./pulse";
import { markPassed, markSeen, missedMoments, shelfAt } from "./shelf";

describe("pulseState", () => {
  const t = { pulse: { building: 50, high: 70, decider: 90 } };
  test.each([
    [0, "calm"],
    [49.9, "calm"],
    [50, "building"],
    [69.9, "building"],
    [70, "high"],
    [89.9, "high"],
    [90, "decider"],
    [100, "decider"],
  ] as const)("pct %s is %s", (pct, state) => {
    expect(pulseState(pct, t)).toBe(state);
  });
  test("only high and decider glow", () => {
    expect([isHot("calm"), isHot("building"), isHot("high"), isHot("decider")]).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });
});

describe("dueAlerts", () => {
  const due = (elapsed: number, bar: "notable" | "big" | "decider", fired: number[] = []) =>
    dueAlerts(fixtureAlerts, fixtureTimes, elapsed, bar, new Set(fired)).map((a) => a.i);

  test("an alert is due 10 s before its ball, not earlier", () => {
    const at = fixtureTimes[4] - ALERT_LEAD_MS;
    expect(due(at - 1, "notable")).toEqual([]);
    expect(due(at, "notable")).toEqual([4]);
  });
  test("nothing below the fan's bar", () => {
    const end = fixtureTimes[fixtureTimes.length - 1];
    expect(due(end, "notable")).toEqual([4, 5, 25, 31]);
    expect(due(end, "big")).toEqual([4, 25, 31]);
    expect(due(end, "decider")).toEqual([31]);
  });
  test("never one that already fired", () => {
    const end = fixtureTimes[fixtureTimes.length - 1];
    expect(due(end, "big", [4, 25])).toEqual([31]);
    expect(due(end, "big", [4, 25, 31])).toEqual([]);
  });
});

describe("pickNotification", () => {
  test("a jump over several alerts notifies at most the newest", () => {
    const elapsed = fixtureTimes[31] - 5_000; // inside the last alert's lead window
    const due = dueAlerts(fixtureAlerts, fixtureTimes, elapsed, "notable", new Set());
    expect(due.map((a) => a.i)).toEqual([4, 5, 25, 31]);
    expect(pickNotification(due, fixtureTimes, elapsed)?.i).toBe(31);
  });
  test("a stale alert is not sent as a notification", () => {
    const elapsed = fixtureTimes[31] + 60_000; // long after it was due
    const due = dueAlerts(fixtureAlerts, fixtureTimes, elapsed, "notable", new Set());
    expect(due.length).toBe(4);
    expect(pickNotification(due, fixtureTimes, elapsed)).toBeNull();
  });
  test("activeAlert is on only during the lead window", () => {
    expect(activeAlert(fixtureAlerts, fixtureTimes, fixtureTimes[31] - 5_000, "big")?.i).toBe(31);
    expect(activeAlert(fixtureAlerts, fixtureTimes, fixtureTimes[31] + 1, "big")).toBeNull();
    expect(activeAlert(fixtureAlerts, fixtureTimes, fixtureTimes[5] - 5_000, "big")).toBeNull();
  });
});

describe("the shelf", () => {
  const moments = detectMoments(fixtureTicks, fixtureThresholds);

  test("holds only moments that have happened, newest first", () => {
    expect(shelfAt(moments, -1)).toEqual([]);
    expect(shelfAt(moments, 3)).toEqual([]);
    expect(shelfAt(moments, 15).map((m) => m.i)).toEqual([15, 12, 4]);
    expect(shelfAt(moments, 14).map((m) => m.i)).toEqual([12, 4]);
  });

  test("seen when watching, missed when hidden or in Focus", () => {
    const watching = { hidden: false, focus: false };
    expect(markPassed(moments, {}, 3, 4, watching)).toEqual({ m_4: "seen" });
    expect(markPassed(moments, {}, 3, 4, { hidden: true, focus: false })).toEqual({
      m_4: "missed",
    });
    expect(markPassed(moments, {}, 3, 4, { hidden: false, focus: true })).toEqual({
      m_4: "missed",
    });
  });

  test("a jump marks the moments it passed as missed, and keeps earlier marks", () => {
    const marks = markPassed(moments, { m_4: "seen" }, 4, 15, { hidden: false, focus: false });
    expect(marks).toEqual({ m_4: "seen", m_12: "missed", m_15: "seen" });
  });

  test("missed moments come oldest first, and can be marked seen", () => {
    const marks = { m_4: "missed", m_12: "seen", m_15: "missed", m_18: "missed" } as const;
    expect(missedMoments(moments, marks, 16).map((m) => m.i)).toEqual([4, 15]);
    const after = markSeen(marks, ["m_4", "m_15"]);
    expect(missedMoments(moments, after, 16)).toEqual([]);
  });
});

describe("the engine is sport-agnostic", () => {
  test("lib/engine, lib/clock and lib/cards never import the cricket adapter or name the sport", () => {
    const root = path.resolve(__dirname, "..");
    const offenders: string[] = [];
    for (const dir of ["engine", "clock", "cards"]) {
      let files: string[] = [];
      try {
        files = readdirSync(path.join(root, dir), { recursive: true }) as string[];
      } catch {
        continue;
      }
      for (const f of files) {
        if (!/\.(ts|tsx)$/.test(f) || /\.test\.tsx?$/.test(f)) continue;
        const text = readFileSync(path.join(root, dir, f), "utf8");
        if (/adapters\/cricket|cricket/i.test(text)) offenders.push(`${dir}/${f}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
