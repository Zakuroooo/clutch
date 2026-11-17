"use client";
/**
 * A watch-together room over Supabase Realtime: presence (who is here), broadcast (chat,
 * reactions, the match clock, and voice call set-up). Voice audio goes straight between
 * phones over WebRTC. Nothing is written to a database; a room lives as long as someone is
 * in it (docs/DECISIONS/0011-rooms-without-tables.md).
 */
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import type { Anchor } from "@/lib/clock/anchor";
import {
  cleanChat,
  cleanName,
  isCode,
  parseMessage,
  type ChatMessage,
  type Reaction,
} from "@/lib/room/protocol";
import { ICE_SERVERS, level, MAX_VOICE, shouldOffer, SPEAKING_LEVEL, toCall } from "@/lib/room/voice";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
/** Rooms show only when the deploy has a Supabase project. Watching alone never needs it. */
export const ROOMS_ENABLED = Boolean(URL && KEY);

const MAX_CHAT = 100;
const FLOAT_MS = 2_600;

export type Member = { id: string; name: string; voice: boolean; muted: boolean };
export type Float = Reaction & { id: string };
export type VoiceState = "off" | "asking" | "on" | "denied" | "full" | "unsupported";
export type RoomState = {
  status: "idle" | "connecting" | "live" | "error";
  code: string | null;
  me: Member | null;
  members: Member[];
  chat: ChatMessage[];
  floats: Float[];
  /** Who last moved the shared clock, shown as "Ravi moved the match". */
  lastMove: { name: string; at: number } | null;
  voice: VoiceState;
  muted: boolean;
  /** Member ids whose voice is loud right now. */
  speaking: string[];
  /** Member ids we could not reach for voice (a network that blocks direct calls). */
  unreachable: string[];
};

type ClockLink = {
  anchor(): Anchor;
  adoptAnchor(a: Anchor): void;
  onAnchorChange(l: (a: Anchor) => void): () => void;
};

const IDLE: RoomState = {
  status: "idle",
  code: null,
  me: null,
  members: [],
  chat: [],
  floats: [],
  lastMove: null,
  voice: "off",
  muted: false,
  speaking: [],
  unreachable: [],
};

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let unlinkClock: (() => void) | null = null;
let state: RoomState = IDLE;
const listeners = new Set<() => void>();

// Voice
let mic: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let meter: number | null = null;
const peers = new Map<string, RTCPeerConnection>();
const pendingIce = new Map<string, RTCIceCandidateInit[]>();
/** Offers that arrived before the caller showed as in voice: answered once they do. */
const pendingOffers = new Map<string, { offer: RTCSessionDescriptionInit; at: number }>();
const OFFER_WAIT_MS = 10_000;
const players = new Map<string, HTMLAudioElement>();
const analysers = new Map<string, AnalyserNode>();

function set(next: Partial<RoomState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function id(): string {
  return Math.random().toString(36).slice(2, 10);
}

function addFloat(r: Reaction) {
  const f = { ...r, id: id() };
  set({ floats: [...state.floats, f].slice(-12) });
  setTimeout(() => set({ floats: state.floats.filter((x) => x.id !== f.id) }), FLOAT_MS);
}

function track() {
  if (!channel || !state.me) return;
  void channel.track({ name: state.me.name, voice: state.voice === "on", muted: state.muted });
}

export async function joinRoom(rawCode: string, rawName: string, clock: ClockLink) {
  if (!ROOMS_ENABLED || !isCode(rawCode)) return;
  await leaveRoom();
  const code = rawCode.trim().toUpperCase();
  const me: Member = { id: id(), name: cleanName(rawName), voice: false, muted: false };
  set({ ...IDLE, status: "connecting", code, me });
  client ??= createClient(URL!, KEY!, { auth: { persistSession: false } });
  const ch = client.channel(`room:${code}`, {
    config: { broadcast: { self: false }, presence: { key: me.id } },
  });
  channel = ch;

  ch.on("presence", { event: "sync" }, () => {
    const seen = ch.presenceState<{ name: string; voice?: boolean; muted?: boolean }>();
    const members = Object.entries(seen).map(([key, metas]) => ({
      id: key,
      name: cleanName(metas[0]?.name ?? "Fan"),
      voice: Boolean(metas[0]?.voice),
      muted: Boolean(metas[0]?.muted),
    }));
    set({ members });
    syncCalls();
  });
  for (const event of ["chat", "react", "anchor", "hello"]) {
    ch.on("broadcast", { event }, ({ payload }) => {
      const m = parseMessage(event, payload);
      if (!m) return;
      if (m.kind === "chat") set({ chat: [...state.chat, m.chat].slice(-MAX_CHAT) });
      if (m.kind === "react") addFloat(m.react);
      if (m.kind === "anchor") {
        clock.adoptAnchor(m.anchor);
        if (m.name) {
          const move = { name: m.name, at: Date.now() };
          set({ lastMove: move });
          setTimeout(() => state.lastMove === move && set({ lastMove: null }), 8_000);
        }
      }
      // Someone just joined: tell them where the match is.
      if (m.kind === "hello")
        void ch.send({ type: "broadcast", event: "anchor", payload: { anchor: clock.anchor() } });
    });
  }
  ch.on("broadcast", { event: "rtc" }, ({ payload }) => void onSignal(payload));

  ch.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      track();
      set({ status: "live" });
      void ch.send({ type: "broadcast", event: "hello", payload: {} });
    }
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") set({ status: "error" });
  });

  // When I skip, pause or change speed, everyone follows.
  unlinkClock = clock.onAnchorChange((anchor) => {
    void ch.send({ type: "broadcast", event: "anchor", payload: { anchor, name: me.name } });
  });
}

