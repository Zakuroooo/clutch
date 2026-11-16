import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { allNames, facts, progress } from "@/lib/adapters/cricket/facts";
import { loadMatch } from "@/lib/adapters/cricket/load";
import { detectMoments, detectNewBatters } from "@/lib/adapters/cricket/moments";
import { WORLDS, type World } from "@/lib/engine/types";
import { fixtureMatch, fixtureThresholds, fixtureTicks } from "@/lib/testing/fixture-match";
import { anchorsFor } from "./anchors";
import { check } from "./check";
import { FactsSchema, type Facts } from "./schema";
import { plainTemplate, templateCard } from "./templates";

const moments = detectMoments(fixtureTicks, fixtureThresholds);
const newBatters = detectNewBatters(fixtureTicks, fixtureThresholds);
const f = (id: string): Facts => {
  const m = moments.find((x) => x.id === id) ?? newBatters.find((x) => x.id === id)!;
  return facts(m, fixtureTicks, fixtureMatch, {
    "B Marlow": {
      id: "x", team: "Bravos", jersey: null, matches: 41,
      batting: { innings: 30, runs: 600, average: 24.5, strike_rate: 131.2, fifties: 2, sixes: 20, chase_innings: 12, chase_average: 22, chase_fifties: 1, chase_not_outs: 3, death_strike_rate: null },
      bowling: { innings: 0, wickets: 0, economy: null, death_economy: null },
    },
  }); // prettier-ignore
};

describe("facts", () => {
  test("a wicket in the chase, written out by hand", () => {
    const got = f("m_25");
    expect(got).toEqual({
      moment_id: "m_25",
      kind: "wicket_big",
      over_label: "1.1",
      batting_team: "Bravos",
      bowling_team: "Alphas",
      score_before: "12/0",
      score_after: "12/1",
      needed: 19,
      balls_left: 11,
      wickets_left: 9,
      batter: "B Lomax",
      bowler: "A Zoller",
      runs_off_ball: 0,
      wicket: { kind: "lbw", player_out: "B Lomax", fielder: null },
      batter_runs: 7,
      batter_balls: 4,
      over_runs: null,
      chance_team: "Bravos",
      chance_before: 86,
      chance_after: 72,
      who_gained: "Alphas",
      result: null,
      new_batter: null,
      numbers: [0, 1, 1.1, 4, 7, 9, 11, 12, 19, 72, 86],
      names: ["Bravos", "Alphas", "B Lomax", "Lomax", "A Zoller", "Zoller"],
    });
    expect(FactsSchema.safeParse(got).success).toBe(true);
  });

  test("a big over: the whole over, from its first ball", () => {
    expect(f("m_12")).toMatchObject({
      kind: "over_big",
      score_before: "14/1",
      score_after: "20/1",
      over_runs: 6,
      batter: null,
      wicket: null,
      chance_team: "Alphas",
      chance_before: 51,
      chance_after: 35,
      who_gained: "Bravos",
      needed: null,
    });
  });

  test("the innings end says what the other side must chase", () => {
    expect(f("m_18")).toMatchObject({
      kind: "innings_end",
      score_after: "30/2",
      needed: 31,
      balls_left: 18,
      result: null,
    });
  });

  test("the result", () => {
    expect(f("m_36")).toMatchObject({
      kind: "result",
      result: { winner: "Bravos", margin: "8 wickets" },
      chance_team: "Bravos",
      chance_after: 100,
      who_gained: "Bravos",
    });
  });

  test("a new batter, with career counts from the player file or zero", () => {
    expect(f("nb_26").new_batter).toEqual({
      name: "B Marlow",
      matches: 41,
      strike_rate: 131.2,
      average: 24.5,
    });
    expect(f("nb_5").new_batter).toEqual({
      name: "A Catto",
      matches: 0,
      strike_rate: null,
      average: null,
    });
  });

  test("numbers and names cover every number and name in the other fields", () => {
    for (const subject of [...moments, ...newBatters]) {
      const got = f(subject.id);
      const { numbers, names, ...rest } = got;
      const text = JSON.stringify(rest);
      for (const m of text.matchAll(/\d+(?:\.\d+)?/g)) {
        if (
          /^(m|nb)_/.test(got.moment_id) &&
          m.index &&
          text.slice(m.index - 3, m.index).match(/_$/)
        )
          continue; // the id
        expect(numbers, `${got.moment_id}: ${m[0]}`).toContain(Number(m[0]));
      }
      for (const name of [
        got.batting_team,
        got.bowling_team,
        got.batter,
        got.bowler,
        got.wicket?.player_out,
        got.result?.winner,
        got.new_batter?.name,
      ]) {
        if (name) expect(names).toContain(name);
      }
    }
  });
});

