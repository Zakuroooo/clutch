"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { debatePoints } from "@/lib/adapters/cricket/profile";
import {
  joinRoom,
  joinVoice,
  leaveRoom,
  leaveVoice,
  react,
  ROOMS_ENABLED,
  sendChat,
  toggleMute,
  useRoom,
} from "@/lib/client/room";
import { useSettings } from "@/lib/client/settings";
import { isCode, makeCode, MAX_CHAT, REACTIONS } from "@/lib/room/protocol";
import { AppBar } from "./AppBar";
import { useMatch, useMatchView } from "./MatchProvider";
import { useFullName } from "./PlayerPhoto";
import { ScoreStrip } from "./ScoreStrip";

const NAME_KEY = "clutch.name";

function savedName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Watch together: one room code, everyone on the same ball, chat and reactions. */
export function RoomScreen() {
  const { data, store } = useMatch();
  const view = useMatchView();
  const room = useRoom();
  const settings = useSettings();
  const full = useFullName();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const feed = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("code");
    queueMicrotask(() => {
      setName(savedName());
      if (fromLink && isCode(fromLink)) setCode(fromLink.toUpperCase());
    });
  }, []);
  useEffect(() => {
    feed.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [room.chat.length]);

  const enter = (c: string) => {
    try {
      window.localStorage.setItem(NAME_KEY, name);
    } catch {}
    void joinRoom(c, name, store);
  };
  const title = [data.match.event.name, data.match.event.stage].filter(Boolean).join(" · ");

  if (!ROOMS_ENABLED) {
    return (
      <main>
        <AppBar />
        <div className="wrap card pad">
          <h1 className="card-title">Rooms are off on this copy</h1>
          <p className="small muted">This copy of Clutch has no Supabase project set, so you can watch alone only.</p>
        </div>
      </main>
    );
  }

  if (room.status === "idle" || room.status === "error") {
    return (
      <main>
        <AppBar />
        <div className="wrap">
          <h1 className="page-h">Watch with friends</h1>
          <p className="muted">Everyone in a room sees the same ball at the same time. Chat, react, and settle who&apos;s better.</p>
          <label className="small muted" htmlFor="room-name" style={{ display: "block", marginTop: "var(--s-4)" }}>Your name</label>
          <input id="room-name" className="input" value={name} maxLength={20} placeholder="e.g. Pranay" onChange={(e) => setName(e.target.value)} />
          <div className="card pad room-choice">
            <b>Start a room</b>
            <p className="small muted">You get a code to send your friends.</p>
            <button type="button" className="btn go wide" onClick={() => enter(makeCode())} data-testid="room-start">
              Start a room
            </button>
          </div>
          <div className="card pad room-choice">
            <b>Join a friend</b>
            <input
              className="input code"
              value={code}
              maxLength={6}
              placeholder="6-letter code"
              aria-label="Room code"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button type="button" className="btn wide" disabled={!isCode(code)} onClick={() => enter(code)}>
              Join room
            </button>
          </div>
          {room.status === "error" ? <p className="small down-text">Could not connect. Check your internet and try again.</p> : null}
        </div>
      </main>
    );
  }

  const link = typeof window === "undefined" ? "" : `${window.location.origin}/match/room?code=${room.code}`;
  const mine = settings.favourite && data.players[settings.favourite] ? settings.favourite : null;
  const argue = mine ? `${full(mine)}: ${debatePoints(mine, data.players).slice(0, 2).join("; ")}`.slice(0, MAX_CHAT) : null;
  const send = (t: string) => {
    const r = sendChat(t);
    if (r.ok) {
      setText("");
      setError(null);
    } else setError(r.reason);
  };

  return (
    <main className="room">
      <AppBar />
      <div className="wrap">
        <section className="card hero pad room-head" aria-label="Room">
          <div className="row between">
            <div>
              <span className="micro muted">Room code</span>
              <div className="room-code num" data-testid="room-code">{room.code}</div>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const share = { title: "Watch with me on Clutch", text: `Join my room: ${room.code}`, url: link };
                if (navigator.share) void navigator.share(share).catch(() => {});
                else void navigator.clipboard?.writeText(link).then(() => setCopied(true));
              }}
            >
              {copied ? "Link copied" : "Invite friends"}
            </button>
          </div>
          <div className="members" aria-label={`${room.members.length} watching`}>
            {room.members.map((m) => (
              <span
                key={m.id}
                className={`member${m.id === room.me?.id ? " me" : ""}${room.speaking.includes(m.id) ? " speaking" : ""}`}
                title={`${m.name}${m.voice ? (m.muted ? ", muted" : ", in voice") : ""}`}
              >
                {m.name.slice(0, 1).toUpperCase()}
                {m.voice ? <i className={`mic${m.muted ? " off" : ""}`} aria-hidden="true" /> : null}
              </span>
            ))}
            <span className="small muted">
              {room.status === "connecting" ? "Connecting…" : `${room.members.length} watching`}
            </span>
          </div>
          {room.lastMove ? (
            <p className="micro muted" style={{ marginTop: "var(--s-2)" }}>{room.lastMove.name} moved the match. Everyone followed.</p>
          ) : null}
        </section>
      </div>

      <div className="wrap" style={{ marginTop: "var(--s-3)" }}>
        <VoicePanel />
      </div>

      <div className="wrap" style={{ marginTop: "var(--s-3)" }}>
        <ScoreStrip title={title} right={view.overText} view={view.scoreboard} progress={view.progress} />
      </div>

      <div className="wrap reactions" role="group" aria-label="React">
        {REACTIONS.map((e) => (
          <button key={e} type="button" className="react" onClick={() => react(e)} aria-label={`React ${e}`}>
            {e}
          </button>
        ))}
      </div>

      <div className="sec"><h2>Chat</h2><Link href="/match" className="link">Back to the match</Link></div>
      <div className="wrap">
        <ol className="chat" ref={feed} aria-live="polite">
          {room.chat.length === 0 ? <li className="small muted">Say hi. Messages are not saved anywhere.</li> : null}
          {room.chat.map((m) => (
            <li key={m.id} className={m.name === room.me?.name ? "mine" : ""}>
              <b>{m.name}</b>
              <span>{m.text}</span>
            </li>
          ))}
        </ol>
        {argue ? (
          <button type="button" className="chip" onClick={() => send(argue)} style={{ marginTop: "var(--s-2)" }}>
            Send why {full(mine!)} is better
          </button>
        ) : (
          <Link href="/match/players" className="chip" style={{ marginTop: "var(--s-2)" }}>Pick your player to argue</Link>
        )}
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <input className="input" value={text} maxLength={MAX_CHAT} placeholder="Message the room" aria-label="Message" onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn go">Send</button>
        </form>
        {error ? <p className="small down-text">{error}</p> : null}
        <button type="button" className="link" style={{ marginTop: "var(--s-4)" }} onClick={() => void leaveRoom()}>
          Leave the room
        </button>
      </div>

      <div className="floats" aria-hidden="true">
        {room.floats.map((f, k) => (
          <span key={f.id} className="float" style={{ left: `${15 + ((k * 37) % 70)}%` }}>
            {f.emoji}
            <small>{f.name}</small>
          </span>
        ))}
      </div>
      <div style={{ height: "6rem" }} />
    </main>
  );
} // prettier-ignore

