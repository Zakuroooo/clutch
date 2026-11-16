"use client";
/**
 * The browser side of a solo session: keeps the Session in localStorage, steps it on
 * every tick of the worker, and tells React when something a screen shows has changed.
 */
import { z } from "zod";
import { elapsed, nextMomentAnchor, setSpeed, skipTo, startAnchor } from "@/lib/clock/anchor";
import { catchUpTarget, followPlayer, type PlayerReading } from "@/lib/clock/follow";
import { DEMO_LEAD_MS, type DemoPlan } from "@/lib/engine/demo";
import { markSeen } from "@/lib/engine/shelf";
import { newSession, restart, step, type MatchPlan, type Session } from "@/lib/engine/session";
import { BarSchema, type Alert, type Bar } from "@/lib/engine/types";

const SessionSchema = z.object({
  anchor: z.object({ anchor_at: z.number(), anchor_elapsed_ms: z.number(), speed: z.number() }),
  focus: z.boolean(),
  bar: BarSchema,
  marks: z.record(z.string(), z.enum(["seen", "missed"])),
  fired: z.array(z.number()),
  lastIndex: z.number(),
  callbacks: z.number(),
});

/** A new solo match opens with a short countdown before the first ball. */
export const COUNTDOWN_MS = 10_000;

export type Snapshot = {
  /** False on the server and until the first tick in the browser. */
  ready: boolean;
  session: Session;
  index: number;
  /** Match time, to the second: enough for countdowns without re-rendering every tick. */
  elapsedSec: number;
  finished: boolean;
  /** False when the browser refused storage: progress will not survive a refresh. */
  durable: boolean;
  /** Set while the two-minute demo is running. */
  demo: DemoPlan | null;
};

const IDLE: Session = newSession({ anchor_at: 0, anchor_elapsed_ms: 0, speed: 0 });
export const SERVER_SNAPSHOT: Snapshot = {
  ready: false,
  session: IDLE,
  index: -1,
  elapsedSec: 0,
  finished: false,
  durable: true,
  demo: null,
};

/** A match video the clock can follow. Implemented by the YouTube player component. */
export type VideoLink = {
  read(): PlayerReading | null;
  seek(ms: number): void;
  setRate(rate: number): void;
};

export class MatchStore {
  private snapshot: Snapshot = SERVER_SNAPSHOT;
  private listeners = new Set<() => void>();
  private session: Session = IDLE;
  private durable = true;
  private demo: DemoPlan | null = null;
  private video: VideoLink | null = null;
  private readonly key: string;

  constructor(
    matchId: string,
    private readonly plan: MatchPlan,
    /** Called with the call-back the fan should be interrupted with. */
    private readonly onCallback: (alert: Alert) => void = () => {},
    private readonly now: () => number = () => Date.now(),
  ) {
    this.key = `clutch.session.${matchId}.v1`;
  }

