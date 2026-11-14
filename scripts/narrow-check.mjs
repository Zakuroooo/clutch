// Checks the main screens at 360 px wide: nothing may scroll sideways.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const id = JSON.parse(readFileSync("data/replay.json", "utf8")).match_id;
const ticks = JSON.parse(readFileSync(`data/matches/${id}/timeline.json`, "utf8")).events;
const late = ticks[ticks.length - 20].t_ms + 1000;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
let bad = 0;
for (const [name, path] of [["start", "/"], ["world", "/world"], ["match", `/match?t0=${late}`], ["focus", "/match/focus"], ["moments", "/match/moments"]]) {
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const fold = name === "match" ? await page.evaluate(() => Math.round(document.querySelector('[data-testid="pulse-card"]').getBoundingClientRect().bottom)) : null;
  console.log(name, "sideways overflow:", overflow, fold !== null ? `| Pulse card ends at ${fold} of 740` : "");
  if (overflow > 0) bad++;
  if (name === "match") await page.screenshot({ path: "design/review/10-match-360.png" });
}
await browser.close();
process.exit(bad ? 1 : 0);
