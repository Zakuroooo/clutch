// Seeks through the embedded match video and reads the scoreboard strip every STEP seconds.
// Viewing only: each crop is deleted right after it is read.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { appendFileSync, rmSync } from "node:fs";
const [id, from, to, step, out, tag] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const open = async (t) => {
  await p.goto(`http://localhost:8765/player.html?v=${id}&t=${t}`, { waitUntil: "load" });
  await p.waitForFunction(() => window.ready === true, null, { timeout: 30000 }).catch(() => {});
};
const landed = async (t, ms) => {
  for (let k = 0; k < ms / 300; k++) {
    await p.waitForTimeout(300);
    const st = await p.evaluate(() => (window.player && window.player.getCurrentTime ? [window.player.getPlayerState(), window.player.getCurrentTime()] : [-9, -1])).catch(() => [-9, -1]);
    if (st[0] === 1 && Math.abs(st[1] - t) < 4) return true;
  }
  return false;
};
await open(+from);
for (let t = +from; t <= +to; t += +step) {
  await p.evaluate((s) => window.player && window.player.seekTo(s, true), t).catch(() => {});
  let ok = await landed(t, 4000);
  if (!ok) { await open(t); ok = await landed(t, 9000); }
  await p.waitForTimeout(500);
  const now = await p.evaluate(() => window.player.getCurrentTime()).catch(() => -1);
  const file = `crops/${tag}-${t}.png`;
  await p.screenshot({ path: file, clip: { x: 0, y: 610, width: 1280, height: 110 } });
  let text = "";
  try { text = execFileSync("./ocr", [file], { encoding: "utf8" }); } catch { text = "ERR"; }
  rmSync(file, { force: true });
  appendFileSync(out, JSON.stringify({ t, now: +(+now).toFixed(1), ok, text }) + "\n");
}
await b.close();
console.log("done", tag);
