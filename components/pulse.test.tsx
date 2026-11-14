// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { pulseView } from "@/lib/engine/pulse";
import { promiseLine } from "./FocusScreen";
import { PulseCard } from "./PulseCard";
import { arcLength, Ring } from "./Ring";

afterEach(cleanup);
const thresholds = { pulse: { building: 50, high: 70, decider: 90 } };
const view = (pct: number) => pulseView({ thresholds, nextPct: pct, phase: "play" });

describe("Ring", () => {
  test("the arc length matches stakes.pct", () => {
    const full = 2 * Math.PI * 78;
    expect(arcLength(0)).toBe(0);
    expect(arcLength(50)).toBeCloseTo(full / 2);
    expect(arcLength(100)).toBeCloseTo(full);
    expect(arcLength(140)).toBeCloseTo(full); // clamped
    render(<Ring state="high" pct={75} word="Look up" label="Look up" />);
    const dash = screen.getByTestId("ring-arc").getAttribute("stroke-dasharray")!;
    expect(Number(dash.split(" ")[0])).toBeCloseTo(full * 0.75, 0);
  });

  test("has a full-sentence label for screen readers", () => {
    render(<Ring state="calm" pct={10} word="Calm" label="Calm. Keep working." />);
    expect(screen.getByRole("img", { name: "Calm. Keep working." })).toBeTruthy();
  });
});

describe("PulseCard", () => {
  test.each([
    [10, "Calm", "false"],
    [55, "Building", "false"],
    [75, "Look up", "true"],
    [95, "This is it", "true"],
  ])("pct %s says %s, glowing %s", (pct, word, hot) => {
    render(<PulseCard pulse={view(pct)} />);
    expect(screen.getByTestId("pulse-card").getAttribute("data-hot")).toBe(hot);
    expect(screen.getByTestId("pulse-live").textContent).toBe(word);
    expect(screen.getByText(`Stakes ${pct} of 100`)).toBeTruthy();
  });

  test("the live region changes only when the word changes", () => {
    const { rerender } = render(<PulseCard pulse={view(72)} />);
    const live = screen.getByTestId("pulse-live");
    expect(live.getAttribute("aria-live")).toBe("polite");
    const seen = [live.textContent];
    for (const pct of [74, 80, 89, 91, 99, 60]) {
      rerender(<PulseCard pulse={view(pct)} />);
      if (live.textContent !== seen[seen.length - 1]) seen.push(live.textContent);
    }
    expect(seen).toEqual(["Look up", "This is it", "Building"]);
  });

  test("a finished match is still and shows the result, with no stakes number", () => {
    const done = pulseView({
      thresholds,
      nextPct: null,
      phase: "finished",
      resultWord: "RCB won",
      resultReason: "by 2 wickets",
    });
    render(<PulseCard pulse={done} />);
    expect(screen.getByTestId("pulse-live").textContent).toBe("RCB won");
    expect(screen.queryByText(/Stakes/)).toBeNull();
    expect(screen.getByTestId("ring").className).toContain("still");
  });
});

describe("the Focus promise line", () => {
  test("shows no number when nothing was measured", () => {
    expect(promiseLine(null)).toBeNull();
    expect(promiseLine(undefined)).toBeNull();
    expect(promiseLine({ callbacks_median: Number.NaN, coverage: 0.5 })).toBeNull();
  });
  test("uses only the measured numbers", () => {
    expect(promiseLine({ callbacks_median: 8, coverage: 0.517 })).toBe(
      "About 8 call-backs in a match. In our test matches that covered 52 of every 100 biggest swings.",
    );
  });
});

describe("the pulse colour means stakes and nothing else", () => {
  // Components allowed to use var(--pulse...): the ring, the replay drawing of a catch
  // (DESIGN-SYSTEM MiniReplay), and nothing else. CSS classes are checked by name below.
  const ALLOWED_FILES = new Set(["Ring.tsx", "MiniReplay.tsx"]);
  const ALLOWED_CSS =
    /pulse-card|pulse-ring|brand-dot|badge\.replay|badge\.hot|badge\.missed|\.tab \.dot|\.banner|\.tile b\.stake|\.quote/;

  test("no component outside the allowed ones names the pulse tokens", () => {
    const dir = path.resolve(__dirname);
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx") && !ALLOWED_FILES.has(f))
      .filter((f) => /--pulse/.test(readFileSync(path.join(dir, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  test("in the stylesheet, pulse tokens appear only in stakes rules", () => {
    const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");
    const offenders: string[] = [];
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const [, selector, body] = rule;
      if (
        /var\(--pulse/.test(body) &&
        !ALLOWED_CSS.test(selector) &&
        !selector.includes("@theme")
      ) {
        offenders.push(selector.trim());
      }
    }
    expect(offenders).toEqual([]);
  });
});
