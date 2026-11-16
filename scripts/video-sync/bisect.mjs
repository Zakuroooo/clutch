// Second pass: for each ball, narrow the moment the scoreboard first shows it to ~2 s by
// bisecting between two coarse readings. Viewing only; crops are deleted after reading.
// Usage: node bisect.mjs <timeline.json> <coarse.jsonl...> --part k/n --out fine-k.jsonl
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, rmSync } from "node:fs";
const args = process.argv.slice(2);
const out = args[args.indexOf("--out") + 1];
const [part, parts] = args[args.indexOf("--part") + 1].split("/").map(Number);
const timeline = JSON.parse(readFileSync(args[0], "utf8"));
const files = args.slice(1, args.indexOf("--part"));
const CODES = { DNM: 1, GRM: 2 };
const SCORE = /^(\d{1,3})\s*\/\s*(\d{1,2})$/;
const OVERS = /^OVERS\s*(\d{1,2})\s*[.,]\s*(\d)$/i;
const index = new Map();
const put = (k, v) => (index.has(k) ? index.get(k).push(v) : index.set(k, [v]));
for (const e of timeline.events) put([e.event.innings, e.state.wickets, e.state.balls_bowled].join(","), [e.state.score, e.i]);
if (!index.has("1,0,0")) put("1,0,0", [0, -1]);
const first2 = timeline.events.find((e) => e.event.innings === 2).i;
if (!index.has("2,0,0")) put("2,0,0", [0, first2 - 1]);
const parse = (text) => {
  const lines = text.split("\n").map((l) => l.split("\t").pop().trim());
  const team = lines.map((l) => CODES[l]).find(Boolean);
  const sc = lines.map((l) => l.match(SCORE)).find(Boolean);
  const ov = lines.map((l) => l.match(OVERS)).find(Boolean);
  if (!team || !sc || !ov || +ov[2] > 5) return null;
  let best = null;
  for (const [score, i] of index.get([team, +sc[2], +ov[1] * 6 + +ov[2]].join(",")) ?? []) {
    const d = Math.abs(score - +sc[1]);
    if (d <= 4 && (!best || d < best[0] || (d === best[0] && i > best[1]))) best = [d, i];
  }
  return best ? best[1] : null;
};
const coarse = files.flatMap((f) => readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l)))
  .map((r) => ({ t: r.now, k: parse(r.text) })).filter((r) => r.k !== null && r.t > 0).sort((a, b) => a.t - b.t);
// Monotone: keep readings whose index does not go backwards.
const mono = [];
for (const r of coarse) if (!mono.length || r.k >= mono[mono.length - 1].k) mono.push(r);
// Brackets: consecutive readings where the index changed.
const brackets = [];
for (let j = 1; j < mono.length; j++) if (mono[j].k > mono[j - 1].k && mono[j].t - mono[j - 1].t > 3) brackets.push([mono[j - 1], mono[j]]);
// Target mode (--targets file): bisect for the first time each listed ball is shown.
const tIdx = args.indexOf("--targets");
let targets = null;
if (tIdx >= 0) {
  const want = JSON.parse(readFileSync(args[tIdx + 1], "utf8"));
  targets = [];
  for (const k of want) {
    const lo = [...mono].reverse().find((r) => r.k < k);
    const hi = mono.find((r) => r.k >= k);
    if (lo && hi && hi.t - lo.t > 3) targets.push([k, lo, hi]);
  }
}
const mine = targets
  ? targets.filter((_, j) => j % parts === part).map(([k, lo, hi]) => [{ ...lo, k: k - 1 }, hi])
  : brackets.filter((_, j) => j % parts === part);
console.log(`part ${part}/${parts}: ${mine.length} of ${brackets.length} brackets`);

const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const open = async (t) => {
  await p.goto(`http://localhost:8765/player.html?v=lp2aesSYQxc&t=${Math.floor(t)}`, { waitUntil: "load" });
  await p.waitForFunction(() => window.ready === true, null, { timeout: 30000 }).catch(() => {});
};
const landed = async (t, ms) => {
  for (let k = 0; k < ms / 300; k++) {
    await p.waitForTimeout(300);
    const st = await p.evaluate(() => (window.player?.getCurrentTime ? [window.player.getPlayerState(), window.player.getCurrentTime()] : [-9, -1])).catch(() => [-9, -1]);
    if (st[0] === 1 && Math.abs(st[1] - t) < 2.5) return true;
  }
  return false;
};
let n = 0;
const read = async (t) => {
  await p.evaluate(() => window.player?.pauseVideo()).catch(() => {});
  await p.evaluate((s) => { window.player?.seekTo(s, true); window.player?.playVideo(); }, t).catch(() => {});
  if (!(await landed(t, 4000))) { await open(t); await landed(t, 9000); }
  await p.waitForTimeout(400);
  const now = await p.evaluate(() => window.player.getCurrentTime()).catch(() => t);
  const file = `crops/bis-${part}-${n++}.png`;
  await p.screenshot({ path: file, clip: { x: 0, y: 610, width: 1280, height: 110 } });
  let text = "";
  try { text = execFileSync("./ocr", [file], { encoding: "utf8" }); } catch { text = ""; }
  rmSync(file, { force: true });
  appendFileSync(out, JSON.stringify({ t, now: +(+now).toFixed(1), ok: true, text }) + "\n");
  return { now, k: parse(text) };
};
await open(mine[0]?.[0].t ?? 0);
for (const [lo0, hi0] of mine) {
  // Find, for each ball between lo.k+1 and hi.k, the first time it is shown.
  let lo = { ...lo0 }, hi = { ...hi0 };
  for (let guard = 0; guard < 6 && hi.t - lo.t > 2; guard++) {
    const mid = (lo.t + hi.t) / 2;
    let r = await read(mid);
    if (r.k === null) r = await read(mid + 1.3);
    if (r.k === null) r = await read(mid - 1.7);
    if (r.k === null) break;
    if (r.k > lo0.k) hi = { t: mid, k: r.k }; else lo = { t: mid, k: r.k };
  }
}
await b.close();
console.log("done", part);
