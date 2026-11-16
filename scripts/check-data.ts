/**
 * Checks the replay match's data files against each other (TESTING.md F2 row 9, PRD AC2.1).
 * Runs in CI. Exits non-zero with a list of problems.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadMatch, replayMatchId } from "@/lib/adapters/cricket/load";
import { detectMoments } from "@/lib/adapters/cricket/moments";

const GAP = { ball: 30_000, over: 45_000, wicket: 60_000, innings: 120_000 };

async function main() {
  const problems: string[] = [];
  const bad = (msg: string) => problems.push(msg);
  const id = await replayMatchId();
  const { match, ticks, alerts, moments, thresholds } = await loadMatch(id);
  // With a match video, ball times come from the video, not the fixed gaps.
  let video: { ball_times: number[]; scoreboard_lag_s?: number } | null = null;
  try {
    video = JSON.parse(
      await readFile(path.join(process.cwd(), "data", "matches", id, "video_sync.json"), "utf8"),
    );
  } catch {
    video = null;
  }
  if (video) {
    const lag = video.scoreboard_lag_s ?? 0;
    if (video.ball_times.length !== ticks.length)
      bad("video_sync.json does not have one time per ball");
    else
      video.ball_times.forEach((t, i) => {
        if (Math.abs(Math.round((t - lag) * 1000) - ticks[i].t_ms) > 1)
          bad(`event ${i}: t_ms is not its video time`);
      });
  }

  if (thresholds.fitted_on !== "train") bad("thresholds.json is not fitted on train");
  for (const [k, v] of Object.entries({
    ...thresholds.pulse,
    ...thresholds.alert,
    ...thresholds.moment,
  })) {
    if (!(v > 0)) bad(`threshold ${k} is not above zero`);
  }

  let score = 0;
  let wickets = 0;
  let bowled = 0;
  let target: number | null = null;
  ticks.forEach((t, i) => {
    const e = t.event;
    const prev = ticks[i - 1];
    if (t.i !== i) bad(`event ${i}: i is ${t.i}`);
    if (prev && prev.event.innings !== e.innings) {
      target = score + 1;
      score = wickets = bowled = 0;
    }
    score += e.runs.total;
    wickets += e.wicket ? 1 : 0;
    bowled += e.legal ? 1 : 0;
    const s = t.state;
    if (s.score !== score) bad(`event ${i}: score ${s.score}, running total ${score}`);
    if (s.wickets !== wickets) bad(`event ${i}: wickets ${s.wickets}, counted ${wickets}`);
    if (s.balls_bowled !== bowled) bad(`event ${i}: balls ${s.balls_bowled}, counted ${bowled}`);
    if (s.balls_bowled + s.balls_left !== 120)
      bad(`event ${i}: balls bowled and left do not add to 120`);
    if (e.innings === 2) {
      if (s.target !== target) bad(`event ${i}: target ${s.target}, expected ${target}`);
      if (s.needed !== Math.max((target ?? 0) - score, 0)) bad(`event ${i}: needed ${s.needed}`);
    } else if (s.target !== null || s.needed !== null)
      bad(`event ${i}: chase numbers in innings 1`);
    if (e.runs.total !== e.runs.bat + e.runs.extras) bad(`event ${i}: runs do not add up`);
    for (const v of [t.wp.before, t.wp.after])
      if (!(v >= 0 && v <= 1)) bad(`event ${i}: wp out of range`);
    if (!(t.stakes.pct >= 0 && t.stakes.pct <= 100)) bad(`event ${i}: stakes.pct out of range`);
    if (t.wp.team !== match.batting_order[0])
      bad(`event ${i}: wp is not from the first team's view`);
    if (prev && video) {
      if (!(t.t_ms > prev.t_ms)) bad(`event ${i}: video time does not increase`);
    } else if (prev) {
      if (Math.abs(prev.wp.after - t.wp.before) > 1e-9 && prev.event.innings === e.innings) {
        bad(`event ${i}: wp.before does not continue from the last ball`);
      }
      let gap = GAP.ball;
      if (prev.event.innings !== e.innings) gap = GAP.innings;
      else {
        if (prev.event.over !== e.over) gap += GAP.over;
        if (prev.event.wicket) gap += GAP.wicket;
      }
      if (t.t_ms - prev.t_ms !== gap) bad(`event ${i}: gap ${t.t_ms - prev.t_ms}, expected ${gap}`);
    } else if (!video && t.t_ms !== 0) bad("event 0: t_ms is not 0");
  });

  const last = ticks[ticks.length - 1];
  const firstWon = match.result.winner === match.batting_order[0];
  if (last.wp.after !== (firstWon ? 1 : 0)) bad("the last ball's wp.after is not the real result");

  for (const a of alerts) if (!ticks[a.i]) bad(`alert at ${a.i}: no such event`);
  const expected = JSON.stringify(detectMoments(ticks, thresholds));
  if (JSON.stringify(moments) !== expected)
    bad("moments.json differs from detectMoments(); run `npm run moments`");

  // The replay match must be in the test split (PRD AC2.2).
  try {
    const split = JSON.parse(
      await readFile(path.join(process.cwd(), "model", "artifacts", "split.json"), "utf8"),
    );
    if (!split.test.match_ids.includes(id)) bad(`replay match ${id} is not in the test split`);
  } catch {
    bad("model/artifacts/split.json is missing");
  }

  if (problems.length) {
    console.error(`check-data: ${problems.length} problem(s)`);
    for (const p of problems.slice(0, 30)) console.error("  - " + p);
    process.exit(1);
  }
  console.log(
    `check-data: ok. match ${id}, ${ticks.length} events, ${alerts.length} call-backs, ${moments.length} moments, replay match is in the test split.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
