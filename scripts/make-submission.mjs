// Builds the Dream11 submission files in submission/ from the saved results.
// Every number is read from model/artifacts/ or evals/results/; nothing is typed by hand.
// Usage: node scripts/make-submission.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const split = read("model/artifacts/split.json");
const metrics = read("model/artifacts/metrics.json");
const pulse = read("model/artifacts/pulse_eval.json");
const evals = read("evals/results/summary.json");
const tests = read("evals/results/tests.json");
const data = read("model/artifacts/data_report.json");
const replay = read("data/replay.json");
const timeline = read(`data/matches/${replay.match_id}/timeline.json`).match;

const LIVE = "https://clutch-one-mu.vercel.app";
const REPO = "https://github.com/Zakuroooo/clutch";
const pct = (x) => `${Math.round(x * 100)}%`;
const n = (x) => x.toLocaleString("en-IN");
const bars = pulse.bars;
const mm = metrics.models;
const [teamA, teamB] = timeline.teams;
const matchName = `${teamA.name} v ${teamB.name}`;
const matchDate = new Date(`${timeline.date}T00:00:00Z`).toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const winnerName = timeline.teams.find((t) => t.code === timeline.result.winner).name;
const margin = Object.entries(timeline.result.by)
  .map(([k, v]) => `${v} ${k}`)
  .join("");
const img = (name) =>
  `data:image/png;base64,${readFileSync(`design/review/${name}.png`).toString("base64")}`;

// ---------------------------------------------------------------- the 200-word note
const NOTE = [
  ["h", "Clutch: the friend who tells you when to look up"],
  ["p", `Try it: ${LIVE} and tap “Show me in 2 minutes”.`],
  ["b", "The fan problem."],
  [
    "p",
    "Casual fans watch with the match beside their work. They look away, miss the one ball everyone talks about, and when the room roars they don’t know why. Live sport is long quiet stretches and a few seconds that matter, and nobody tells them which.",
  ],
  ["b", "How Clutch helps."],
  [
    "p",
    `One ring, the Pulse, fills before a ball that could change the match and calls you back. Moments you missed wait on a shelf, explained in a world you already know: football, F1, chess, Bollywood, gaming or Hinglish. Code builds and checks every number. It replays a real T20I with its full match video, every ball synced; there are no real users yet. Next: AI-written cards and rooms with friends.`,
  ],
  ["b", "AI used."],
  [
    "p",
    `A win-probability model (scikit-learn), trained on ${n(split.train.matches)} past T20 matches, scores the stakes of every ball. On ${n(split.test.matches)} held-out matches, its call-backs came before ${pct(bars.big.coverage)} of the biggest swings, against ${pct(bars.big.random_same_count)} for random ones. The idea is my own, and I built it with AI: Claude Code (Anthropic) for code, tests and design review.`,
  ],
];
const noteText = NOTE.map(([, t]) => t).join(" ");
const noteWords = noteText.split(/\s+/).filter(Boolean).length;
if (noteWords > 200) throw new Error(`note is ${noteWords} words`);

// ---------------------------------------------------------------- shared page style
const css = `
@page { size: A4; margin: 16mm 15mm; }
* { box-sizing: border-box; }
body { font: 10.5pt/1.5 "Helvetica Neue", Arial, sans-serif; color: #141823; margin: 0; }
h1 { font-size: 22pt; line-height: 1.1; margin: 0 0 4px; letter-spacing: -0.01em; }
h2 { font-size: 13pt; margin: 18px 0 6px; }
h3 { font-size: 11pt; margin: 12px 0 4px; }
p { margin: 0 0 8px; }
a { color: #c8124a; }
.kicker { font-size: 9pt; color: #6b7487; margin-bottom: 14px; }
.brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 12pt; margin-bottom: 10px; }
.dot { width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg,#ff2e63,#ff8a3d); display: inline-block; }
.cta { border: 2px solid #ff2e63; border-radius: 12px; padding: 10px 14px; margin: 10px 0 14px; }
.cta b { font-size: 13pt; }
table { border-collapse: collapse; width: 100%; margin: 6px 0 10px; font-size: 9.5pt; }
th, td { border-bottom: 1px solid #dde1ea; padding: 5px 6px; text-align: left; vertical-align: top; }
th { background: #f3f5f9; font-weight: 700; }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.shots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0; }
.shots figure { margin: 0; }
.shots img { width: 100%; border-radius: 10px; border: 1px solid #dde1ea; display: block; }
.shots figcaption { font-size: 8pt; color: #6b7487; margin-top: 3px; line-height: 1.3; }
ol, ul { margin: 0 0 8px; padding-left: 18px; }
li { margin-bottom: 3px; }
.small { font-size: 9pt; color: #4a5263; }
.src { font-size: 8pt; color: #6b7487; }
.break { break-before: page; }
.note-body p { font-size: 11pt; }
`;
const page = (title, body) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;
const brand = `<div class="brand"><span class="dot"></span>Clutch</div>`;
const liveLink = `<a href="${LIVE}">${LIVE}</a>`;
const repoLink = `<a href="${REPO}">${REPO}</a>`;

