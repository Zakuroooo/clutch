// Plays the match video inside the app and checks the score follows it.
// Usage: node scripts/video-check.mjs [width] [height] [name]
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const [w = "1280", h = "800", name = "video-1280"] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3000";
const id = JSON.parse(readFileSync("data/replay.json", "utf8")).match_id;
const ticks = JSON.parse(readFileSync(`data/matches/${id}/timeline.json`, "utf8")).events;
const at = ticks[200]; // a ball in the chase
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
const errors = [];
p.on("pageerror", (e) => errors.push(String(e)));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await p.goto(`${base}/match?t0=${at.t_ms - 15000}`, { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.getByTestId("video-start").click();
await p.waitForTimeout(12000);
const shown = await p.getByTestId("team-b").locator(".runs").innerText().catch(() => "?");
const over = await p.locator(".score .num").first().innerText().catch(() => "?");
const vt = await p.evaluate(() => document.querySelector("iframe") ? "iframe present" : "no iframe");
console.log({ expect_near: `${at.state.score}/${at.state.wickets} at ball ${at.event.over}.${at.event.ball}`, shown, over, vt, errors: errors.slice(0, 3) });
await p.screenshot({ path: `design/review/${name}.png`, fullPage: process.env.FULL === "1" });
await b.close();
