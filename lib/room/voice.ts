/**
 * Voice in a room: the small rules, kept pure so they are tested. Audio goes straight
 * between phones (WebRTC); Supabase only passes the connection details along.
 */

/** Public STUN servers help two phones find each other. No TURN relay: on networks that
 * block direct connections, voice fails and chat still works. */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

/** Most rooms are a few friends; every phone talks to every other one. */
export const MAX_VOICE = 6;

/** For each pair, the member with the smaller id makes the offer, so both never do. */
export function shouldOffer(me: string, them: string): boolean {
  return me < them;
}

/** Members in voice that I should start a call with now. */
export function toCall(
  me: string,
  members: readonly { id: string; voice: boolean }[],
  connected: ReadonlySet<string>,
): string[] {
  return members
    .filter((m) => m.voice && m.id !== me && !connected.has(m.id) && shouldOffer(me, m.id))
    .map((m) => m.id);
}

/** Loudness of one frame of audio (time-domain bytes, 128 is silence), 0 to 1. */
export function level(frame: Uint8Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (const v of frame) {
    const x = (v - 128) / 128;
    sum += x * x;
  }
  return Math.sqrt(sum / frame.length);
}

export const SPEAKING_LEVEL = 0.04;