export async function leaveRoom() {
  leaveVoice();
  unlinkClock?.();
  unlinkClock = null;
  if (channel && client) await client.removeChannel(channel);
  channel = null;
  set(IDLE);
}

export function sendChat(text: string): { ok: true } | { ok: false; reason: string } {
  const c = cleanChat(text);
  if (!c.ok) return c;
  if (!channel || !state.me) return { ok: false, reason: "Not in a room." };
  const msg: ChatMessage = { id: id(), name: state.me.name, text: c.text, at: Date.now() };
  set({ chat: [...state.chat, msg].slice(-MAX_CHAT) });
  void channel.send({ type: "broadcast", event: "chat", payload: msg });
  return { ok: true };
}

export function react(emoji: Reaction["emoji"]) {
  if (!channel || !state.me) return;
  const r = { name: state.me.name, emoji };
  addFloat(r);
  void channel.send({ type: "broadcast", event: "react", payload: r });
}

// ---- Voice ----

/** Join the room's voice: ask for the microphone once, then talk freely, like a call. */
export async function joinVoice() {
  if (!channel || !state.me || state.voice === "on") return;
  if (typeof RTCPeerConnection === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    set({ voice: "unsupported" });
    return;
  }
  if (state.members.filter((m) => m.voice).length >= MAX_VOICE) {
    set({ voice: "full" });
    return;
  }
  set({ voice: "asking" });
  try {
    mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    set({ voice: "denied" });
    return;
  }
  audioCtx = new AudioContext();
  // Browsers start an AudioContext paused unless a tap is fresh; the meter needs it running.
  void audioCtx.resume();
  watchLevel(state.me.id, mic);
  set({ voice: "on", muted: false, unreachable: [] });
  track();
  startMeter();
  syncCalls();
}

export function leaveVoice() {
  for (const pc of peers.values()) pc.close();
  peers.clear();
  pendingIce.clear();
  pendingOffers.clear();
  for (const a of players.values()) {
    a.srcObject = null;
    a.remove();
  }
  players.clear();
  analysers.clear();
  mic?.getTracks().forEach((t) => t.stop());
  mic = null;
  if (meter !== null) window.clearInterval(meter);
  meter = null;
  void audioCtx?.close();
  audioCtx = null;
  if (state.voice !== "off") {
    set({ voice: "off", muted: false, speaking: [], unreachable: [] });
    track();
  }
}

export function toggleMute() {
  if (!mic) return;
  const muted = !state.muted;
  mic.getAudioTracks().forEach((t) => (t.enabled = !muted));
  set({ muted });
  track();
}

function watchLevel(memberId: string, stream: MediaStream) {
  if (!audioCtx) return;
  const node = audioCtx.createAnalyser();
  node.fftSize = 512;
  audioCtx.createMediaStreamSource(stream).connect(node);
  analysers.set(memberId, node);
}

function startMeter() {
  if (meter !== null) return;
  const frame = new Uint8Array(512);
  meter = window.setInterval(() => {
    if (audioCtx?.state === "suspended") void audioCtx.resume();
    const speaking: string[] = [];
    for (const [who, node] of analysers) {
      if (who === state.me?.id && state.muted) continue;
      node.getByteTimeDomainData(frame);
      if (level(frame) > SPEAKING_LEVEL) speaking.push(who);
    }
    if (speaking.join() !== state.speaking.join()) set({ speaking });
  }, 150);
}

