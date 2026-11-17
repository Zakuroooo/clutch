import { describe, expect, it } from "vitest";
import { achievements, arrivals, compare, debatePoints, isPlayer, knownFor, roleOf } from "./profile";
import type { Player, Players } from "./types";

function p(over: Partial<Player> & { team: string }, bat: Partial<Player["batting"]> = {}, bowl: Partial<Player["bowling"]> = {}): Player {
  return {
    id: "x",
    jersey: null,
    matches: 20,
    player_of_match: 0,
    ...over,
    batting: {
      innings: 20, runs: 300, average: 20, strike_rate: 120, fifties: 0, hundreds: 0, highest: "40",
      sixes: 5, chase_innings: 8, chase_average: 18, chase_fifties: 0, chase_not_outs: 0, death_strike_rate: null,
      ...bat,
    },
    bowling: { innings: 0, wickets: 0, best: null, economy: null, death_economy: null, ...bowl },
  };
} // prettier-ignore

const players: Players = {
  Ace: p({ team: "Denmark", player_of_match: 7 }, { runs: 982, hundreds: 1, highest: "100", fifties: 6 }, { innings: 19, wickets: 29, best: "4/19" }),
  Bowl: p({ team: "Denmark" }, { runs: 15, highest: "6" }, { innings: 14, wickets: 20, best: "4/12" }),
  Bat: p({ team: "Denmark" }, { runs: 681, fifties: 5, highest: "63*" }),
  New: p({ team: "Denmark", matches: 0 }, { innings: 0, runs: 0, highest: null }),
  Rival: p({ team: "Germany", player_of_match: 3 }, { runs: 591, hundreds: 2, highest: "122" }),
}; // prettier-ignore

describe("roleOf", () => {
  it("calls a player with many runs and wickets an all-rounder", () => {
    expect(roleOf(players.Ace)).toBe("All-rounder");
  });
  it("calls a player with wickets and few runs a bowler", () => {
    expect(roleOf(players.Bowl)).toBe("Bowler");
  });
  it("calls a player with runs and no wickets a batter", () => {
    expect(roleOf(players.Bat)).toBe("Batter");
  });
  it("says so when there is no record before this match", () => {
    expect(roleOf(players.New)).toBe("New face");
  });
});

describe("knownFor", () => {
  it("names the team's top run-scorer and top wicket-taker in this line-up", () => {
    const lines = knownFor("Ace", players);
    expect(lines).toContain("Denmark's top run-scorer in this line-up: 982 runs");
    expect(lines).toContain("Denmark's top wicket-taker in this line-up: 29 wickets");
  });
  it("mentions hundreds and player-of-the-match awards", () => {
    expect(knownFor("Ace", players)).toContain("Player of the match 7 times");
    expect(knownFor("Rival", players)).toContain("Has a T20 hundred: best score 122");
  });
  it("gives at most three lines", () => {
    expect(knownFor("Ace", players).length).toBeLessThanOrEqual(3);
  });
  it("is honest about a player with no record", () => {
    expect(knownFor("New", players)).toEqual(["No T20 matches in our records before this one"]);
  });
  it("only uses numbers that are in the player's data", () => {
    for (const line of knownFor("Rival", players)) {
      for (const n of line.match(/\d+/g) ?? []) {
        expect(JSON.stringify(players.Rival)).toContain(n);
      }
    }
  });
});

describe("achievements", () => {
  it("lists the headline numbers, skipping ones that are empty", () => {
    const tiles = achievements(players.Bat);
    expect(tiles.map((t) => t.label)).toEqual(["matches", "runs", "best score", "fifties"]);
    expect(tiles.find((t) => t.label === "best score")?.value).toBe("63*");
  });
  it("shows bowling for a bowler", () => {
    const labels = achievements(players.Bowl).map((t) => t.label);
    expect(labels).toContain("wickets");
    expect(labels).toContain("best bowling");
  });
});

describe("debatePoints", () => {
  it("gives the strongest true claims first", () => {
    const points = debatePoints("Ace", players);
    expect(points[0]).toMatch(/top run-scorer/);
    expect(points.length).toBeGreaterThan(0);
    expect(points.length).toBeLessThanOrEqual(4);
  });
});

describe("compare", () => {
  it("marks who leads on each row and never invents a row", () => {
    const rows = compare("Ace", "Rival", players);
    const runs = rows.find((r) => r.label === "Runs")!;
    expect(runs.a).toBe(982);
    expect(runs.b).toBe(591);
    expect(runs.lead).toBe("a");
    const hundreds = rows.find((r) => r.label === "Hundreds")!;
    expect(hundreds.lead).toBe("b");
  });
  it("calls a tie a tie", () => {
    const rows = compare("Bat", "Bat", players);
    expect(rows.every((r) => r.lead === "tie")).toBe(true);
  });
});

describe("arrivals", () => {
  const ball = (i: number, batter: string, non_striker: string, bowler: string) => ({
    i,
    event: { batter, non_striker, bowler },
  });
  it("lists each player once, at the first ball they take part in", () => {
    const a = arrivals([ball(0, "A", "B", "X"), ball(1, "B", "A", "X"), ball(2, "C", "B", "Y")]);
    expect(a).toEqual([
      { i: 0, name: "A", as: "batter" },
      { i: 0, name: "B", as: "batter" },
      { i: 0, name: "X", as: "bowler" },
      { i: 2, name: "C", as: "batter" },
      { i: 2, name: "Y", as: "bowler" },
    ]);
  });
});

describe("isPlayer", () => {
  it("accepts a real player and refuses built-in object names", () => {
    expect(isPlayer(players, "Ace")).toBe(true);
    for (const bad of ["constructor", "__proto__", "toString", "hasOwnProperty", "", null, undefined])
      expect(isPlayer(players, bad)).toBe(false);
  });
  it("makes every profile function safe on a hostile name", () => {
    expect(knownFor("constructor", players)).toEqual(["No T20 matches in our records before this one"]);
    expect(debatePoints("__proto__", players)).toEqual([]);
    expect(compare("constructor", "Ace", players)).toEqual([]);
  });
});
