"use client";
import { useRouter } from "next/navigation";
import { setVibrate, useSettings } from "@/lib/client/settings";
import type { Bar } from "@/lib/engine/types";
import { askPermission, useNeedsHomeScreen, useNotifyPermission } from "@/lib/notify";
import { AppBar } from "./AppBar";
import { Button } from "./Button";
import { IconBell } from "./Icons";
import { useMatch, useMatchView } from "./MatchProvider";
import { PulseCard } from "./PulseCard";
import { Segmented } from "./Segmented";
import { StatTile } from "./StatTile";

const BARS: { value: Bar; label: string }[] = [
  { value: "decider", label: "The decider" },
  { value: "big", label: "Big moments" },
  { value: "notable", label: "Everything" },
];

/** "About N call-backs in a match", only when N has been measured (PRD AC4.6). */
export function promiseLine(
  promise: { callbacks_median: number; coverage: number } | null | undefined,
): string | null {
  if (!promise || !Number.isFinite(promise.callbacks_median) || !Number.isFinite(promise.coverage))
    return null;
  const share = Math.round(promise.coverage * 100);
  return `About ${promise.callbacks_median} call-backs in a match. In our test matches that covered ${share} of every 100 biggest swings.`;
}

export function FocusScreen() {
  const { data, store, snap } = useMatch();
  const view = useMatchView();
  const settings = useSettings();
  const router = useRouter();
  const permission = useNotifyPermission();
  const homeScreen = useNeedsHomeScreen();

  const session = snap.session;
  const now = snap.index >= 0 ? data.ticks[Math.min(snap.index, data.ticks.length - 1)] : null;
  const line = promiseLine(data.promise?.[session.bar]);
  const on = session.focus;
  const right = now
    ? `${now.state.batting} ${now.state.score}/${now.state.wickets}, over ${now.event.over}.${now.event.ball}`
    : "";

  const catchUp = () => {
    store.setFocus(false);
    router.push(view.missed.length > 0 ? "/match/moments?catchup=1" : "/match");
  };

  return (
    <main>
      <AppBar />
      <div className="wrap stack">
        {view.callback && on ? (
          <div className="banner" role="status">
            <i aria-hidden="true" />
            Look up. {view.callback.line}.
          </div>
        ) : null}
        <PulseCard pulse={view.pulse} lookUp={view.callback?.line ?? null} right={right}>
          <p className="pulse-why">
            {view.phase === "finished"
              ? "The match is over."
              : on
                ? view.callback
                  ? "This is your call-back."
                  : "Focus is on. Clutch will call you back."
                : "Turn Focus on and get back to work."}
          </p>
        </PulseCard>
      </div>

      <div className="sec">
        <h2>Call me back for</h2>
      </div>
      <div className="wrap">
        <Segmented
          label="Call me back for"
          options={BARS}
          value={session.bar}
          onChange={(bar) => store.setBar(bar)}
        />
        {line ? (
          <p className="small muted" style={{ marginTop: "var(--s-2)" }} data-testid="promise">
            {line}
          </p>
        ) : null}
      </div>

      <div className="wrap" style={{ marginTop: "var(--s-3)" }}>
        <div className="tiles">
          <StatTile value={session.callbacks} label="call-backs so far" />
          <StatTile
            value={view.missed.length}
            label="moments waiting"
            stake={view.missed.length > 0}
          />
          <StatTile value={now ? now.state.balls_left : "–"} label="balls left" />
        </div>
      </div>

      <div className="wrap stack" style={{ marginTop: "var(--s-3)" }}>
        <div className="card pad row" data-testid="notify-card">
          <span className="notify-icon" aria-hidden="true">
            <IconBell />
          </span>
          <div className="grow">
            {permission === "granted" ? (
              <>
                <div className="card-title small-title">Notifications are on</div>
                <div className="small muted">
                  You get one buzz when it matters. Keep this tab open.
                </div>
              </>
            ) : permission === "denied" ? (
              <>
                <div className="card-title small-title">Notifications are off</div>
                <div className="small muted">Clutch will flash this tab&apos;s title instead.</div>
              </>
            ) : permission === "unsupported" || homeScreen ? (
              <>
                <div className="card-title small-title">
                  {homeScreen
                    ? "On iPhone, add Clutch to your Home Screen"
                    : "This browser has no notifications"}
                </div>
                <div className="small muted">
                  {homeScreen
                    ? "Tap Share, then Add to Home Screen, and open Clutch from there to get notifications."
                    : "Clutch will flash this tab's title instead."}
                </div>
              </>
            ) : (
              <>
                <div className="card-title small-title">Get a buzz when it matters</div>
                <div className="small muted">Works while this tab is open, in front or behind.</div>
              </>
            )}
          </div>
          {permission === "default" && !homeScreen ? (
            <Button onClick={() => void askPermission()}>Allow</Button>
          ) : null}
        </div>
        <label className="card pad row switch-row">
          <span className="grow">
            <span className="card-title small-title">Vibrate on call-backs</span>
            <span className="small muted" style={{ display: "block" }}>
              Android phones only. iPhone browsers cannot vibrate.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.vibrate}
            onChange={(e) => setVibrate(e.target.checked)}
          />
        </label>
      </div>

      <div className="cta-bar">
        {view.phase === "finished" ? (
          <Button kind="go" wide onClick={catchUp}>
            See what I missed
          </Button>
        ) : on ? (
          <Button kind="go" wide onClick={catchUp}>
            I&apos;m back. Catch me up
          </Button>
        ) : (
          <Button kind="go" wide onClick={() => store.setFocus(true)}>
            Turn Focus on
          </Button>
        )}
      </div>
      <div style={{ height: "6rem" }} />
    </main>
  );
}
