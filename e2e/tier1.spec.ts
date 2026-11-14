import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// The tests read the same data files the app ships, so they follow the replay match.
const matchId = JSON.parse(readFileSync("data/replay.json", "utf8")).match_id as string;
const dir = `data/matches/${matchId}`;
const timeline = JSON.parse(readFileSync(`${dir}/timeline.json`, "utf8"));
const moments = JSON.parse(readFileSync(`${dir}/moments.json`, "utf8")) as {
  id: string;
  i: number;
  replay_kind: string;
}[];
const alerts = JSON.parse(readFileSync(`${dir}/alerts.json`, "utf8")) as {
  i: number;
  bar: string;
}[];
const ticks = timeline.events as {
  t_ms: number;
  state: { score: number; wickets: number; balls_bowled: number };
  event: { over: number; ball: number; innings: number };
}[];
const winner = timeline.match.result.winner as string;

const overText = (i: number) =>
  `Over ${Math.floor(ticks[i].state.balls_bowled / 6)}.${ticks[i].state.balls_bowled % 6}`;
const ring = (page: Page) => page.getByTestId("pulse-card").getByTestId("ring");
const moment = moments.find((m) => m.replay_kind !== "none" && m.i > 20)!;

test.describe("clock and scoreboard", () => {
  test("shows the score from the data for the ball on the clock", async ({ page }) => {
    const i = 60;
    await page.goto(`/match?t0=${ticks[i].t_ms + 1000}`);
    await expect(page.getByTestId("team-a").locator(".runs")).toHaveText(
      `${ticks[i].state.score}/${ticks[i].state.wickets}`,
    );
    await expect(page.getByText(overText(i))).toBeVisible();
  });

  test("a reload keeps the same ball", async ({ page }) => {
    const i = 100;
    await page.goto(`/match?t0=${ticks[i].t_ms + 1000}`);
    const over = overText(i);
    await expect(page.getByText(over)).toBeVisible();
    await page.goto("/match");
    await expect(page.getByText(over)).toBeVisible();
  });

  test("the replay note is on the match, focus, moments and card screens", async ({ page }) => {
    await page.goto(`/match?t0=${ticks[moment.i].t_ms + 1000}`);
    await expect(page.getByText("Replay of a real match").first()).toBeVisible();
    await page.getByTestId("moment-card").first().click();
    await expect(page.getByTestId("explanation-card")).toBeVisible();
    await expect(page.getByText("Replay of a real match").first()).toBeAttached();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("explanation-card")).toBeHidden();
    for (const path of ["/match/focus", "/match/moments"]) {
      await page.goto(path);
      await expect(page.getByText("Replay of a real match").first()).toBeVisible();
    }
  });

  test("past the end it shows the finished state and the real result", async ({ page }) => {
    await page.goto(`/match?t0=${ticks[ticks.length - 1].t_ms + 40_000}`);
    await expect(page.getByTestId("pulse-live")).toHaveText(`${winner} won`);
    await expect(page.getByTestId("chase")).toContainText("won");
    await expect(ring(page)).toHaveClass(/still/);
    await expect(page.getByRole("heading", { name: "Match summary" })).toBeVisible();
  });
});

test.describe("the Pulse", () => {
  test("with reduced motion nothing animates and the word still shows", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const hot = alerts.find((a) => a.bar === "decider")!;
    await page.goto(`/match?t0=${ticks[hot.i - 1].t_ms + 1000}`);
    await expect(ring(page)).toHaveAttribute("data-state", /high|decider/);
    const animation = await ring(page)
      .locator(".wave")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe("none");
    await expect(page.getByTestId("pulse-live")).not.toBeEmpty();
  });
});

