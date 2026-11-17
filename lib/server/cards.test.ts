import { beforeEach, describe, expect, test } from "vitest";
import { detectMoments, detectNewBatters } from "@/lib/adapters/cricket/moments";
import type { MatchBundle } from "@/components/MatchProvider";
import type { LlmProvider } from "@/lib/llm";
import { getProvider } from "@/lib/llm";
import {
  fixtureAlerts,
  fixtureMatch,
  fixtureThresholds,
  fixtureTicks,
} from "@/lib/testing/fixture-match";
import { cardFor, clearCardCache } from "./cards";

const bundle: MatchBundle = {
  match: fixtureMatch,
  ticks: fixtureTicks,
  alerts: fixtureAlerts,
  moments: detectMoments(fixtureTicks, fixtureThresholds),
  newBatters: detectNewBatters(fixtureTicks, fixtureThresholds),
  thresholds: fixtureThresholds,
  players: {},
  people: {},
  cards: {},
  promise: null,
  model: null,
  video: null,
};

const GOOD = {
  headline: "Bravos lose their opener.",
  what: "B Lomax is out lbw for 7 off 4 balls. Bravos are 12/1.",
  why: "It is like losing your striker to a red card at minute 62. Alphas have the momentum.",
  watch: "Bravos need 19 from 11 balls.",
  used_facts: ["wicket", "needed"],
};

function fake(replies: unknown[]): LlmProvider & { calls: number } {
  const p = {
    name: "fake",
    calls: 0,
    async generateJson() {
      const reply = replies[Math.min(p.calls, replies.length - 1)];
      p.calls += 1;
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
  return p;
}

beforeEach(clearCardCache);

describe("cardFor", () => {
  test("returns the pre-generated card when there is one", async () => {
    const pregen = { ...GOOD, moment_id: "m_25", world: "football", kind: "wicket_big", source: "pregen", checked: true, over_label: "1.1", chance_team: "Bravos", chance_before: 86, chance_after: 72 } as const; // prettier-ignore
    const provider = fake([GOOD]);
    const card = await cardFor(
      { ...bundle, cards: { "m_25:football": pregen } },
      "m_25",
      "football",
      provider,
    );
    expect(card).toEqual(pregen);
    expect(provider.calls).toBe(0);
  });

  test("a card that passes the check is returned as live, and checked", async () => {
    const card = await cardFor(bundle, "m_25", "football", fake([GOOD]));
    expect(card).toMatchObject({
      source: "live",
      checked: true,
      headline: GOOD.headline,
      world: "football",
    });
  });

  test("a failing LLM gets one retry, then the template; an unchecked card is never returned", async () => {
    const wrong = { ...GOOD, watch: "Bravos need 25 from 11 balls." }; // 25 is not in the facts
    const provider = fake([wrong, wrong]);
    const card = await cardFor(bundle, "m_25", "football", provider);
    expect(provider.calls).toBe(2);
    expect(card).toMatchObject({ source: "template", checked: true });
    expect(card!.watch).toBe("Bravos need 19 from 11 balls.");
    expect(JSON.stringify(card)).not.toContain("25 from");
  });

  test("a retry that passes is used", async () => {
    const provider = fake([{ nonsense: true }, GOOD]);
    const card = await cardFor(bundle, "m_25", "football", provider);
    expect(provider.calls).toBe(2);
    expect(card).toMatchObject({ source: "live", headline: GOOD.headline });
  });

  test("an LLM that throws or times out gives the template", async () => {
    const card = await cardFor(bundle, "m_25", "football", fake([new Error("timeout")]));
    expect(card).toMatchObject({ source: "template", checked: true, world: "football" });
    expect(card!.why).toContain("red card");
  });

  test("with no provider it goes straight to the template", async () => {
    expect(getProvider({ LLM_PROVIDER: "none" })).toBeNull();
    expect(getProvider({ LLM_PROVIDER: "gemini" })).toBeNull(); // no key
    const card = await cardFor(bundle, "m_25", "plain", null);
    expect(card).toMatchObject({ source: "template", world: "plain" });
  });

  test("the same moment and world twice gives the identical card, from the cache", async () => {
    const provider = fake([GOOD]);
    const first = await cardFor(bundle, "m_25", "football", provider);
    const second = await cardFor(bundle, "m_25", "football", provider);
    expect(provider.calls).toBe(1);
    expect(second).toEqual({ ...first, source: "cache" });
  });

  test("an unknown moment gives null", async () => {
    expect(await cardFor(bundle, "m_999", "plain", null)).toBeNull();
  });
});
