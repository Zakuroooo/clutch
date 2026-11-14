// Runs every test suite and writes the counts to evals/results/tests.json, so the
// numbers in the README and TESTING.md come from a file, not from memory.
// Usage: node scripts/test-report.mjs   (builds the app for the end-to-end run)
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const run = (cmd, env = {}) => {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env }, maxBuffer: 1 << 28 });
  } catch (e) {
    return (e.stdout ?? "") + (e.stderr ?? "");
  }
};
mkdirSync("evals/results", { recursive: true });

run("npx vitest run --reporter=json --outputFile=.vitest.json");
const v = JSON.parse(readFileSync(".vitest.json", "utf8"));
rmSync(".vitest.json");

const py = run("model/.venv/bin/python -m pytest model/tests -q");
const pyLine = py.trim().split("\n").pop() ?? "";
const num = (re) => Number(pyLine.match(re)?.[1] ?? 0);

const pw = JSON.parse(run("npx playwright test --reporter=json", { PLAYWRIGHT_JSON_OUTPUT_NAME: "" }) || "{}");
const stats = pw.stats ?? {};

const report = {
  run_on: new Date().toISOString().slice(0, 10),
  where: "locally, not CI",
  unit_and_integration: { tool: "vitest", total: v.numTotalTests, passed: v.numPassedTests, failed: v.numFailedTests },
  python: { tool: "pytest", passed: num(/(\d+) passed/), failed: num(/(\d+) failed/), skipped: num(/(\d+) skipped/) },
  end_to_end: {
    tool: "playwright, chromium, 390 x 844, production build",
    passed: stats.expected ?? null,
    failed: stats.unexpected ?? null,
    flaky: stats.flaky ?? null,
    skipped: stats.skipped ?? null,
  },
};
writeFileSync("evals/results/tests.json", JSON.stringify(report, null, 2) + "\n");
console.log(report);