test.describe("your world and cards", () => {
  test("the world survives a reload, and Say it plainly swaps the text", async ({ page }) => {
    await page.goto("/world");
    await page.getByRole("button", { name: /Football/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/match");
    await page.goto(`/match?t0=${ticks[moment.i].t_ms + 1000}`);
    await page.getByTestId("moment-card").first().click();
    await expect(page.getByText("In football terms")).toBeVisible();
    const football = await page.getByTestId("card-why").innerText();
    await page.getByRole("button", { name: "Say it plainly" }).click();
    await expect(page.getByText("In plain words")).toBeVisible();
    await expect(page.getByTestId("card-why")).not.toHaveText(football);
    await page.getByRole("button", { name: "In football terms" }).click();
    await expect(page.getByTestId("card-why")).toHaveText(football);
    await page.goto("/world");
    await expect(page.getByRole("button", { name: "Keep football" })).toBeVisible();
  });

  test("the card route returns a checked card and rejects a bad body", async ({ request }) => {
    const ok = await request.post("/api/card", {
      data: { match_id: matchId, moment_id: moment.id, world: "chess" },
    });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toMatchObject({ moment_id: moment.id, checked: true });
    const bad = await request.post("/api/card", {
      data: { match_id: matchId, moment_id: moment.id, world: "astrology" },
    });
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error.code).toBe("bad_request");
  });
});

test.describe("focus mode and the shelf", () => {
  test("the bar choice survives a reload", async ({ page }) => {
    await page.goto("/match/focus");
    await page.getByRole("button", { name: "Everything" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Everything" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  // Headless Chromium refuses notification permission even when the test grants it, so
  // this covers the path where notifications are off: the title and the banner still
  // change and the screen says so (PRD AC4.4). The granted path is checked by hand.
  test("a call-back changes the tab title and shows the banner, with notifications off", async ({
    page,
  }) => {
    const alert = alerts.find((a) => a.bar === "decider")!;
    await page.goto(`/match/focus?t0=${ticks[alert.i].t_ms - 14_000}`);
    await page.getByRole("button", { name: "The decider" }).click();
    await page.getByRole("button", { name: "Turn Focus on" }).click();
    await expect(page).toHaveTitle("Look up · Clutch", { timeout: 12_000 });
    await expect(page.getByRole("status")).toContainText("Look up");
    await expect(page.getByTestId("notify-card")).toContainText(/Notifications are off|Get a buzz/);
    await expect(page.getByText("call-backs so far").locator("..").locator("b")).toHaveText("1");
  });

  test("a moment that happens in Focus is missed; Catch me up plays it and marks it seen", async ({
    page,
  }) => {
    await page.goto(`/match/focus?t0=${ticks[moment.i].t_ms - 4_000}`);
    await page.getByRole("button", { name: "Turn Focus on" }).click();
    await expect(page.getByText("moments waiting").locator("..").locator("b")).toHaveText("1", {
      timeout: 12_000,
    });
    await page.goto("/match/moments");
    await expect(page.getByTestId("shelf-title")).toHaveText("You missed one big moment");
    await page.reload();
    await expect(page.getByTestId("shelf-title")).toHaveText("You missed one big moment");
    await expect(page.getByTestId("moment-card").first()).toContainText("Missed");
    await page.getByRole("button", { name: /Catch me up/ }).click();
    await expect(page.getByTestId("catch-up")).toBeVisible();
    await expect(page.getByText("A drawing of what was recorded")).toBeVisible();
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByTestId("catch-up")).toBeHidden();
    await expect(page.getByTestId("shelf-title")).toHaveText("You've seen it all.");
  });

  test("before the first ball the shelf explains what will appear", async ({ page }) => {
    await page.goto("/match/moments?t0=-5000");
    await expect(page.getByTestId("shelf-title")).toHaveText("Nothing big yet.");
    await expect(page.getByText("it's kept here so you can't miss it")).toBeVisible();
  });
});

test.describe("the two-minute demo", () => {
  test("reaches a card and the shelf with no key, no room and no permission prompt", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Show me in 2 minutes" }).click();
    await expect(page.getByTestId("coach")).toBeVisible();
    await expect(page.getByTestId("coach")).toContainText("This ring is all you need to watch");
    await page.getByRole("button", { name: "Skip to the ball" }).click();
    await expect(page.getByTestId("explanation-card")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("coach")).toContainText("Same facts, your language");
    await page.getByTestId("coach").getByRole("button", { name: "Next" }).click();
    await page.waitForURL("**/match/moments");
    await expect(page.getByTestId("shelf-title")).toContainText("You missed");
    await page.getByTestId("coach").getByRole("button", { name: "Next" }).click();
    await page.waitForURL("**/match");
    await page.getByTestId("coach").getByRole("button", { name: "Done" }).click();
    await expect(page.getByTestId("coach")).toBeHidden();
    await expect(page.getByTestId("skip")).toBeVisible();
    expect(await page.evaluate(() => Notification.permission)).not.toBe("granted");
  });
});