  /** Load the saved session, or start one. `startAt` (match ms) overrides both. */
  start(startAt?: number) {
    let saved: Session | null = null;
    try {
      const raw = window.localStorage.getItem(this.key);
      const parsed = raw ? SessionSchema.safeParse(JSON.parse(raw)) : null;
      saved = parsed?.success ? parsed.data : null;
    } catch {
      this.durable = false;
    }
    this.session = saved ?? newSession(startAnchor(this.now(), this.firstBallMs() - COUNTDOWN_MS));
    if (startAt !== undefined) {
      this.session = restart(this.session, startAnchor(this.now(), startAt));
      // Land on the ball without marking what came before it as missed.
      this.session = { ...this.session, lastIndex: Number.MAX_SAFE_INTEGER };
      this.session = step(this.session, this.plan, this.now(), { hidden: false }).session;
    }
    this.save();
    this.tick();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.snapshot;

  /** The match time of the first ball (0 for a clock replay, later for a video). */
  private firstBallMs(): number {
    return this.plan.times[0] ?? 0;
  }

  /** The player reports in; while it is attached and the tab is visible, it leads. */
  attachVideo(link: VideoLink) {
    this.video = link;
  }
  detachVideo(link: VideoLink) {
    if (this.video === link) this.video = null;
  }
  hasVideo(): boolean {
    return this.video !== null;
  }
  /** Where the player should be now: the clock's match time. */
  clockMs(): number {
    return elapsed(this.session.anchor, this.now());
  }
  /** The fan is back: move the player to the clock if they drifted apart. */
  catchUpVideo() {
    const reading = this.video?.read();
    if (!this.video || !reading) return;
    const target = catchUpTarget(this.session.anchor, this.now(), reading.ms);
    if (target !== null) this.video.seek(target);
  }

  tick = () => {
    const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    let moved = false;
    if (this.video && !hidden) {
      const reading = this.video.read();
      const next = reading ? followPlayer(this.session.anchor, this.now(), reading) : null;
      if (next) {
        this.session = { ...this.session, anchor: next };
        moved = true;
      }
    }
    const r = step(this.session, this.plan, this.now(), { hidden });
    const changed = r.session !== this.session || moved;
    this.session = r.session;
    if (changed) this.save();
    const elapsedSec = Math.floor(r.elapsedMs / 1000);
    const s = this.snapshot;
    if (
      !s.ready ||
      changed ||
      s.index !== r.index ||
      s.finished !== r.finished ||
      s.elapsedSec !== elapsedSec
    ) {
      this.snapshot = {
        ready: true,
        session: this.session,
        index: r.index,
        elapsedSec,
        finished: r.finished,
        durable: this.durable,
        demo: this.demo,
      };
      this.listeners.forEach((l) => l());
    }
    if (r.notify) this.onCallback(r.notify);
  };

  private update(next: Session) {
    this.session = next;
    this.save();
    this.tick();
    // tick() only publishes when the step changed something; a setting change must too.
    this.snapshot = { ...this.snapshot, session: this.session, demo: this.demo };
    this.listeners.forEach((l) => l());
  }

  private save() {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(this.session));
    } catch {
      this.durable = false;
    }
  }

  /**
   * Start the two-minute demo: a clean session that has just skipped over one earlier
   * moment (so the shelf has something missed) and sits a few balls before the target.
   */
  startDemo(plan: DemoPlan) {
    const t = this.plan.times;
    const from =
      plan.missIndex !== null ? t[plan.missIndex] - 2_000 : t[plan.targetIndex] - DEMO_LEAD_MS;
    this.start(from);
    this.demo = plan;
    this.jumpTo(t[plan.targetIndex] - DEMO_LEAD_MS);
  }
  endDemo() {
    this.demo = null;
    this.snapshot = { ...this.snapshot, demo: null };
    this.listeners.forEach((l) => l());
  }

  setBar(bar: Bar) {
    this.update({ ...this.session, bar });
  }
  setFocus(focus: boolean) {
    this.update({ ...this.session, focus });
  }
  setSpeed(speed: number) {
    this.video?.setRate(speed);
    this.update({ ...this.session, anchor: setSpeed(this.session.anchor, this.now(), speed) });
  }
  /** Jump to 8 s before the next moment. Returns false when there is none left. */
  skipAhead(): boolean {
    const times = this.plan.moments.map((m) => this.plan.times[m.i]);
    const anchor = nextMomentAnchor(this.session.anchor, this.now(), times);
    if (!anchor) return false;
    this.update({ ...this.session, anchor });
    this.video?.seek(anchor.anchor_elapsed_ms);
    return true;
  }
  jumpTo(elapsedMs: number) {
    this.update({ ...this.session, anchor: skipTo(this.session.anchor, this.now(), elapsedMs) });
    this.video?.seek(elapsedMs);
  }
  restart() {
    const start = this.firstBallMs() - COUNTDOWN_MS;
    this.update(restart(this.session, startAnchor(this.now(), start)));
    this.video?.seek(start);
  }
  markSeen(ids: string[]) {
    if (ids.every((id) => this.session.marks[id] === "seen")) return; // nothing to change
    this.update({ ...this.session, marks: markSeen(this.session.marks, ids) });
  }
}
