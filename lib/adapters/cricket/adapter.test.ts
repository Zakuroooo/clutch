import { describe, expect, test } from "vitest";
import { fixtureMatch, fixtureThresholds, fixtureTicks } from "@/lib/testing/fixture-match";
import { detectMoments, detectNewBatters } from "./moments";
import { replayKind } from "./replayKind";
import { eventGlyph, scoreboardAt, segment } from "./scoreboard";
import type { CricketEvent, CricketTick } from "./types";

describe("scoreboard", () => {
  const at = (i: number) => scoreboardAt(fixtureTicks, i, fixtureMatch);

  test("before the first ball", () => {
    expect(at(-1).rows.map((r) => r.main + r.sub)).toEqual(["0/0", "–"]);
  });
  test("after a wide: the run counts, the ball does not", () => {
    expect(at(2).rows[0]).toEqual({
      team: "AAA",
      main: "6",
      sub: "/0",
      side: "batting",
      batting: true,
    });
    expect(fixtureTicks[2].state.balls_bowled).toBe(2);
    expect(at(2).chase).toEqual({ left: "Alphas are batting first", right: "16 balls left" });
  });
  test("after a wicket", () => {
    expect(at(4).rows[0]).toMatchObject({ main: "6", sub: "/1" });
    expect(at(4).rows[1]).toMatchObject({ main: "–", side: "yet to bat", batting: false });
  });
  test("at the innings change", () => {
    const view = at(18);
    expect(view.rows[0]).toEqual({
      team: "AAA",
      main: "30",
      sub: "/2",
      side: "3 overs",
      batting: false,
    });
    expect(view.chase).toEqual({ left: "Bravos need 31 to win", right: "Innings break" });
  });
  test("in the chase", () => {
    const view = at(19);
    expect(view.rows[0]).toMatchObject({ main: "30", sub: "/2", batting: false });
    expect(view.rows[1]).toEqual({
      team: "BBB",
      main: "4",
      sub: "/0",
      side: "batting",
      batting: true,
    });
    expect(view.chase).toEqual({ left: "Bravos need 27 from 17 balls", right: "10 wkts left" });
    expect(at(33).chase).toEqual({ left: "Bravos need 5 from 3 balls", right: "8 wkts left" });
    expect(at(35).chase?.left).toBe("Bravos need 2 from 1 ball");
  });
  test("finished: the real result", () => {
    const view = at(36);
    expect(view.rows[1]).toMatchObject({ main: "33", sub: "/2" });
    expect(view.chase).toEqual({ left: "Bravos won", right: "by 8 wickets" });
    expect(view.rows.every((r) => !r.batting)).toBe(true);
  });
});

describe("this over", () => {
  test("glyphs", () => {
    expect(fixtureTicks.slice(0, 7).map((t) => eventGlyph(t.event))).toEqual([
      "1",
      "4",
      "wd",
      "•",
      "W",
      "6",
      "2",
    ]);
  });
  test("bowled balls, then placeholders for the rest", () => {
    const s = segment(fixtureTicks, 4);
    expect(s.label).toBe("Over 1");
    expect(s.cells.map((c) => c.glyph)).toEqual(["1", "4", "wd", "•", "W", "5", "6"]);
    expect(s.cells.map((c) => c.tone)).toEqual([
      "plain",
      "four",
      "extra",
      "plain",
      "wicket",
      "next",
      "next",
    ]);
    expect(s.spoken).toBe("Over 1 so far: 1 run, 4 runs, wide, dot, wicket");
  });
  test("between overs it shows the next over, empty", () => {
    const s = segment(fixtureTicks, 6);
    expect(s.label).toBe("Over 2");
    expect(s.cells.every((c) => c.tone === "next")).toBe(true);
  });
  test("before the first ball", () => {
    expect(segment(fixtureTicks, -1).cells.length).toBe(6);
  });
});

describe("detectMoments", () => {
  const moments = detectMoments(fixtureTicks, fixtureThresholds);

  test("gives exactly the expected moments, one per ball at most", () => {
    expect(moments.map((m) => [m.i, m.kind])).toEqual([
      [4, "wicket_big"],
      [12, "over_big"],
      [15, "wicket_big"],
      [18, "innings_end"],
      [22, "swing"],
      [25, "wicket_big"],
      [32, "swing"],
      [33, "wicket_big"],
      [36, "result"],
    ]);
    expect(new Set(moments.map((m) => m.i)).size).toBe(moments.length);
  });

  test("ids, labels, swing and level", () => {
    expect(moments[0]).toEqual({
      id: "m_4",
      i: 4,
      kind: "wicket_big",
      level: "big",
      over_label: "0.4",
      swing: -0.12,
      replay_kind: "bowled",
    });
    expect(moments[1]).toMatchObject({
      kind: "over_big",
      swing: -0.16,
      replay_kind: "none",
      over_label: "1.6",
    });
    expect(moments.find((m) => m.i === 33)).toMatchObject({
      level: "decider",
      replay_kind: "run_out",
      swing: 0.18,
    });
    expect(moments.find((m) => m.i === 36)).toMatchObject({ kind: "result", replay_kind: "none" });
  });

  test("a wicket with a small swing still counts when the stakes are high", () => {
    const ticks = structuredClone(fixtureTicks);
    ticks[25].wp.after = ticks[25].wp.before + 0.01; // stakes.pct there is 80
    expect(detectMoments(ticks, fixtureThresholds).find((m) => m.i === 25)?.kind).toBe(
      "wicket_big",
    );
    ticks[25].stakes.pct = 10;
    expect(detectMoments(ticks, fixtureThresholds).find((m) => m.i === 25)).toBeUndefined();
  });

  test("a batter reaching 50 is a milestone", () => {
    const ticks = structuredClone(fixtureTicks) as CricketTick[];
    // A Catto has 6 + 2 before over 2; give the first ball of over 3 a made-up 42.
    ticks[13].event.runs = { bat: 42, extras: 0, total: 42 };
    ticks[13].wp.after = ticks[13].wp.before + 0.01;
    ticks[14].wp.before = ticks[13].wp.after;
    expect(detectMoments(ticks, fixtureThresholds).find((m) => m.i === 13)?.kind).toBe("milestone");
  });
});

