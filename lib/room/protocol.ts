/**
 * Watching together: what a room sends over its channel, and the rules every message
 * follows. Pure, so it is tested without a network. Nothing here is stored anywhere.
 */
import { z } from "zod";
import { BLOCKED } from "./words";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0, 1, O, I, L
export const CODE_LENGTH = 6;
export const MAX_CHAT = 140;
export const MAX_NAME = 20;
export const REACTIONS = ["🔥", "😱", "👏", "😂", "💔", "🏏"] as const;

/** A random number in [0, 1) from the browser's secure generator. */
function secureRandom(): number {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
}

export function makeCode(rand: () => number = secureRandom): string {
  let code = "";
  for (let k = 0; k < CODE_LENGTH; k++) code += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return code;
}

export function isCode(text: string): boolean {
  const t = text.trim().toUpperCase();
  return t.length === CODE_LENGTH && [...t].every((c) => ALPHABET.includes(c));
}

const blocked = BLOCKED.map((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"));

export function cleanChat(raw: string): { ok: true; text: string } | { ok: false; reason: string } {
  const text = raw.replace(/\s+/g, " ").trim().slice(0, MAX_CHAT);
  if (!text) return { ok: false, reason: "Type something first." };
  if (blocked.some((r) => r.test(text))) return { ok: false, reason: "That word isn't allowed here." };
  return { ok: true, text };
}

export function cleanName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  return name || "Fan";
}

const AnchorSchema = z.object({
  anchor_at: z.number(),
  anchor_elapsed_ms: z.number(),
  speed: z.number().min(0).max(64),
});
const Chat = z.object({ id: z.string(), name: z.string(), text: z.string(), at: z.number() });
const React = z.object({ name: z.string(), emoji: z.enum(REACTIONS) });
const AnchorMsg = z.object({ anchor: AnchorSchema, name: z.string().optional() });

export type ChatMessage = z.infer<typeof Chat>;
export type Reaction = z.infer<typeof React>;
export type Message =
  | { kind: "chat"; chat: ChatMessage }
  | { kind: "react"; react: Reaction }
  | { kind: "anchor"; anchor: z.infer<typeof AnchorSchema>; name?: string }
  | { kind: "hello" };

/** A message from another client, checked again here: never trust the sender. */
export function parseMessage(event: string, payload: unknown): Message | null {
  if (event === "hello") return { kind: "hello" };
  if (event === "chat") {
    const p = Chat.safeParse(payload);
    if (!p.success) return null;
    const c = cleanChat(p.data.text);
    return c.ok ? { kind: "chat", chat: { ...p.data, name: cleanName(p.data.name), text: c.text } } : null;
  }
  if (event === "react") {
    const p = React.safeParse(payload);
    return p.success ? { kind: "react", react: { ...p.data, name: cleanName(p.data.name) } } : null;
  }
  if (event === "anchor") {
    const p = AnchorMsg.safeParse(payload);
    return p.success ? { kind: "anchor", anchor: p.data.anchor, name: p.data.name } : null;
  }
  return null;
}
