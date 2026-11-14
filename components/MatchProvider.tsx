"use client";
/**
 * Holds the replay match and this fan's session for every match screen. The data comes
 * from the server as props; the session lives in the browser.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { describeMoment, type MomentWords } from "@/lib/adapters/cricket/describe";
import { facts as buildFacts } from "@/lib/adapters/cricket/facts";
import type { MatchData, PulsePromise } from "@/lib/adapters/cricket/load";
import { scoreboardAt, segment, teamName } from "@/lib/adapters/cricket/scoreboard";
import type { CardsFile, Facts } from "@/lib/cards/schema";
import { MatchStore, SERVER_SNAPSHOT, type Snapshot } from "@/lib/client/matchStore";
import { settingsStore } from "@/lib/client/settings";
import { activeAlert } from "@/lib/engine/alerts";
import { pulseView, type PulseView } from "@/lib/engine/pulse";
import { missedMoments, shelfAt } from "@/lib/engine/shelf";
import type { Alert, Moment, ScoreboardView } from "@/lib/engine/types";
import { registerServiceWorker, restoreTitle, sendCallback } from "@/lib/notify";

export type MatchBundle = MatchData & { cards: CardsFile; promise: PulsePromise | null };

type Ctx = {
  data: MatchBundle;
  store: MatchStore;
  snap: Snapshot;
  factsFor: (id: string) => Facts | null;
  wordsFor: (id: string) => MomentWords | null;
  /** The explanation card that is open, by moment id. */
  openId: string | null;
  open: (id: string | null) => void;
};

const MatchContext = createContext<Ctx | null>(null);

export function MatchProvider({
  data,
  children,
}: {
  data: MatchBundle;
  children: React.ReactNode;
}) {
  const plan = useMemo(
    () => ({ times: data.ticks.map((t) => t.t_ms), alerts: data.alerts, moments: data.moments }),
    [data],
  );
  const [store] = useState(
    () =>
      new MatchStore(
        data.match.id,
        plan,
        (alert) => void sendCallback(alert, { vibrate: settingsStore.get().vibrate }),
      ),
  );
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT);
  const [openId, open] = useState<string | null>(null);

  useEffect(() => {
    // Test-only anchor (?t0=<match ms>), read only in end-to-end runs. The demo link
    // (?demo=1) is handled by the demo guide, which also sets the clock.
    const params = new URLSearchParams(window.location.search);
    const t0 = process.env.NEXT_PUBLIC_E2E === "1" ? params.get("t0") : null;
    store.start(t0 !== null && Number.isFinite(Number(t0)) ? Number(t0) : undefined);

    let worker: Worker | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      worker = new Worker(new URL("../lib/clock/ticker.worker.ts", import.meta.url));
      worker.onmessage = store.tick;
    } catch {
      timer = setInterval(store.tick, 250);
    }
    const onVisible = () => {
      store.tick();
      if (document.visibilityState === "visible") restoreTitle();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", restoreTitle);
    void registerServiceWorker();
    return () => {
      worker?.terminate();
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", restoreTitle);
    };
  }, [store]);

  const lookup = useMemo(() => {
    const cache = new Map<string, Facts | null>();
    const subjects = new Map<string, Moment | (typeof data.newBatters)[number]>();
    data.moments.forEach((m) => subjects.set(m.id, m));
    data.newBatters.forEach((n) => subjects.set(n.id, n));
    const factsFor = (id: string) => {
      if (!cache.has(id)) {
        const s = subjects.get(id);
        cache.set(id, s ? buildFacts(s, data.ticks, data.match, data.players) : null);
      }
      return cache.get(id) ?? null;
    };
    const wordsFor = (id: string) => {
      const f = factsFor(id);
      return f ? describeMoment(f) : null;
    };
    return { factsFor, wordsFor };
  }, [data]);

  const [a, b] = data.match.teams;
  const teamVars = {
    "--team-a": a.colors[0],
    "--team-a-2": a.colors[1],
    "--team-b": b.colors[0],
    "--team-b-2": b.colors[1],
  } as React.CSSProperties;

  return (
    <MatchContext.Provider value={{ data, store, snap, ...lookup, openId, open }}>
      <div style={teamVars}>{children}</div>
    </MatchContext.Provider>
  );
}

export function useMatch(): Ctx {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatch must be used inside MatchProvider");
  return ctx;
}

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export type MatchView = {
  phase: "soon" | "play" | "break" | "finished";
  pulse: PulseView;
  /** A call-back that is on right now, at the fan's bar. */
  callback: Alert | null;
  scoreboard: ScoreboardView;
  over: ReturnType<typeof segment>;
  /** "Over 16.1", or a state word. */
  overText: string;
  /** Win chance of the team that batted first, 0 to 1. */
  chanceA: number;
  /** Seconds until the next ball, or null when there is none. */
  nextBallIn: number | null;
  shelf: Moment[];
  missed: Moment[];
  latest: Moment | null;
  progress: [number, number];
};

/** Everything the screens show, derived from the clock and the data. */
export function useMatchView(): MatchView {
  const { data, snap } = useMatch();
  return useMemo(() => {
    const { ticks, match, thresholds, moments, alerts } = data;
    const index = Math.min(snap.index, ticks.length - 1);
    const now = index >= 0 ? ticks[index] : null;
    const next = ticks[index + 1] ?? null;
    const elapsedMs = snap.elapsedSec * 1000;
    const atBreak = !!now && !!next && next.event.innings !== now.event.innings;
    const phase: MatchView["phase"] = !next
      ? "finished"
      : !now
        ? "soon"
        : atBreak
          ? "break"
          : "play";
    const nextBallIn = next ? Math.max(0, Math.ceil((next.t_ms - elapsedMs) / 1000)) : null;
    const scoreboard = scoreboardAt(ticks, index, match);
    const winner = teamName(match, match.result.winner);

    const pulse = pulseView({
      thresholds,
      nextPct: next?.stakes.pct ?? null,
      phase,
      soonReason: nextBallIn !== null ? `First ball in ${clock(nextBallIn)}` : "",
      breakReason: scoreboard.chase?.left ?? "",
      resultWord: `${match.result.winner} won`,
      resultReason: scoreboard.chase?.right ?? winner,
    });
    const times = ticks.map((t) => t.t_ms);
    const callback =
      phase === "play" ? activeAlert(alerts, times, elapsedMs, snap.session.bar) : null;
    const shelf = shelfAt(moments, index);
    const perInnings = ticks[0].state.balls_bowled + ticks[0].state.balls_left;
    const firstDone = !!now && now.event.innings === 2;
    const progress: [number, number] = [
      firstDone ? 1 : now ? now.state.balls_bowled / perInnings : 0,
      firstDone ? (phase === "finished" ? 1 : now.state.balls_bowled / perInnings) : 0,
    ];
    return {
      phase,
      pulse,
      callback,
      scoreboard,
      over: segment(ticks, index),
      overText:
        phase === "soon"
          ? "Starting"
          : phase === "finished"
            ? "Finished"
            : phase === "break"
              ? "Innings break"
              : `Over ${now!.event.over}.${now!.event.ball}`,
      chanceA: now ? now.wp.after : ticks[0].wp.before,
      nextBallIn,
      shelf,
      missed: missedMoments(moments, snap.session.marks, index),
      latest: shelf[0] ?? null,
      progress,
    };
  }, [data, snap]);
}
