"use client";
import { cardKey } from "@/lib/cards/schema";
import { useSettings } from "@/lib/client/settings";
import { pulseState, PULSE_WORD } from "@/lib/engine/pulse";
import { eventGlyph } from "@/lib/adapters/cricket/scoreboard";
import { useMatch } from "./MatchProvider";

const ROWS = 8;

/**
 * Behind the scenes: what the engine worked out for the last few balls, read straight
 * from the same data the app runs on. Nothing here is decoration; every line is a value
 * the product used to decide what to show.
 */
export function EngineLog() {
  const { data, snap } = useMatch();
  const settings = useSettings();
  const { ticks, alerts, moments, thresholds, match, model, cards } = data;
  const index = Math.min(snap.index, ticks.length - 1);
  const first = match.batting_order[0];
  const alertAt = new Map(alerts.map((a) => [a.i, a]));
  const momentAt = new Map(moments.map((m) => [m.i, m]));
  const world = settings.world ?? "plain";
  const rows = [];
  for (let i = index; i >= 0 && rows.length < ROWS; i--) rows.push(ticks[i]);
  const next = ticks[index + 1];

  return (
    <section className="card pad engine" aria-label="Behind the scenes" data-testid="engine-log">
      <div className="row between">
        <h2 className="card-title">Behind the scenes</h2>
        <span className="badge">Engine log</span>
      </div>
      <p className="small muted" style={{ marginTop: "var(--s-1)" }}>
        What the model and the rules decided, ball by ball. The newest ball is on top.
      </p>
      <dl className="engine-facts">
        <div>
          <dt>Model</dt>
          <dd>
            {model
              ? `${model.name}. Brier score ${model.brier} on ${model.test_matches} unseen matches (a run-rate rule scores ${model.baseline_brier}; lower is better).`
              : "Win-probability model"}
          </dd>
        </div>
        <div>
          <dt>Pulse cut-offs</dt>
          <dd>
            Building from {thresholds.pulse.building}, Look up from {thresholds.pulse.high}, This is
            it from {thresholds.pulse.decider} (stakes percentile, fitted on training matches only).
          </dd>
        </div>
        {next ? (
          <div>
            <dt>Next ball</dt>
            <dd>
              Stakes {Math.round(next.stakes.pct)} of 100:{" "}
              {PULSE_WORD[pulseState(next.stakes.pct, thresholds)]}.
              {alertAt.get(next.i)
                ? ` A call-back (${alertAt.get(next.i)!.bar}) is due before it.`
                : ""}
            </dd>
          </div>
        ) : null}
      </dl>
      {rows.length === 0 ? (
        <p className="small muted">The log starts with the first ball.</p>
      ) : (
        <ol className="engine-rows">
          {rows.map((t) => {
            const before = t.wp.team === first ? t.wp.before : 1 - t.wp.before;
            const after = t.wp.team === first ? t.wp.after : 1 - t.wp.after;
            const move = Math.round((after - before) * 100);
            const alert = alertAt.get(t.i);
            const moment = momentAt.get(t.i);
            const card = moment ? cards[cardKey(moment.id, world)] : undefined;
            return (
              <li key={t.i}>
                <span className="num over">
                  {t.event.over}.{t.event.ball}
                </span>
                <span className="glyph num">{eventGlyph(t.event)}</span>
                <span className="what">
                  <span>
                    Stakes <b className="num">{Math.round(t.stakes.pct)}</b> · {first}{" "}
                    <b className="num">
                      {Math.round(before * 100)}→{Math.round(after * 100)}%
                    </b>
                    {move !== 0 ? (
                      <span className={move > 0 ? "up-text" : "down-text"}>
                        {" "}
                        ({move > 0 ? "+" : ""}
                        {move})
                      </span>
                    ) : null}
                  </span>
                  {alert ? <span className="tag">call-back: {alert.bar}</span> : null}
                  {moment ? (
                    <span className="tag">moment: {moment.kind.replace("_", " ")}</span>
                  ) : null}
                  {card ? <span className="tag">card: {card.source}, checked</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