describe("anchors", () => {
  const at = (p: number, part: 1 | 2 = 1) => ({ p, q: 0, part });
  test.each([
    ["football", 0, { minute: 0, minutes_left: 90 }],
    ["football", 0.5, { minute: 45, minutes_left: 45 }],
    ["football", 1, { minute: 90, minutes_left: 0 }],
    ["f1", 0, { lap: 1, laps_left: 49, total_laps: 50 }],
    ["f1", 0.5, { lap: 25, laps_left: 25, total_laps: 50 }],
    ["f1", 1, { lap: 50, laps_left: 0, total_laps: 50 }],
    ["chess", 0, { move: 1 }],
    ["chess", 0.5, { move: 20 }],
    ["chess", 1, { move: 40 }],
    ["gaming", 0, { round: 1, total_rounds: 12 }],
    ["gaming", 0.5, { round: 6, total_rounds: 12 }],
    ["gaming", 1, { round: 12, total_rounds: 12 }],
    ["plain", 0.5, {}],
  ] as const)("%s at %s", (world, p, expected) => {
    expect(anchorsFor(world, at(p))).toEqual(expected);
  });
  test("bollywood: act 1 before the break, act 2 after", () => {
    expect(anchorsFor("bollywood", at(0.3, 1))).toEqual({ act: 1 });
    expect(anchorsFor("bollywood", at(0.7, 2))).toEqual({ act: 2 });
  });
  test("progress through the fixture", () => {
    expect(progress(fixtureTicks, 0)).toMatchObject({ part: 1 });
    expect(progress(fixtureTicks, 18)).toEqual({ p: 0.5, q: 1, part: 1 });
    expect(progress(fixtureTicks, 36)).toEqual({ p: 1, q: 1, part: 2 });
  });
});

type Case = {
  id: string;
  must_fail: string | null;
  note: string;
  world: World;
  facts: Facts;
  anchors: Record<string, number>;
  match_names: string[];
  card: unknown;
};
const cases: Case[] = readFileSync(
  path.join(process.cwd(), "evals", "cases", "adversarial.jsonl"),
  "utf8",
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));

describe("the adversarial set", () => {
  const planted = cases.filter((c) => c.must_fail);
  const good = cases.filter((c) => !c.must_fail);

  test("has 30 planted errors, at least three per rule, and 10 good cards", () => {
    expect(planted.length).toBe(30);
    expect(good.length).toBe(10);
    for (const rule of ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"]) {
      expect(planted.filter((c) => c.must_fail === rule).length, rule).toBeGreaterThanOrEqual(3);
    }
  });

  test.each(planted.map((c) => [c.id, c.must_fail, c.note, c] as const))(
    "%s is rejected by %s: %s",
    (_id, rule, _note, c) => {
      const result = check(c.card, c.facts, c.anchors, c.world, c.match_names);
      expect(result).toMatchObject({ ok: false, rule });
    },
  );

  test.each(good.map((c) => [c.id, c.note, c] as const))("%s passes: %s", (_id, _note, c) => {
    expect(check(c.card, c.facts, c.anchors, c.world, c.match_names)).toEqual({ ok: true });
  });
});

describe("templates", () => {
  test("every template for every moment and world of the fixture passes the check", () => {
    const names = allNames(fixtureTicks, fixtureMatch);
    for (const subject of [...moments, ...newBatters]) {
      const facts = f(subject.id);
      for (const world of WORLDS) {
        const anchors = anchorsFor(world, progress(fixtureTicks, subject.i));
        const t = templateCard(facts, world, anchors);
        const result = check(t.card, facts, t.world === "plain" ? {} : anchors, t.world, names);
        expect(result, `${subject.id} ${world}: ${JSON.stringify(t.card)}`).toEqual({ ok: true });
      }
    }
  });

  test("every template for every moment and world of the replay match passes the check", async () => {
    const { match, ticks, moments, newBatters, players } = await loadMatch(
      JSON.parse(readFileSync("data/replay.json", "utf8")).match_id,
    );
    const names = allNames(ticks, match);
    let count = 0;
    for (const subject of [...moments, ...newBatters]) {
      const facts_ = facts(subject, ticks, match, players);
      for (const world of WORLDS) {
        const anchors = anchorsFor(world, progress(ticks, subject.i));
        const t = templateCard(facts_, world, anchors);
        const result = check(t.card, facts_, t.world === "plain" ? {} : anchors, t.world, names);
        expect(result, `${subject.id} ${world}: ${JSON.stringify(t.card)}`).toEqual({ ok: true });
        count += 1;
      }
    }
    expect(count).toBeGreaterThan(100);
  });

  test("a wicket where the batting side somehow gained stays plain", () => {
    const facts_ = { ...f("m_25"), who_gained: "Bravos" };
    expect(templateCard(facts_, "football", { minute: 62, minutes_left: 28 }).world).toBe("plain");
    expect(plainTemplate(facts_).why).toContain("86 to 72");
  });
});

describe("R4 and the match's own names", () => {
  test("a player whose name is on a deny-list is allowed when the facts name them", () => {
    const base = f("m_25");
    const facts_ = {
      ...base,
      batter: "Anand Kumar",
      names: [...base.names, "Anand Kumar", "Kumar", "Anand"],
    };
    const card = { ...plainTemplate(facts_), headline: "Anand Kumar walks out." };
    expect(check(card, facts_, {}, "plain", [])).toEqual({ ok: true });
    // The famous one is still blocked when the match has no such player.
    expect(check({ ...card, headline: "Anand walks out." }, base, {}, "plain", [])).toMatchObject({
      ok: false,
      rule: "R4",
    });
  });
});