function signal(to: string, kind: "offer" | "answer" | "ice", data: unknown) {
  if (!channel || !state.me) return;
  void channel.send({
    type: "broadcast",
    event: "rtc",
    payload: { from: state.me.id, to, kind, data },
  });
}

function peerFor(other: string): RTCPeerConnection {
  const existing = peers.get(other);
  if (existing) return existing;
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  peers.set(other, pc);
  mic?.getTracks().forEach((t) => pc.addTrack(t, mic!));
  pc.onicecandidate = (e) => e.candidate && signal(other, "ice", e.candidate.toJSON());
  pc.ontrack = (e) => {
    const [stream] = e.streams;
    if (!stream) return;
    let audio = players.get(other);
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.hidden = true;
      document.body.appendChild(audio);
      players.set(other, audio);
    }
    audio.srcObject = stream;
    void audio.play().catch(() => {});
    watchLevel(other, stream);
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed")
      set({ unreachable: [...new Set([...state.unreachable, other])] });
    if (pc.connectionState === "connected")
      set({ unreachable: state.unreachable.filter((x) => x !== other) });
  };
  return pc;
}

function dropPeer(other: string) {
  peers.get(other)?.close();
  peers.delete(other);
  pendingIce.delete(other);
  const a = players.get(other);
  if (a) {
    a.srcObject = null;
    a.remove();
  }
  players.delete(other);
  analysers.delete(other);
}

/** After presence changes: call new voice members, hang up on ones who left voice. */
function syncCalls() {
  if (state.voice !== "on" || !state.me) return;
  const inVoice = new Set(state.members.filter((m) => m.voice).map((m) => m.id));
  // Answer calls that arrived before the caller's in-voice status did.
  for (const [from, held] of [...pendingOffers]) {
    if (Date.now() - held.at > OFFER_WAIT_MS) pendingOffers.delete(from);
    else if (inVoice.has(from)) {
      pendingOffers.delete(from);
      void answer(from, held.offer);
    }
  }
  for (const other of [...peers.keys()]) if (!inVoice.has(other)) dropPeer(other);
  for (const other of toCall(state.me.id, state.members, new Set(peers.keys()))) {
    const pc = peerFor(other);
    void (async () => {
      await pc.setLocalDescription(await pc.createOffer());
      signal(other, "offer", pc.localDescription?.toJSON());
    })();
  }
}

async function onSignal(payload: unknown) {
  const p = payload as { from?: string; to?: string; kind?: string; data?: unknown };
  if (!state.me || p.to !== state.me.id || typeof p.from !== "string" || state.voice !== "on")
    return;
  const other = p.from;
  // Only someone in the room's voice may call me, and only from the side allowed to offer.
  // Their in-voice status can arrive a moment after their offer: hold it until it does.
  const sender = state.members.find((m) => m.id === other);
  if (p.kind === "offer") {
    if (!shouldOffer(other, state.me.id)) return;
    if (!sender?.voice) {
      pendingOffers.set(other, { offer: p.data as RTCSessionDescriptionInit, at: Date.now() });
      return;
    }
    await answer(other, p.data as RTCSessionDescriptionInit);
    return;
  }
  if (!sender?.voice) {
    // A candidate can also beat the status; keep it for when the call is answered.
    if (p.kind === "ice" && pendingOffers.has(other))
      pendingIce.set(other, [...(pendingIce.get(other) ?? []), p.data as RTCIceCandidateInit]);
    return;
  }
  try {
    if (p.kind === "answer") {
      const pc = peers.get(other);
      if (!pc) return;
      await pc.setRemoteDescription(p.data as RTCSessionDescriptionInit);
      for (const c of pendingIce.get(other) ?? []) await pc.addIceCandidate(c);
      pendingIce.delete(other);
    } else if (p.kind === "ice") {
      const pc = peers.get(other);
      const c = p.data as RTCIceCandidateInit;
      if (pc?.remoteDescription) await pc.addIceCandidate(c);
      else pendingIce.set(other, [...(pendingIce.get(other) ?? []), c]);
    }
  } catch {
    set({ unreachable: [...new Set([...state.unreachable, other])] });
  }
}

async function answer(other: string, offer: RTCSessionDescriptionInit) {
  try {
    const pc = peerFor(other);
    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());
    signal(other, "answer", pc.localDescription?.toJSON());
    for (const c of pendingIce.get(other) ?? []) await pc.addIceCandidate(c);
    pendingIce.delete(other);
  } catch {
    set({ unreachable: [...new Set([...state.unreachable, other])] });
  }
}

export function useRoom(): RoomState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => IDLE,
  );
}