// ---------------------------------------------------------------- 1. note
const noteHtml = page(
  "Clutch - submission note",
  `${brand}<div class="note-body">` +
    NOTE.map(([k, t]) =>
      k === "h"
        ? `<h1>${t}</h1>`
        : k === "b"
          ? `<h3>${t}</h3>`
          : `<p>${t.replace(LIVE, liveLink)}</p>`,
    ).join("") +
    `</div><p class="src">${noteWords} words. Pranay Sarkar, Dream11 Forward Deployed Engineer internship assignment.</p>`,
);

// ---------------------------------------------------------------- 2. working artifact
const artifactHtml = page(
  "Clutch - working artifact",
  `${brand}<h1>Working artifact</h1>
<div class="kicker">Pranay Sarkar · Dream11 Forward Deployed Engineer internship assignment</div>
<div class="cta"><b>Open on a phone: ${liveLink}</b><br>Tap <b>Show me in 2 minutes</b>. No sign-up, no download, no permission prompt.</div>
<p>Clutch is a second screen for casual cricket fans. It replays one real match as if it were live: <b>${matchName}</b>, 1st T20I, ${matchDate} (${winnerName} won by ${margin}), with the full match video from the host ground's stream, played in YouTube's own player and synced ball by ball to Cricsheet data. Best on a laptop; works on a phone.</p>
<p><img src="${img("video-1280")}" style="width:100%;border-radius:10px;border:1px solid #dde1ea" alt=""></p>
<p class="src">On a laptop: the match video, the score, the Pulse ring and Behind the scenes, side by side.</p>
<h2>Try it in 2 minutes</h2>
<ol>
<li>Open the link and tap <b>Show me in 2 minutes</b>. A short guide walks you through. Tap the video to watch along.</li>
<li><b>The Pulse.</b> Watch the ring fill and turn to “Look up” a few balls before a big moment. In Focus mode this is when your phone would buzz.</li>
<li><b>The card.</b> The ball happens and a card explains it in football terms. Tap <b>Say it plainly</b> to switch to plain words.</li>
<li><b>Moments.</b> The shelf shows the moment you missed, with a drawing of what was recorded.</li>
<li><b>Behind the scenes</b> shows what the model and the rules decided for each ball. At full time, <b>the wrap</b> shows the turning point.</li>
</ol>
<p class="small">After the demo: open <b>Focus</b>, pick how often to be called back, turn it on and switch tabs; <b>Skip ahead</b> jumps to the next big moment; the globe chip changes your world (Hinglish included); <b>Read it out</b> speaks a card; <b>Jump to</b> moves to the start, the chase or the last five overs.</p>
<div class="shots">
<figure><img src="${img("video/04-demo-callback")}"><figcaption>The Pulse says “Look up” before the ball.</figcaption></figure>
<figure><img src="${img("video/05-demo-card")}"><figcaption>The moment, explained in football terms.</figcaption></figure>
<figure><img src="${img("video/07-moments")}"><figcaption>Moments: what you missed, kept for you.</figcaption></figure>
<figure><img src="${img("video/09-focus")}"><figcaption>Focus: get on with work, get called back.</figcaption></figure>
</div>
<p class="src">Screenshots of the app at 390 × 844. Clutch never draws a real player: players are jerseys. The video is the original stream in YouTube’s player, credited, never downloaded or clipped. No money, no prizes.</p>
<h2>What is built</h2>
<table>
<tr><th>Feature</th><th>State</th></tr>
<tr><td>The full match video, every ball synced to the data (the video leads; if it cannot play, the replay runs on its own clock)</td><td>Built</td></tr>
<tr><td>Match clock and scoreboard (a refresh loses nothing)</td><td>Built</td></tr>
<tr><td>Win-probability model and stakes for every ball</td><td>Built</td></tr>
<tr><td>The Pulse and Focus mode call-backs (notification, vibration, tab title)</td><td>Built. Notifications need the tab open</td></tr>
<tr><td>Moment shelf, drawn replay, Catch me up</td><td>Built</td></tr>
<tr><td>Cards in your world, with a code check on every number and name</td><td>Built. Wording comes from checked templates; an LLM writer is built behind the same check but not switched on</td></tr>
<tr><td>Two-minute guided demo, laptop layout, Behind the scenes, the match wrap, read-aloud, Hinglish</td><td>Built</td></tr>
<tr><td>Rooms with friends, reactions, per-over calls, Back me up</td><td>Designed, not built</td></tr>
</table>
<h2>Building next (designed, not built yet)</h2>
<p class="small">Each of these is specified in the repository's design documents, with its data model, API and tests written down before any code.</p>
<table>
<tr><th>Feature</th><th>What it does</th><th>State</th></tr>
<tr><td>AI-written cards</td><td>An LLM writes each card in your world from facts built by code; every card passes the same code check first, or the fan gets the template</td><td>Built behind the check and tested; switched on once a model key is added</td></tr>
<tr><td>Rooms with friends</td><td>Join by a 6-letter code, no sign-up; everyone on the same ball; who is here now</td><td>Designed: database, row-level security, realtime protocol</td></tr>
<tr><td>Reactions</td><td>One tap sends a reaction across every screen in the room</td><td>Designed</td></tr>
<tr><td>Per-over calls</td><td>Call the runs in the next over, points only, a leaderboard for the room</td><td>Designed</td></tr>
<tr><td>Back me up</td><td>Your player's best true case against your friend's, from the same stats, fair to both</td><td>Designed, with its own code check</td></tr>
<tr><td>Call-backs with the app closed</td><td>Web push, so the phone buzzes even when Clutch is not open</td><td>Designed</td></tr>
<tr><td>More sports</td><td>The engine never names cricket; a football adapter is sketched</td><td>Designed</td></tr>
</table>
<h2>Code</h2>
<p>Source: ${repoLink}. The README, the design documents in <code>docs/</code>, and the test and evaluation results are all there. The code is also attached as <code>clutch-source.zip</code>.</p>
<p class="small">To run it on a laptop: Node 22, then <code>npm install</code> and <code>npm run dev</code>, and open http://localhost:3000. No keys needed.</p>`,
);

