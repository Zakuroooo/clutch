// Saves real screenshots of the running app at 390 x 844 to design/review/.
// Usage: node scripts/screenshot.mjs <name> <path> [--full] [--wait=ms] [--click=text]
import { chromium } from "@playwright/test";

const [name, route, ...flags] = process.argv.slice(2);
const flag = (k) => flags.find((f) => f.startsWith(`--${k}`))?.split("=")[1];
const base = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(base + route, { waitUntil: "load" });
await page.waitForTimeout(Number(flag("wait") ?? 1500));
for (const f of flags.filter((f) => f.startsWith("--click="))) {
  await page.getByText(f.slice(8), { exact: false }).first().click();
  await page.waitForTimeout(900);
}
await page.screenshot({ path: `design/review/${name}.png`, fullPage: flags.includes("--full") });
console.log(`design/review/${name}.png`, errors.length ? `console errors: ${errors.join(" | ")}` : "no console errors");
await browser.close();
