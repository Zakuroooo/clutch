import { describe, expect, it } from "vitest";
import { ABUSE, BANNED } from "@/lib/cards/lists";
import { BLOCKED } from "./words";
import { cleanChat, cleanName, isCode, makeCode, parseMessage, REACTIONS } from "./protocol";

describe("room codes", () => {
  it("are six letters or digits with no look-alikes", () => {
    const code = makeCode(() => 0.5);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(code).not.toMatch(/[01OIL]/);
    expect(isCode(code)).toBe(true);
  });
  it("accepts a code typed in lower case and rejects nonsense", () => {
    expect(isCode("kxt4pm")).toBe(true);
    expect(isCode("KXT4P")).toBe(false);
    expect(isCode("KXT4P0")).toBe(false);
  });
});

describe("chat", () => {
  it("trims and keeps a normal message", () => {
    expect(cleanChat("  what a catch!  ")).toEqual({ ok: true, text: "what a catch!" });
  });
  it("rejects an empty message", () => {
    expect(cleanChat("   ").ok).toBe(false);
  });
  it("cuts a long message to 140 characters", () => {
    const r = cleanChat("a".repeat(500));
    expect(r.ok && r.text.length).toBe(140);
  });
  it("blocks betting language", () => {
    expect(cleanChat("what are the odds now").ok).toBe(false);
    expect(cleanChat("place a BET on India").ok).toBe(false);
  });
  it("does not block a word that only contains a blocked word", () => {
    expect(cleanChat("better bowling from Bumrah").ok).toBe(true);
  });
  it("blocks the same words as the card check", () => {
    expect([...BLOCKED].sort()).toEqual([...new Set([...BANNED, ...ABUSE])].sort());
  });
});

describe("names", () => {
  it("keeps a short name and falls back to Fan", () => {
    expect(cleanName(" Pranay ")).toBe("Pranay");
    expect(cleanName("")).toBe("Fan");
    expect(cleanName("x".repeat(40)).length).toBe(20);
  });
});

describe("messages from the channel", () => {
  it("accepts a well-formed chat and reaction", () => {
    expect(parseMessage("chat", { id: "a", name: "R", text: "hi", at: 1 })).not.toBeNull();
    expect(parseMessage("react", { name: "R", emoji: REACTIONS[0] })).not.toBeNull();
  });
  it("drops a chat that breaks the rules even if another client sent it", () => {
    expect(parseMessage("chat", { id: "a", name: "R", text: "nice odds", at: 1 })).toBeNull();
  });
  it("drops an unknown reaction and a malformed clock", () => {
    expect(parseMessage("react", { name: "R", emoji: "💰" })).toBeNull();
    expect(parseMessage("anchor", { anchor: { anchor_at: "x" } })).toBeNull();
  });
});