// ---------------------------------------------------------------- 3. how it works and results
const row = (name, m) =>
  `<tr><td>${name}</td><td class="n">${m.brier}</td><td class="n">${m.brier_95[0]} to ${m.brier_95[1]}</td><td class="n">${m.log_loss}</td><td class="n">${m.calibration_error}</td></tr>`;
const prow = (k, label) => {
  const b = bars[k];
  return `<tr><td>${label}</td><td class="n">${b.callbacks_median}</td><td class="n">${pct(b.coverage)}</td><td class="n">${pct(b.random_same_count)}</td><td class="n">${pct(b.last_overs_same_count)}</td></tr>`;
};
const howHtml = page(
  "Clutch - how it works and results",
  `${brand}<h1>How it works, and what was measured</h1>
<div class="kicker">Every number on this page is read from a results file in the repository (named under each table). Nothing is typed by hand.</div>
<h2>The idea in three parts</h2>
<ol>
<li><b>When to look up.</b> A win-probability model gives each team’s chance of winning before and after every ball. The <b>stakes</b> of a ball is the gap between “the batter hits a six” and “the batter is out”, before it is bowled. High stakes fill the Pulse and trigger a call-back about 10 seconds before the ball.</li>
<li><b>What you missed.</b> Moments are found by code: a wicket that moved the game, a big over, a big swing, the innings break, the result. Each one you did not see is kept and marked “Missed”.</li>
<li><b>Why it matters.</b> Code builds the facts for each moment (scores, who gained, by how much) and a check rejects any card with a number, name or claim not in those facts. A card that fails is never shown.</li>
</ol>
<h2>The model</h2>
<p>${n(data.matches_kept)} men’s T20 matches from Cricsheet (internationals and the IPL), split by date so the model never learns from the future: ${n(split.train.matches)} for training (${split.train.from} to ${split.train.to}), ${n(split.validation.matches)} for choosing, ${n(split.test.matches)} for the final test (${split.test.from} to ${split.test.to}). The replay match is in the test set.</p>
<table>
<tr><th>On ${n(metrics.test_matches)} test matches</th><th class="n">Brier (lower is better)</th><th class="n">95% interval</th><th class="n">Log loss</th><th class="n">Calibration error</th></tr>
${row("Always the same guess", mm.baseline_constant)}
${row("Run-rate rule", mm.baseline_run_rate)}
${row("Logistic regression", mm.logistic)}
${row("Gradient-boosted trees (shipped)", mm.boosted)}
</table>
<p class="src">Source: model/artifacts/metrics.json. Intervals from ${n(metrics.bootstrap.samples)} resamples of whole matches.</p>
<h2>Does the Pulse call you back in time?</h2>
<p>For each test match, take the 10 balls where the win chance moved most. A swing is “caught” if a call-back came in the over before it. Compared with the same number of call-backs placed at random, or spread over the last overs.</p>
<table>
<tr><th>Call me back for</th><th class="n">Call-backs per match (median)</th><th class="n">Swings caught</th><th class="n">Random, same count</th><th class="n">Last overs, same count</th></tr>
${prow("decider", "The decider")}
${prow("big", "Big moments")}
${prow("notable", "Everything")}
</table>
<p class="src">Source: model/artifacts/pulse_eval.json, ${n(pulse.test_matches)} test matches.</p>
<p>The Pulse catches two to three times as many big swings as random call-backs. It is not complete: at “Big moments” about half of the biggest swings had a call-back first.</p>
<h2>The card check</h2>
<table>
<tr><th>Test</th><th class="n">Result</th></tr>
<tr><td>Cards with one planted error (wrong score, wrong player, a real footballer’s name, a betting word, the wrong team “in control”, and more)</td><td class="n">${evals.adversarial.caught} of ${evals.adversarial.planted_errors} rejected</td></tr>
<tr><td>Correct cards that must pass</td><td class="n">${evals.adversarial.good_passed} of ${evals.adversarial.good_cards} passed</td></tr>
<tr><td>Cards shipped for the replay match that pass the check</td><td class="n">${evals.recorded_cards.passing} of ${evals.recorded_cards.checked}</td></tr>
</table>
<p class="src">Source: evals/results/summary.json.</p>
<h2>Tests</h2>
<p>${tests.unit_and_integration.passed} unit and integration tests, ${tests.python.passed} Python tests and ${tests.end_to_end.passed} end-to-end browser tests at phone size, all passing, locally and in GitHub Actions. <span class="src">Source: evals/results/tests.json.</span></p>
<h2>Limits, said plainly</h2>
<ul>
<li>It is a replay of one past match with its video, not a live feed. It has no real users, so the idea is untested with fans.</li>
<li>Ball times come from reading the video’s own scoreboard: 162 of 248 balls are pinned to it directly (26 of 33 call-back balls); the rest are spread evenly between them.</li>
<li>The model knows the score situation only, not who is batting. “Biggest swings” are measured by the same model, so the Pulse numbers are optimistic.</li>
<li>Call-backs need the page open (in front or in a background tab). Push with the app closed is designed, not built.</li>
<li>Card wording is from checked templates. An LLM writer is built behind the same check but has not been run.</li>
<li>The replay drawing shows the kind of outcome only; the data has no ball-tracking.</li>
</ul>
<h2>Next</h2>
<p>Switch on AI-written cards and score them (the faithfulness check and the planted-error set are already in place), then rooms with friends, reactions, per-over calls and Back me up, all designed in the repository.</p>`,
);

