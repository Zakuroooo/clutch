import { expect, test } from "@playwright/test";

test("the start screen says it is a replay", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Replay of a real match/).first()).toBeVisible();
});