describe("new batter events", () => {
  test("first ball of a batter who came in after a wicket, when stakes are building", () => {
    const events = detectNewBatters(fixtureTicks, fixtureThresholds);
    // A Catto at ball 5 (pct 60) and B Marlow at ball 26 (pct 72) qualify.
    // A Dovey at ball 16 (pct 10) does not. B Nesbit at ball 34 (pct 95) does.
    expect(events.map((e) => [e.i, e.batter])).toEqual([
      [5, "A Catto"],
      [26, "B Marlow"],
      [34, "B Nesbit"],
    ]);
  });
});

describe("replayKind", () => {
  const base: CricketEvent = {
    innings: 1,
    over: 0,
    ball: 1,
    legal: true,
    batter: "x",
    bowler: "y",
    non_striker: "z",
    runs: { bat: 0, extras: 0, total: 0 },
    extras_kind: null,
    wicket: null,
  };
  const out = (kind: string) => ({ ...base, wicket: { kind, player_out: "x", fielders: [] } });

  test.each([
    [base, "dot"],
    [{ ...base, runs: { bat: 1, extras: 0, total: 1 } }, "runs"],
    [{ ...base, runs: { bat: 4, extras: 0, total: 4 } }, "four"],
    [{ ...base, runs: { bat: 6, extras: 0, total: 6 } }, "six"],
    [
      { ...base, legal: false, extras_kind: "wides", runs: { bat: 0, extras: 1, total: 1 } },
      "wide",
    ],
    [
      { ...base, legal: false, extras_kind: "noballs", runs: { bat: 0, extras: 1, total: 1 } },
      "no_ball",
    ],
    [{ ...base, extras_kind: "legbyes", runs: { bat: 0, extras: 1, total: 1 } }, "runs"],
    [out("bowled"), "bowled"],
    [out("caught"), "caught"],
    [out("caught and bowled"), "caught"],
    [out("lbw"), "lbw"],
    [out("run out"), "run_out"],
    [out("stumped"), "stumped"],
  ] as const)("%#", (event, kind) => {
    expect(replayKind(event as CricketEvent)).toBe(kind);
  });

  test("every outcome in the fixture has a drawing", () => {
    const kinds = new Set(fixtureTicks.map((t) => replayKind(t.event)));
    expect([...kinds].sort()).toEqual([
      "bowled",
      "caught",
      "dot",
      "four",
      "lbw",
      "run_out",
      "runs",
      "six",
      "wide",
    ]);
  });
});

describe("chapters", () => {
  test("mark where each part starts and say nothing about what happens", async () => {
    const { chapters } = await import("./chapters");
    const list = chapters(fixtureTicks, fixtureMatch);
    expect(list.map((c) => [c.label, c.i])).toEqual([
      ["The start", 0],
      ["The chase", 19],
    ]);
    expect(JSON.stringify(list)).not.toMatch(/won|wicket|out\b|six|four/i);
  });
});

describe("commentary", () => {
  test("says what the data says, ball by ball", async () => {
    const { commentary } = await import("./commentary");
    const lines = commentary(fixtureTicks, 6, fixtureMatch, 7);
    expect(lines.map((l) => [l.over, l.result, l.tone])).toEqual([
      ["0.6", "2 runs", "plain"],
      ["0.5", "SIX", "six"],
      ["0.4", "OUT, bowled", "wicket"],
      ["0.3", "no run", "plain"],
      ["0.3", "wide", "extra"],
      ["0.2", "FOUR", "four"],
      ["0.1", "1 run", "plain"],
    ]);
    expect(lines[2].who).toBe("Yarrow to Bexley");
    expect(lines[0].score).toBe("Alphas 14/1");
  });
  test("a catch names the fielder", async () => {
    const { commentaryLine } = await import("./commentary");
    expect(commentaryLine(fixtureTicks[15], fixtureMatch).result).toBe("OUT, caught by Glover");
  });
});