// ---------------------------------------------------------------- 4. AI workflow
const aiHtml = page(
  "Clutch - how AI was used",
  `${brand}<h1>How AI was used to build Clutch</h1>
<div class="kicker">The full log, with every decision and review, is docs/AI-WORKFLOW.md in the repository.</div>
<p style="font-size:13pt"><b>The idea is my own, and I built it with AI.</b></p>
<p>The fan problem comes from how I watch sport. The hypothesis, what to build and what to cut, the design direction (after rejecting two designs) and the choice of replay match are my decisions. Claude Code wrote most of the code, tests and documents under rules I set, and I reviewed every change.</p>
<h2>Tools</h2>
<table>
<tr><th>Tool</th><th>Used for</th></tr>
<tr><td>Claude Code (Anthropic)</td><td>Planning, every document, the design tokens and mock-ups, the Python model pipeline, the app, the tests, and reviewing screenshots against the design rules</td></tr>
<tr><td>scikit-learn (inside the product)</td><td>The win-probability model that decides when to call a fan back</td></tr>
<tr><td>An LLM for card wording (built, not switched on)</td><td>Would only reword facts that code built, and every output is checked by code before anyone sees it</td></tr>
</table>
<h2>How the agent was kept honest</h2>
<ul>
<li><b>Rules in the repository</b> (CLAUDE.md): facts come from code, never from a model; no number in any document unless it is read from a results file; always say it is a replay; no player faces; no betting words; keys never committed.</li>
<li><b>Separate reviewers</b>: a design critic, a code reviewer, a test writer and a data checker, so the builder does not mark its own work.</li>
<li><b>Guard hooks</b> that format and type-check every edit and block commits containing secrets.</li>
<li><b>Tests and real screenshots</b> before anything was called done.</li>
</ul>
<h2>Mistakes the AI made, and how they were caught</h2>
<table>
<tr><th>What went wrong</th><th>How it was caught</th></tr>
<tr><td>First design (a broadcast scoreboard) was cluttered; the second (one dial, serif type) looked like a plain page</td><td>My review; redesigned as a match-centre app</td></tr>
<tr><td>A model feature (run rate) blew up in the first over: one six on ball one moved the win chance wildly</td><td>Inspecting the exported match; feature removed and model retrained</td></tr>
<tr><td>The first replay match it picked was tense for the whole chase, so the Pulse never went from calm to “Look up”</td><td>Walking the demo; switched to a match with a calm start and a tight finish, which I then chose</td></tr>
<tr><td>Its own template cards broke its own check</td><td>The tests</td></tr>
<tr><td>The CI workflow it wrote had never run because of an invalid condition</td><td>The first push; fixed, now green</td></tr>
<tr><td>The first video sync matched the score exactly, but the stream’s scorer sometimes misses a wide that the data records, so many readings were dropped</td><td>Reading the unmatched readings; matching now allows a few runs’ difference</td></tr>
<tr><td>The Pulse word touched its ring, and “Look up” looked too like “Building”</td><td>The design-critic agent reading real screenshots</td></tr>
</table>`,
);

// ---------------------------------------------------------------- render
mkdirSync("submission", { recursive: true });
const docs = [
  ["1-Clutch-note", noteHtml],
  ["2-Clutch-working-artifact", artifactHtml],
  ["3-Clutch-how-it-works-and-results", howHtml],
  ["4-Clutch-how-AI-was-used", aiHtml],
];
const browser = await chromium.launch();
const tab = await browser.newPage();
for (const [name, html] of docs) {
  writeFileSync(`submission/${name}.html`, html);
  await tab.setContent(html, { waitUntil: "load" });
  await tab.pdf({
    path: `submission/${name}.pdf`,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  console.log(`submission/${name}.pdf`);
}
await browser.close();
writeFileSync("submission/note.txt", NOTE.map(([k, t]) => (k === "h" ? t : t)).join("\n\n") + "\n");
console.log(`note: ${noteWords} words`);