/** Voice: join once and talk freely, like a call. Mute any time. */
function VoicePanel() {
  const room = useRoom();
  const inVoice = room.members.filter((m) => m.voice);
  if (room.voice !== "on") {
    const note =
      room.voice === "asking" ? "Allow the microphone when your browser asks."
      : room.voice === "denied" ? "The microphone is blocked. Allow it in your browser's site settings, then try again."
      : room.voice === "full" ? "Voice is full: six people already. You can still chat."
      : room.voice === "unsupported" ? "This browser can't do voice calls. You can still chat."
      : inVoice.length > 0 ? `${inVoice.map((m) => m.name).join(", ")} ${inVoice.length === 1 ? "is" : "are"} talking. Join them.`
      : "Talk to everyone in the room, like a call. Headphones stop echo.";
    return (
      <section className="card pad voice" aria-label="Voice">
        <div className="row between">
          <div className="grow">
            <b>Voice</b>
            <p className="small muted">{note}</p>
          </div>
          <button type="button" className="btn go" onClick={() => void joinVoice()} disabled={room.voice === "asking"} data-testid="join-voice">
            Join voice
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="card pad voice on" aria-label="Voice">
      <div className="row between">
        <b>In voice</b>
        <span className="small muted">{inVoice.length} talking</span>
      </div>
      <div className="voice-people">
        {inVoice.map((m) => (
          <span key={m.id} className={`voice-person${room.speaking.includes(m.id) ? " speaking" : ""}`}>
            <span className="member">{m.name.slice(0, 1).toUpperCase()}</span>
            <small>{m.id === room.me?.id ? "You" : m.name}{m.muted ? " (muted)" : ""}</small>
          </span>
        ))}
      </div>
      {room.unreachable.length > 0 ? (
        <p className="micro muted">Couldn&apos;t reach {room.members.filter((m) => room.unreachable.includes(m.id)).map((m) => m.name).join(", ") || "someone"} for voice. Their network blocks direct calls; chat still works.</p>
      ) : null}
      <div className="row" style={{ gap: "var(--s-2)", marginTop: "var(--s-3)" }}>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={toggleMute} aria-pressed={room.muted}>
          {room.muted ? "Unmute" : "Mute"}
        </button>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={leaveVoice}>
          Leave voice
        </button>
      </div>
    </section>
  );
} // prettier-ignore
